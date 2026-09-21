-- Tracks when a reminder email was last sent for a task, so the reminder
-- cron (every 3 days for anything still unresolved) doesn't re-send daily
-- once a task crosses the threshold.
ALTER TABLE public.vms_tasks ADD COLUMN last_reminded_at TIMESTAMPTZ;
