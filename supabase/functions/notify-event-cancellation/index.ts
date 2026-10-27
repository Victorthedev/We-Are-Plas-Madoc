import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";
import { eventCancelled, STAFF_INBOX } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!Deno.env.get("GMAIL_SMTP_USER") || !Deno.env.get("GMAIL_SMTP_PASSWORD")) {
    return new Response(JSON.stringify({ error: "GMAIL_SMTP_USER/GMAIL_SMTP_PASSWORD not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { event_id } = await req.json();

    const { data: event } = await supabase.from("events").select("*").eq("id", event_id).single();
    if (!event) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: rsvps } = await supabase.from("event_rsvps").select("*").eq("event_id", event_id);

    let sentCount = 0;
    for (const rsvp of rsvps || []) {
      const email = eventCancelled({ first_name: rsvp.first_name, eventTitle: event.title });
      const ok = await sendEmail(rsvp.email, email.subject, email.html, { replyTo: STAFF_INBOX });
      if (ok) sentCount++;
    }

    return new Response(JSON.stringify({ success: true, notified: sentCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
