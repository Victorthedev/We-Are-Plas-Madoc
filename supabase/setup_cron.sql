-- Schedule the event reminder function to run daily at 8am UTC.
-- Run this in the Supabase SQL Editor.
--
-- Before running, replace:
--   YOUR_PROJECT_REF  → found in Supabase dashboard URL (e.g. abcdefghijklmnop)
--   YOUR_ANON_KEY     → found in Supabase dashboard → Settings → API → anon public key

SELECT cron.schedule(
  'daily-event-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aurcamruwoameygvyecv.supabase.co/functions/v1/send-event-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1cmNhbXJ1d29hbWV5Z3Z5ZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTA1NDIsImV4cCI6MjA4ODIyNjU0Mn0.u8DUdVaUS7s6k_WqU5pCkLYKqlvbl5-a6vaLZecpOUY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify the schedule was created:
-- SELECT * FROM cron.job;

-- To remove it if needed:
-- SELECT cron.unschedule('daily-event-reminders');
