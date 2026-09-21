-- Schedule the VMS daily notifications function (birthdays, youth-club
-- transitions, absence at 3 months / 1 year) to run daily at 6am UTC,
-- ahead of playground workers' morning check-in.
-- Run this in the Supabase SQL Editor.
--
-- Uses the same project ref + anon key as setup_cron.sql.

SELECT cron.schedule(
  'vms-daily-notifications',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aurcamruwoameygvyecv.supabase.co/functions/v1/vms-daily-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify the schedule was created:
-- SELECT * FROM cron.job;

-- To remove it if needed:
-- SELECT cron.unschedule('vms-daily-notifications');
