import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";
import { STAFF_CC, STAFF_INBOX, volunteerApplicationReceived, volunteerApplicationStaff } from "../_shared/email/templates.ts";

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
    const { first_name, last_name, email, phone, position, start_date, message, cv_link } = await req.json();

    if (!first_name || !last_name || !email || !phone || !position) {
      return json({ error: "Required fields missing" }, 400);
    }

    const { error: dbError } = await supabase.from("volunteers").insert({
      first_name,
      last_name,
      email,
      phone,
      position,
      start_date: start_date || null,
      message: message || null,
      cv_link: cv_link || null,
      status: "new",
    });

    if (dbError) return json({ error: dbError.message }, 400);

    const staff = volunteerApplicationStaff({ first_name, last_name, email, phone, position, start_date, message, cv_link });
    await sendEmail(STAFF_INBOX, staff.subject, staff.html, { cc: STAFF_CC, replyTo: email });

    const applicant = volunteerApplicationReceived({ first_name, position });
    await sendEmail(email, applicant.subject, applicant.html, { replyTo: STAFF_INBOX });

    return json({ success: true });
  } catch (err) {
    console.error("handle-volunteer error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
