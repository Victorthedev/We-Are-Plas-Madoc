-- Digitizes the AVOW "Play Session Daily Log" paper form: opening/closing
-- site checklists, a session reflection (weather/quote captured at fill-in
-- time so history stays accurate; incidents/visitors are pulled live from
-- their own modules instead of being duplicated here), and a lightweight
-- task/assignment system so a flagged issue (e.g. "electrical fault") can be
-- tagged to a specific staff member and tracked to resolution.

CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('opening','closing')),
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL,
  playground TEXT NOT NULL CHECK (playground IN ('caia_park','plas_madoc')),
  staff_team TEXT,
  session_time_from TIME,
  session_time_to TIME,
  term_type TEXT CHECK (term_type IN ('term_time','school_holidays')),
  opening_notes TEXT,
  closing_notes TEXT,
  reflection_notes TEXT,
  weather_snapshot TEXT,
  quote_snapshot TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (log_date, playground)
);

CREATE TABLE public.daily_log_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id),
  checked BOOLEAN NOT NULL DEFAULT false,
  initials TEXT,
  comment TEXT
);
CREATE INDEX daily_log_checks_log_idx ON public.daily_log_checks (daily_log_id);

CREATE TABLE public.vms_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  playground TEXT CHECK (playground IN ('caia_park','plas_madoc')),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  daily_log_check_id UUID REFERENCES public.daily_log_checks(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vms_tasks_assigned_idx ON public.vms_tasks (assigned_to, status);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vms_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select checklist_items" ON public.checklist_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert checklist_items" ON public.checklist_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update checklist_items" ON public.checklist_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "PW/admin select daily_logs" ON public.daily_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert daily_logs" ON public.daily_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update daily_logs" ON public.daily_logs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "PW/admin select daily_log_checks" ON public.daily_log_checks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert daily_log_checks" ON public.daily_log_checks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update daily_log_checks" ON public.daily_log_checks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "PW/admin select vms_tasks" ON public.vms_tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert vms_tasks" ON public.vms_tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update vms_tasks" ON public.vms_tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

-- Seed with the items transcribed from the current paper form.
INSERT INTO public.checklist_items (section, label, sort_order) VALUES
  ('opening', 'Gates, perimeter fence and surrounding area, is litter pick needed? Any damage to fence? Any signs of intrusion?', 1),
  ('opening', 'Dens, check dens are secure and free from hazards (i.e. protruding nails)', 2),
  ('opening', 'Sand pit, ensure clear of hazards. Rake the surface.', 3),
  ('opening', 'Swings, ensure sand is clear of hazards. Check seats and chains are in good order.', 4),
  ('opening', 'Tools, are all tools accounted for and in good condition?', 5),
  ('opening', 'Loose Parts/Resources, are they in good condition? Sufficient amount?', 6),
  ('opening', 'Bins, are they empty? Do they need bin bags?', 7),
  ('opening', 'Office and Toilets, are they clean? Are they stocked with toilet paper, hand wash, paper towels etc? Is the office tidy & desk clear?', 8),
  ('opening', 'Pulley, put seat up and check condition', 9),
  ('opening', 'Walkway structures and fire pit area, structures in sound condition? Fire pit and hut area clear of loose wood? Fire pit ash need removing?', 10),
  ('closing', 'Playground free from hazards', 1),
  ('closing', 'Pulley seat removed and stored away', 2),
  ('closing', 'All tools and resources accounted for', 3),
  ('closing', 'Toilet and sink sanitised. Floor brushed', 4),
  ('closing', 'All cups, cutlery and crockery washed', 5),
  ('closing', 'Office surfaces cleaned, floor, sink, worktops', 6),
  ('closing', 'Bins emptied and sprayed', 7),
  ('closing', 'Hot water boiler turned off', 8),
  ('closing', 'Office heater turned off', 9),
  ('closing', 'Office shutters closed and secured', 10),
  ('closing', 'All containers secured and gangways accessible', 11);
