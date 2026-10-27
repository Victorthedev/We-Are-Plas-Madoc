import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";
import { contactMessageStaff, STAFF_CC, STAFF_INBOX } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { name, email, phone, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return json({ error: "Name, email, subject and message are required" }, 400);
    }

    const { data: saved, error: dbError } = await supabase.from("messages").insert({
      name,
      email,
      phone: phone || null,
      subject,
      message,
      read: false,
    }).select("created_at").single();

    if (dbError) return json({ error: dbError.message }, 400);

    const { subject: emailSubject, html } = contactMessageStaff({
      name, email, phone, subject, message, receivedAt: saved?.created_at || new Date().toISOString(),
    });
    await sendEmail(STAFF_INBOX, emailSubject, html, { cc: STAFF_CC, replyTo: email });

    return json({ success: true });
  } catch (err) {
    console.error("handle-contact error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
