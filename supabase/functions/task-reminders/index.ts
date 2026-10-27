import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";
import { taskReminder } from "../_shared/email/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REMINDER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

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
    const cutoff = new Date(Date.now() - REMINDER_INTERVAL_MS).toISOString();

    const { data: tasks } = await supabase
      .from("vms_tasks")
      .select("*")
      .neq("status", "resolved")
      .not("assigned_to", "is", null)
      .lte("created_at", cutoff);

    let sent = 0;
    for (const task of tasks || []) {
      // Due every 3 days: skip if it's already been reminded within the window.
      if (task.last_reminded_at && new Date(task.last_reminded_at).getTime() > Date.now() - REMINDER_INTERVAL_MS) continue;

      const { data: assignee } = await supabase.from("profiles").select("full_name, email").eq("id", task.assigned_to).maybeSingle();
      if (!assignee?.email) continue;

      const email = taskReminder({ assigneeName: assignee.full_name, title: task.title, description: task.description, playground: task.playground });
      const ok = await sendEmail(assignee.email, email.subject, email.html);
      if (ok) {
        await supabase.from("vms_tasks").update({ last_reminded_at: new Date().toISOString() }).eq("id", task.id);
        sent++;
      }
    }

    return json({ success: true, sent });
  } catch (err) {
    console.error("task-reminders error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
