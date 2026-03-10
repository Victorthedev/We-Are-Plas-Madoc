import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function reminderHtml(rsvp: any, event: any, cancelUrl: string) {
  const mapsUrl = event.location ? `https://www.google.com/maps/search/${encodeURIComponent(event.location)}` : "";
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:32px;text-align:center;">
    <h1 style="color:#fff;font-size:24px;margin:0;">🌂 WAPM</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc</p>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <p style="color:#2D1B4E;font-size:16px;">Hi ${rsvp.first_name}, just a reminder...</p>
    <div style="background:#F5F0FF;border-radius:12px;padding:24px;margin:24px 0;">
      <h2 style="color:#7B2D8E;font-size:20px;margin:0 0 12px;">${event.title}</h2>
      <p style="color:#555;font-size:14px;margin:4px 0;">📅 ${formatDate(event.start_datetime)}</p>
      <p style="color:#555;font-size:14px;margin:4px 0;">🕐 ${formatTime(event.start_datetime)}</p>
      ${event.location ? `<p style="color:#555;font-size:14px;margin:4px 0;">📍 <a href="${mapsUrl}" style="color:#7B2D8E;">${event.location}</a></p>` : ""}
    </div>
    <p style="color:#555;font-size:14px;text-align:center;">Still coming? Great — see you there! 🎉</p>
    <p style="color:#999;font-size:13px;text-align:center;margin-top:32px;">Can't make it anymore? <a href="${cancelUrl}" style="color:#7B2D8E;">Cancel your RSVP</a></p>
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
        const cancelUrl = `https://weareplasmadoc.co.uk/events/cancel-rsvp?token=${rsvp.cancellation_token}`;
        
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "WAPM <noreply@weareplasmadoc.co.uk>",
            to: [rsvp.email],
            subject: `Reminder: ${event.title} is tomorrow! 🗓️`,
            html: reminderHtml(rsvp, event, cancelUrl),
          }),
        });

        if (res.ok) {
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
