// Membership self-service without sign-in, plus one admin action.
//   request-link  (email)          - email manage links for memberships on that address
//   get           (token)          - membership details for the manage page
//   portal        (token, origin)  - Stripe Customer Portal session (change card / cancel)
//   admin-welcome (member_id)      - super_admin: (re)send the welcome email
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  adminClient, clientIp, corsHeaders, discountFor, fetchSettings, isMemberActive, json, rateLimited,
  sendMemberNumberEmail, sendMemberWelcomeEmail, type Member,
} from "../_shared/transport.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function isSuperAdmin(supabase: SupabaseClient, req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return false;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  return !!roles?.some((r) => r.role === "super_admin");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = adminClient();

  try {
    const { action, ...body } = await req.json();

    if (action === "request-link") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email address" }, 400);
      if (await rateLimited(supabase, "member-link", clientIp(req), 5, 60)) {
        return json({ error: "Too many requests. Please try again later." }, 429);
      }
      const { data } = await supabase.from("members").select("*").eq("email", email).neq("status", "pending");
      for (const m of (data || []) as Member[]) await sendMemberNumberEmail(m);
      // Same answer either way, so this can't be used to find out who's a member.
      return json({ sent: true });
    }

    if (action === "admin-welcome") {
      if (!(await isSuperAdmin(supabase, req))) return json({ error: "Forbidden" }, 403);
      if (!UUID_RE.test(body.member_id || "")) return json({ error: "Invalid member" }, 400);
      const { data } = await supabase.from("members").select("*").eq("id", body.member_id).maybeSingle();
      if (!data) return json({ error: "Member not found" }, 404);
      await sendMemberWelcomeEmail(data as Member, await fetchSettings(supabase));
      return json({ sent: true });
    }

    if (!UUID_RE.test(body.token || "")) return json({ error: "This link isn't valid." }, 400);
    const { data } = await supabase.from("members").select("*").eq("manage_token", body.token).maybeSingle();
    if (!data) return json({ error: "We couldn't find that membership." }, 404);
    const member = data as Member;

    if (action === "get") {
      const settings = await fetchSettings(supabase);
      return json({
        member: {
          member_number: member.member_number,
          full_name: member.full_name,
          email: member.email,
          phone: member.phone,
          address: member.address,
          postcode: member.postcode,
          plan: member.plan,
          status: member.status,
          active: isMemberActive(member),
          current_period_end: member.current_period_end,
          cancel_at_period_end: member.cancel_at_period_end,
          source: member.source,
          discount_pct: discountFor(member.plan, settings),
          can_manage_billing: !!member.stripe_customer_id,
        },
      });
    }

    if (action === "portal") {
      if (!member.stripe_customer_id) return json({ error: "This membership isn't paid online. Please contact us to make changes." }, 400);
      const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
      if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
      const stripe = new Stripe(STRIPE_SECRET_KEY);
      const origin = String(body.origin || "").slice(0, 200);
      const portal = await stripe.billingPortal.sessions.create({
        customer: member.stripe_customer_id,
        return_url: `${origin}/membership/manage?token=${member.manage_token}`,
      });
      return json({ url: portal.url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("membership error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
