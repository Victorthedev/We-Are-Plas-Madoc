-- Phase 3: Volunteers (extends the existing general-applicant volunteers table
-- rather than a new entity, per the actual overlap between the two), plus
-- incident logging and the adult visitor log.

-- Once an applicant is accepted, staff still need to record whether they're a
-- child or adult volunteer and their DBS status before they're fully "VMS ready".
-- All nullable: existing rows and new applicants are unaffected until completed.
ALTER TABLE public.volunteers
  ADD COLUMN volunteer_type TEXT CHECK (volunteer_type IN ('child', 'adult')),
  ADD COLUMN dbs_number TEXT,
  ADD COLUMN dbs_checked_status TEXT NOT NULL DEFAULT 'pending' CHECK (dbs_checked_status IN ('pending', 'checked', 'not_required'));

-- Incidents are intentionally more flexible than attendance: the person
-- involved might not have a persistent record at all (a one-off adult
-- visitor), so this stores an optional link per type plus a plain name
-- rather than forcing a strict single-FK relationship.
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('accident', 'medical_emergency')),
  person_type TEXT NOT NULL CHECK (person_type IN ('child', 'parent', 'volunteer', 'visitor', 'other')),
  person_name TEXT NOT NULL,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  action_taken TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  occurred_at TIME,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX incidents_occurred_on_idx ON public.incidents (occurred_on DESC);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select incidents" ON public.incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert incidents" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update incidents" ON public.incidents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

-- Adult visitors (e.g. a tradesperson): no persistent identity, just a log entry.
CREATE TABLE public.adult_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_from TIME,
  time_to TIME,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX adult_visitors_visit_date_idx ON public.adult_visitors (visit_date DESC);

ALTER TABLE public.adult_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select adult_visitors" ON public.adult_visitors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert adult_visitors" ON public.adult_visitors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
