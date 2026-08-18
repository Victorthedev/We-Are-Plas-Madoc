-- Phase 4: public self-registration (pending review, not live immediately)
-- and the notifications system (birthdays, absence, youth-club transition,
-- new pending registrations).

ALTER TABLE public.children
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.parents
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Existing rows and any staff-entered record default to 'approved' immediately;
-- only rows inserted via the public self-registration edge function set 'pending'.

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('birthday', 'absence_3mo', 'absence_1yr', 'youth_transition', 'new_registration')),
  person_type TEXT CHECK (person_type IN ('child', 'parent', 'volunteer')),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unread_idx ON public.notifications (is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
