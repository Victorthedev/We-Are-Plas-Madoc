import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function staffNotificationHtml(data: Record<string, string>) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;margin:0;">New Volunteer Application</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc</p>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <div style="background:#F5F0FF;border-radius:12px;padding:20px;margin-bottom:20px;">
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Name:</strong> ${data.first_name} ${data.last_name}</p>
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color:#7B2D8E;">${data.email}</a></p>
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Phone:</strong> ${data.phone}</p>
      <p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Position:</strong> ${data.position}</p>
      ${data.start_date ? `<p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>Available from:</strong> ${new Date(data.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>` : ""}
      ${data.cv_link ? `<p style="color:#2D1B4E;font-size:14px;margin:4px 0;"><strong>CV:</strong> <a href="${data.cv_link}" style="color:#7B2D8E;">View CV</a></p>` : ""}
    </div>
    ${data.message ? `
    <div style="background:#fff;border:1px solid #e8e0f0;border-radius:12px;padding:20px;margin-bottom:20px;">
      <p style="color:#2D1B4E;font-size:13px;font-weight:600;margin:0 0 8px;">Why they want to volunteer:</p>
      <p style="color:#555;font-size:14px;line-height:1.7;white-space:pre-wrap;margin:0;">${data.message}</p>
    </div>` : ""}
    <div style="text-align:center;margin-top:24px;">
      <a href="https://weareplasmadoc.co.uk/admin/volunteers" style="display:inline-block;background:#7B2D8E;color:#fff;padding:10px 24px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;">View in Dashboard</a>
    </div>
  </div>
  <div style="background:#F5F0FF;padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;margin:0;">We Are Plas Madoc (WAPM) · CIO Charity No. 1197278</p>
  </div>
</div>
</body></html>`;
}

function applicantConfirmationHtml(firstName: string, position: string) {
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
    <p style="color:#555;font-size:14px;line-height:1.7;">Thank you for applying to volunteer with We Are Plas Madoc! We've received your application for <strong>${position}</strong>.</p>
    <p style="color:#555;font-size:14px;line-height:1.7;">A member of our team will be in touch with you soon. In the meantime, if you have any questions don't hesitate to get in touch.</p>
    <div style="background:#F5F0FF;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="color:#2D1B4E;font-size:14px;margin:0 0 8px;font-weight:600;">Contact us</p>
      <p style="color:#555;font-size:14px;margin:4px 0;">📞 01978 813912</p>
      <p style="color:#555;font-size:14px;margin:4px 0;">✉️ weareplasmadoc@avow.org</p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.7;">Volunteers are at the heart of everything we do at WAPM — we're looking forward to welcoming you to the team.</p>
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
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { first_name, last_name, email, phone, position, start_date, message, cv_link } = await req.json();

    if (!first_name || !last_name || !email || !phone || !position) {
      return json({ error: "Required fields missing" }, 400);
    }

    // Save application to database
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

    const sendEmail = (to: string, subject: string, html: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "WAPM <noreply@weareplasmadoc.co.uk>", to: [to], subject, html }),
      });

    // Notify staff
    await sendEmail(
      "weareplasmadoc@avow.org",
      `New volunteer application — ${position} — ${first_name} ${last_name}`,
      staffNotificationHtml({ first_name, last_name, email, phone, position, start_date, message, cv_link })
    );

    // Confirm receipt to the applicant
    await sendEmail(
      email,
      "Thanks for applying to volunteer with WAPM!",
      applicantConfirmationHtml(first_name, position)
    );

    return json({ success: true });
  } catch (err) {
    console.error("handle-volunteer error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
