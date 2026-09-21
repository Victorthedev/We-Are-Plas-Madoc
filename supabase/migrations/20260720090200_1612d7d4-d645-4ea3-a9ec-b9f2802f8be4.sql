-- Visitor Management System (VMS) — Phase 1: Children, Parents, Attendance.
--
-- One record per child: Youth Club visibility (age 10+) and the 18+ archive
-- are computed from date_of_birth at query time, not stored/cron-maintained,
-- so a failed scheduled job can never leave a stale safeguarding-relevant list.
--
-- All tables here require the playground_worker or super_admin role for every
-- operation — no public/anon access, unlike every other table in this app.

CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  ethnicity TEXT,
  medical_conditions TEXT,
  allergies TEXT,
  additional_learning_needs TEXT,
  playground TEXT NOT NULL CHECK (playground IN ('caia_park', 'plas_madoc')),
  photo_url TEXT,
  internal_notes TEXT,
  registration_source TEXT NOT NULL DEFAULT 'staff' CHECK (registration_source IN ('staff', 'self')),
  archived_at TIMESTAMPTZ,
  archived_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX children_date_of_birth_idx ON public.children (date_of_birth);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select children" ON public.children FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert children" ON public.children FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update children" ON public.children FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT NOT NULL,
  language TEXT,
  cultural_background TEXT,
  religion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select parents" ON public.parents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert parents" ON public.parents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update parents" ON public.parents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.child_parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  relationship TEXT,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, parent_id)
);

ALTER TABLE public.child_parent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select child_parent_links" ON public.child_parent_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert child_parent_links" ON public.child_parent_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update child_parent_links" ON public.child_parent_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin delete child_parent_links" ON public.child_parent_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

-- Unified attendance across children, parents and (from Phase 3) volunteers.
-- volunteer_id is wired now, unused until Phase 3, so this table's shape
-- doesn't need to change when volunteer shift-logging lands.
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
  playground TEXT CHECK (playground IN ('caia_park', 'plas_madoc')),
  attended_on DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIME,
  check_out_time TIME,
  activity_notes TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_exactly_one_person CHECK (num_nonnulls(child_id, parent_id, volunteer_id) = 1)
);

CREATE INDEX attendance_child_idx ON public.attendance (child_id, attended_on DESC) WHERE child_id IS NOT NULL;
CREATE INDEX attendance_parent_idx ON public.attendance (parent_id, attended_on DESC) WHERE parent_id IS NOT NULL;
CREATE INDEX attendance_volunteer_idx ON public.attendance (volunteer_id, attended_on DESC) WHERE volunteer_id IS NOT NULL;
-- One tick per person per day for children/parents; volunteers may log multiple shifts in a day (Phase 3).
CREATE UNIQUE INDEX attendance_child_once_per_day ON public.attendance (child_id, attended_on) WHERE child_id IS NOT NULL;
CREATE UNIQUE INDEX attendance_parent_once_per_day ON public.attendance (parent_id, attended_on) WHERE parent_id IS NOT NULL;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select attendance" ON public.attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert attendance" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update attendance" ON public.attendance FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin delete attendance" ON public.attendance FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

-- Separate from the existing, openly-readable activity_log: this table carries
-- children's/parents' identifying details and must fail closed, not rely on
-- every future insert remembering to flag itself as restricted.
CREATE TABLE public.vms_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action_type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vms_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin insert vms_activity_log" ON public.vms_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin select vms_activity_log" ON public.vms_activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
