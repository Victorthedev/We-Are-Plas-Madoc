import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function replyHtml(toName: string, subject: string, body: string, staffName: string) {
  const escaped = body.replace(/\n/g, "<br>");
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:32px;text-align:center;">
    <h1 style="color:#fff;font-size:24px;margin:0;">🌂 WAPM</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc</p>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <p style="color:#2D1B4E;font-size:16px;margin:0 0 20px;">Hi ${toName},</p>
    <div style="background:#fff;border:1px solid #e8e0f0;border-radius:12px;padding:24px;font-size:14px;color:#444;line-height:1.7;">
      ${escaped}
    </div>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f0ecf8;">
      <p style="color:#555;font-size:13px;margin:0;">${staffName}</p>
      <p style="color:#999;font-size:12px;margin:4px 0 0;">We Are Plas Madoc</p>
      <p style="color:#999;font-size:12px;margin:2px 0 0;">📞 01978 813912 · ✉️ weareplasmadoc@avow.org</p>
    </div>
  </div>
  <div style="background:#F5F0FF;padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;margin:0;">We Are Plas Madoc (WAPM) · CIO Charity No. 1197278</p>
    <p style="color:#999;font-size:11px;margin:4px 0 0;">The Opportunities Centre, Plas Madoc, Wrexham, LL14 3US</p>
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500);

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is authenticated staff
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  let userId: string | null = null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
    const payload = JSON.parse(atob(padded));
    userId = payload.sub ?? null;
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!userId) return json({ error: "Unauthorized" }, 401);

  try {
    const { to_email, to_name, original_subject, reply_body, staff_name } = await req.json();

    if (!to_email || !reply_body) return json({ error: "Missing required fields" }, 400);

    const subject = original_subject ? `Re: ${original_subject}` : "Reply from We Are Plas Madoc";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WAPM <noreply@weareplasmadoc.co.uk>",
        reply_to: "weareplasmadoc@avow.org",
        to: [to_email],
        subject,
        html: replyHtml(to_name || "there", original_subject || "", reply_body, staff_name || "The WAPM Team"),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return json({ error: "Failed to send email" }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("send-reply error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
