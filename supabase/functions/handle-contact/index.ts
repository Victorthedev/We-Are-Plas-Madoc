import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function staffNotificationHtml(name: string, email: string, phone: string, subject: string, message: string) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;margin:0;">New Contact Message</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc</p>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <div style="background:#F5F0FF;border-radius:12px;padding:20px;margin-bottom:20px;">
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Name:</strong> ${name}</p>
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#7B2D8E;">${email}</a></p>
      ${phone ? `<p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Phone:</strong> ${phone}</p>` : ""}
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Subject:</strong> ${subject}</p>
    </div>
    <div style="background:#fff;border:1px solid #e8e0f0;border-radius:12px;padding:20px;">
      <p style="color:#555;font-size:14px;line-height:1.7;white-space:pre-wrap;margin:0;">${message}</p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="mailto:${email}?subject=Re: ${subject}" style="display:inline-block;background:#7B2D8E;color:#fff;padding:10px 24px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;">Reply to ${name}</a>
    </div>
  </div>
  <div style="background:#F5F0FF;padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;margin:0;">We Are Plas Madoc (WAPM) · CIO Charity No. 1197278</p>
    <p style="color:#999;font-size:11px;margin:4px 0 0;">View all messages in the <a href="https://weareplasmadoc.co.uk/admin/messages" style="color:#7B2D8E;">admin dashboard</a></p>
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
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { name, email, phone, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return json({ error: "Name, email, subject and message are required" }, 400);
    }

    // Save to messages table
    const { error: dbError } = await supabase.from("messages").insert({
      name,
      email,
      phone: phone || null,
      subject,
      message,
      read: false,
    });

    if (dbError) return json({ error: dbError.message }, 400);

    // Notify staff by email
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WAPM Website <noreply@weareplasmadoc.co.uk>",
        to: ["weareplasmadoc@avow.org"],
        subject: `New message: ${subject}`,
        html: staffNotificationHtml(name, email, phone || "", subject, message),
      }),
    });

    return json({ success: true });
  } catch (err) {
    console.error("handle-contact error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
