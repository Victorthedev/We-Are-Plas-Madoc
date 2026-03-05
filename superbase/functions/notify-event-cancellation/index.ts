import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cancellationHtml(firstName: string, eventTitle: string) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:32px;text-align:center;">
    <h1 style="color:#fff;font-size:24px;margin:0;">🌂 WAPM</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc</p>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <p style="color:#2D1B4E;font-size:16px;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">Unfortunately <strong>${eventTitle}</strong> has been cancelled.</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">We're sorry for any inconvenience.</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">Keep an eye on our website for future events:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://weareplasmadoc.co.uk/events" style="display:inline-block;background:#7B2D8E;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;">Browse Upcoming Events</a>
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { event_id } = await req.json();

    const { data: event } = await supabase.from("events").select("*").eq("id", event_id).single();
    if (!event) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: rsvps } = await supabase.from("event_rsvps").select("*").eq("event_id", event_id);

    let sentCount = 0;
    for (const rsvp of rsvps || []) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "WAPM <noreply@weareplasmadoc.co.uk>",
          to: [rsvp.email],
          subject: `Important update about ${event.title}`,
          html: cancellationHtml(rsvp.first_name, event.title),
        }),
      });
      if (res.ok) sentCount++;
    }

    return new Response(JSON.stringify({ success: true, notified: sentCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
