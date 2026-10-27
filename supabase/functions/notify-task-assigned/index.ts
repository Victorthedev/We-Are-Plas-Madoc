import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";
import { taskAssigned } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!Deno.env.get("GMAIL_SMTP_USER") || !Deno.env.get("GMAIL_SMTP_PASSWORD")) {
    return json({ error: "GMAIL_SMTP_USER/GMAIL_SMTP_PASSWORD not configured" }, 500);
  }

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

    const email = taskAssigned({ assigneeName: assignee.full_name, title: task.title, description: task.description, playground: task.playground });
    const sent = await sendEmail(assignee.email, email.subject, email.html);
    return json({ success: sent });
  } catch (err) {
    console.error("notify-task-assigned error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
