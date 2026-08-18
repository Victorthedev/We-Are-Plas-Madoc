-- Schedule the task reminder function to run daily at 7am UTC. It only
-- actually emails a task's assignee once every 3 days per task (tracked via
-- vms_tasks.last_reminded_at), so running it daily is just how often it
-- checks, not how often anyone gets emailed.
-- Run this in the Supabase SQL Editor.
--
-- Uses the same project ref + anon key as setup_cron.sql / setup_vms_cron.sql.

SELECT cron.schedule(
  'task-reminders',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aurcamruwoameygvyecv.supabase.co/functions/v1/task-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify the schedule was created:
-- SELECT * FROM cron.job;

-- To remove it if needed:
-- SELECT cron.unschedule('task-reminders');
