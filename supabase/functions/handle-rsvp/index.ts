import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/std@0.208.0/dotenv/load.ts";
import { sendEmail } from "../_shared/mailer.ts";
import { SITE_URL } from "../_shared/email/layout.ts";
import { rsvpCancelled, rsvpConfirmed, rsvpStaff, STAFF_CC, STAFF_INBOX } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCalendarLinks(event: any) {
  const start = new Date(event.start_datetime);
  const end = event.end_datetime ? new Date(event.end_datetime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const title = encodeURIComponent(event.title);
  const location = encodeURIComponent(event.location || "");
  const details = encodeURIComponent(event.description || "");

  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&location=${location}&details=${details}`;
  const apple = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${fmt(start)}%0ADTEND:${fmt(end)}%0ASUMMARY:${title}%0ALOCATION:${location}%0ADESCRIPTION:${details}%0AEND:VEVENT%0AEND:VCALENDAR`;

  return { google, apple };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!Deno.env.get("GMAIL_SMTP_USER") || !Deno.env.get("GMAIL_SMTP_PASSWORD")) {
    return new Response(JSON.stringify({ error: "GMAIL_SMTP_USER/GMAIL_SMTP_PASSWORD not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, ...body } = await req.json();

    if (action === "submit") {
      const { event_id, first_name, last_name, email, phone, party_size } = body;

      const { data: existing } = await supabase
        .from("event_rsvps")
        .select("id")
        .eq("event_id", event_id)
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ duplicate: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: event } = await supabase.from("events").select("*").eq("id", event_id).single();
      if (!event) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: rsvp, error } = await supabase
        .from("event_rsvps")
        .insert({ event_id, first_name, last_name: last_name || "", email, phone: phone || null, party_size: party_size || 1 })
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const cancelUrl = `${SITE_URL}/events/cancel-rsvp?token=${rsvp.cancellation_token}`;
      const calLinks = generateCalendarLinks(event);

      const confirmation = rsvpConfirmed({
        first_name: rsvp.first_name,
        party_size: rsvp.party_size,
        eventTitle: event.title,
        eventStart: event.start_datetime,
        location: event.location,
        googleCalendarUrl: calLinks.google,
        appleCalendarUrl: calLinks.apple,
        cancelUrl,
      });
      await sendEmail(email, confirmation.subject, confirmation.html, { replyTo: STAFF_INBOX });

      const { count } = await supabase.from("event_rsvps").select("*", { count: "exact", head: true }).eq("event_id", event_id);

      const staff = rsvpStaff({
        first_name: rsvp.first_name,
        last_name: rsvp.last_name,
        email: rsvp.email,
        phone: rsvp.phone,
        party_size: rsvp.party_size,
        eventTitle: event.title,
        eventStart: event.start_datetime,
        totalRsvps: count || 1,
      });
      await sendEmail(STAFF_INBOX, staff.subject, staff.html, { cc: STAFF_CC, replyTo: email });

      return new Response(JSON.stringify({ success: true, rsvp_id: rsvp.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "cancel") {
      const { token } = body;

      const { data: rsvp } = await supabase
        .from("event_rsvps")
        .select("*, events(title)")
        .eq("cancellation_token", token)
        .maybeSingle();

      if (!rsvp) return new Response(JSON.stringify({ error: "RSVP not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const eventTitle = (rsvp as any).events?.title || "the event";

      await supabase.from("event_rsvps").delete().eq("id", rsvp.id);
      const ack = rsvpCancelled({ first_name: rsvp.first_name, eventTitle });
      await sendEmail(rsvp.email, ack.subject, ack.html, { replyTo: STAFF_INBOX });

      return new Response(JSON.stringify({ success: true, event_title: eventTitle, first_name: rsvp.first_name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get-by-token") {
      const { token } = body;
      const { data: rsvp } = await supabase
        .from("event_rsvps")
        .select("first_name, email, event_id, events(title, start_datetime)")
        .eq("cancellation_token", token)
        .maybeSingle();

      return new Response(JSON.stringify({ rsvp }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "check-duplicate") {
      const { event_id, email } = body;
      const { data: existing } = await supabase
        .from("event_rsvps")
        .select("id")
        .eq("event_id", event_id)
        .eq("email", email)
        .maybeSingle();

      return new Response(JSON.stringify({ exists: !!existing }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
