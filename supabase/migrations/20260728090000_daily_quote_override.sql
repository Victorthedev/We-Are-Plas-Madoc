-- Lets staff set a custom "quote of the day" on the VMS Overview page.
-- Falls back to the built-in QUOTES rotation in the app when no row exists
-- for today, so this table only ever needs today's override, not a backlog.
CREATE TABLE public.vms_daily_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_date DATE NOT NULL UNIQUE,
  quote_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vms_daily_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select vms_daily_quotes" ON public.vms_daily_quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert vms_daily_quotes" ON public.vms_daily_quotes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update vms_daily_quotes" ON public.vms_daily_quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
