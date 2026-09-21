-- A site can end up needing more than one log in a day (e.g. a separate
-- morning and evening session), so a second staff member opening Today's
-- Log shouldn't be forced into editing whatever the first person already
-- filled in. The app now shows the most recent log for today by default,
-- with an option to view any other same-day logs or start a new one.
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_log_date_playground_key;
