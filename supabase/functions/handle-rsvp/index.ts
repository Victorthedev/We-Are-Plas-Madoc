import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/std@0.208.0/dotenv/load.ts";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "WAPM <noreply@weareplasmadoc.co.uk>", to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
  return res.ok;
}

function confirmationEmailHtml(rsvp: any, event: any, calLinks: any, cancelUrl: string) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:32px;text-align:center;">
    <h1 style="color:#fff;font-size:24px;margin:0;">🌂 WAPM</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc</p>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <p style="color:#2D1B4E;font-size:16px;">Hi ${rsvp.first_name},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">You're all set! Here are the event details:</p>
    <div style="background:#F5F0FF;border-radius:12px;padding:24px;margin:24px 0;">
      <h2 style="color:#7B2D8E;font-size:20px;margin:0 0 12px;">${event.title}</h2>
      <p style="color:#555;font-size:14px;margin:4px 0;">📅 ${formatDate(event.start_datetime)}</p>
      <p style="color:#555;font-size:14px;margin:4px 0;">🕐 ${formatTime(event.start_datetime)}</p>
      ${event.location ? `<p style="color:#555;font-size:14px;margin:4px 0;">📍 ${event.location}</p>` : ""}
      <p style="color:#555;font-size:14px;margin:12px 0 0;">You and your crew😎: <strong>${rsvp.party_size}</strong></p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${calLinks.google}" target="_blank" style="display:inline-block;background:#7B2D8E;color:#fff;padding:10px 24px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;margin:4px;">Add to Google Calendar</a>
      <a href="${calLinks.apple}" target="_blank" style="display:inline-block;background:#2D1B4E;color:#fff;padding:10px 24px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;margin:4px;">Add to Apple Calendar</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center;margin-top:32px;">Can't make it anymore? <a href="${cancelUrl}" style="color:#7B2D8E;">Cancel your RSVP</a></p>
  </div>
  <div style="background:#F5F0FF;padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;margin:0;">We Are Plas Madoc (WAPM) · CIO Charity No. 1197278</p>
    <p style="color:#999;font-size:11px;margin:4px 0 0;">The Opportunities Centre, Plas Madoc, Wrexham, LL14 3US</p>
  </div>
</div>
</body></html>`;
}

function staffNotificationHtml(rsvp: any, event: any, totalRsvps: number) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;margin:0;">New RSVP Received</h1>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <div style="background:#F5F0FF;border-radius:12px;padding:20px;margin-bottom:20px;">
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Name:</strong> ${rsvp.first_name} ${rsvp.last_name}</p>
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Email:</strong> ${rsvp.email}</p>
      ${rsvp.phone ? `<p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Phone:</strong> ${rsvp.phone}</p>` : ""}
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Party Size:</strong> ${rsvp.party_size}</p>
    </div>
    <p style="color:#555;font-size:14px;"><strong>Event:</strong> ${event.title}</p>
    <p style="color:#555;font-size:14px;"><strong>Date:</strong> ${formatDate(event.start_datetime)}</p>
    <p style="color:#7B2D8E;font-size:16px;font-weight:600;margin-top:16px;">Total RSVPs so far: ${totalRsvps}</p>
  </div>
</div>
</body></html>`;
}

function cancellationAckHtml(firstName: string, eventTitle: string) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;margin:0;">🌂 WAPM</h1>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <p style="color:#2D1B4E;font-size:16px;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">Your RSVP for <strong>${eventTitle}</strong> has been cancelled.</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">We hope to see you at a future event!</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://weareplasmadoc.co.uk/events" style="display:inline-block;background:#7B2D8E;color:#fff;padding:10px 24px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;">Browse Events</a>
    </div>
  </div>
  <div style="background:#F5F0FF;padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;margin:0;">We Are Plas Madoc (WAPM) · CIO Charity No. 1197278</p>
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, ...body } = await req.json();

    if (action === "submit") {
      const { event_id, first_name, last_name, email, phone, party_size } = body;

      // Check for duplicate
      const { data: existing } = await supabase
        .from("event_rsvps")
        .select("id")
        .eq("event_id", event_id)
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ duplicate: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get event details
      const { data: event } = await supabase.from("events").select("*").eq("id", event_id).single();
      if (!event) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Insert RSVP
      const { data: rsvp, error } = await supabase
        .from("event_rsvps")
        .insert({ event_id, first_name, last_name: last_name || "", email, phone: phone || null, party_size: party_size || 1 })
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const cancelUrl = `https://weareplasmadoc.co.uk/events/cancel-rsvp?token=${rsvp.cancellation_token}`;
      const calLinks = generateCalendarLinks(event);

      // Send confirmation to attendee
      await sendEmail(RESEND_API_KEY, email, `We're glad you're coming for ${event.title}! 🎉`, confirmationEmailHtml(rsvp, event, calLinks, cancelUrl));

      // Get total RSVP count
      const { count } = await supabase.from("event_rsvps").select("*", { count: "exact", head: true }).eq("event_id", event_id);

      // Send notification to staff
      await sendEmail(RESEND_API_KEY, "weareplasmadoc@avow.org", `New RSVP — ${event.title} — ${first_name} ${last_name || ""}`, staffNotificationHtml(rsvp, event, count || 1));

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
      await sendEmail(RESEND_API_KEY, rsvp.email, `RSVP Cancelled — ${eventTitle}`, cancellationAckHtml(rsvp.first_name, eventTitle));

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
