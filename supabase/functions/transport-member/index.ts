// Public membership endpoints used on the booking form (no sign-in):
//   verify - member number + postcode -> plan, discount and masked details
//   remind - email -> emails the membership number(s) to that address
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminClient, clientIp, corsHeaders, discountFor, fetchSettings, json, maskedMember, rateLimited,
  sendMemberNumberEmail, verifyMember, type Member,
} from "../_shared/transport.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = adminClient();
  const ip = clientIp(req);

  try {
    const { action, ...body } = await req.json();

    if (action === "verify") {
      // Tight limit: this is the endpoint someone would brute-force.
      if (await rateLimited(supabase, "member-verify", ip, 10, 15)) {
        return json({ error: "Too many attempts. Please wait 15 minutes and try again." }, 429);
      }
      const check = await verifyMember(supabase, body.member_number, body.postcode);
      if (!check.ok) {
        return json({
          valid: false,
          message: check.reason === "inactive"
            ? "This membership isn't active at the moment. You can still book without it."
            : "We couldn't match that membership number and postcode.",
        });
      }
      const settings = await fetchSettings(supabase);
      return json({ valid: true, discount_pct: discountFor(check.member.plan, settings), member: maskedMember(check.member) });
    }

    if (action === "remind") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email address" }, 400);
      if (await rateLimited(supabase, "member-remind", ip, 5, 60)) {
        return json({ error: "Too many requests. Please try again later." }, 429);
      }
      // Exact match (emails are stored lowercased); ilike would treat _ and % as wildcards.
      const { data } = await supabase.from("members").select("*").eq("email", email).neq("status", "pending");
      for (const m of (data || []) as Member[]) await sendMemberNumberEmail(m);
      // Same answer either way, so this can't be used to find out who's a member.
      return json({ sent: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("transport-member error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
