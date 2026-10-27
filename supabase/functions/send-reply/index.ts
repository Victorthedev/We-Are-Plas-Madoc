import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";
import { STAFF_INBOX, staffReply } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Same roles that can open Admin > Messages.
const ALLOWED_ROLES = ["super_admin", "editor"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!Deno.env.get("GMAIL_SMTP_USER") || !Deno.env.get("GMAIL_SMTP_PASSWORD")) {
    return json({ error: "GMAIL_SMTP_USER/GMAIL_SMTP_PASSWORD not configured" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // This function sends email from the charity's domain to any address, so the
  // caller's session must be genuinely verified, not just decoded.
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const { data: { user } } = await adminClient.auth.getUser(token);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).in("role", ALLOWED_ROLES);
  if (!roles?.length) return json({ error: "Forbidden" }, 403);

  try {
    const { to_email, to_name, original_subject, reply_body, staff_name } = await req.json();

    if (!to_email || !reply_body) return json({ error: "Missing required fields" }, 400);

    const { subject, html } = staffReply({
      toName: to_name || "there",
      originalSubject: original_subject,
      body: reply_body,
      staffName: staff_name || "The WAPM Team",
    });
    const ok = await sendEmail(to_email, subject, html, { replyTo: STAFF_INBOX });

    if (!ok) return json({ error: "Failed to send email" }, 500);

    return json({ success: true });
  } catch (err) {
    console.error("send-reply error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
