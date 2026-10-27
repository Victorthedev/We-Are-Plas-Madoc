import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";
import { SITE_URL } from "../_shared/email/layout.ts";
import { eventReminder, STAFF_INBOX } from "../_shared/email/templates.ts";

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
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find published events happening in the next 25 hours
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("start_datetime", now.toISOString())
      .lte("start_datetime", tomorrow.toISOString());

    let sentCount = 0;

    for (const event of events || []) {
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", event.id)
        .eq("reminder_sent", false);

      for (const rsvp of rsvps || []) {
        const email = eventReminder({
          first_name: rsvp.first_name,
          eventTitle: event.title,
          eventStart: event.start_datetime,
          location: event.location,
          cancelUrl: `${SITE_URL}/events/cancel-rsvp?token=${rsvp.cancellation_token}`,
        });
        const ok = await sendEmail(rsvp.email, email.subject, email.html, { replyTo: STAFF_INBOX });

        if (ok) {
          await supabase.from("event_rsvps").update({ reminder_sent: true }).eq("id", rsvp.id);
          sentCount++;
        }
      }
    }

    // Log to activity_log
    if (sentCount > 0) {
      await supabase.from("activity_log").insert({
        action_type: "reminder_sent",
        content_type: "event_rsvp",
        content_title: `Sent ${sentCount} event reminder(s)`,
      });
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
