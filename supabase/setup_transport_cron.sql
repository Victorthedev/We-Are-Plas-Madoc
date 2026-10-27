-- Release unpaid transport holds every 10 minutes, in case Stripe's
-- checkout.session.expired webhook is ever missed.
-- Run this in the Supabase SQL Editor.

SELECT cron.schedule(
  'transport-expire-holds',
  '*/10 * * * *',
  $$ SELECT public.transport_expire_stale_holds(); $$
);

-- To verify the schedule was created:
-- SELECT * FROM cron.job;

-- To remove it if needed:
-- SELECT cron.unschedule('transport-expire-holds');
