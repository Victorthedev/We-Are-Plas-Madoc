-- Phase 2: a 10-17 year old is visible in both the Children (playground) and
-- Youth Club registers at once, and may attend both on the same day — so
-- attendance needs to know which service a check-in was for, and the
-- one-per-day constraint for children needs to allow one per service per day.
ALTER TABLE public.attendance
  ADD COLUMN service TEXT NOT NULL DEFAULT 'playground' CHECK (service IN ('playground', 'youth_club'));

DROP INDEX IF EXISTS public.attendance_child_once_per_day;
CREATE UNIQUE INDEX attendance_child_once_per_day ON public.attendance (child_id, attended_on, service) WHERE child_id IS NOT NULL;
