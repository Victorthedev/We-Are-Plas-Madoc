import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAYGROUND_LABELS: Record<string, string> = { caia_park: "Caia Park", plas_madoc: "Plas Madoc" };

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

function taskEmailHtml(assigneeName: string, task: any) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:32px;text-align:center;">
    <h1 style="color:#fff;font-size:24px;margin:0;">WAPM</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc</p>
  </div>
  <div style="padding:32px;background:#ffffff;">
    <p style="color:#2D1B4E;font-size:16px;">Hi ${assigneeName},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">You've been assigned a task on the Daily Log.</p>
    <div style="background:#F5F0FF;border-radius:12px;padding:24px;margin:24px 0;">
      <h2 style="color:#7B2D8E;font-size:18px;margin:0 0 8px;">${task.title}</h2>
      ${task.description ? `<p style="color:#555;font-size:14px;margin:8px 0;">${task.description}</p>` : ""}
      ${task.playground ? `<p style="color:#999;font-size:13px;margin:8px 0 0;">${PLAYGROUND_LABELS[task.playground] || task.playground}</p>` : ""}
    </div>
    <p style="color:#555;font-size:14px;">Sign in and open Daily Log &gt; Tasks to update it once it's done.</p>
  </div>
  <div style="background:#F5F0FF;padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;margin:0;">We Are Plas Madoc (WAPM) &middot; CIO Charity No. 1197278</p>
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500);

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { task_id } = await req.json();
    if (!task_id) return json({ error: "task_id is required" }, 400);

    const { data: task } = await supabase.from("vms_tasks").select("*").eq("id", task_id).maybeSingle();
    if (!task || !task.assigned_to) return json({ skipped: true });

    const { data: assignee } = await supabase.from("profiles").select("full_name, email").eq("id", task.assigned_to).maybeSingle();
    if (!assignee?.email) return json({ skipped: true });

    const sent = await sendEmail(RESEND_API_KEY, assignee.email, `New task: ${task.title}`, taskEmailHtml(assignee.full_name, task));
    return json({ success: sent });
  } catch (err) {
    console.error("notify-task-assigned error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
