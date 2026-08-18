-- Phase 5e: external visitor grouping. A tradesperson/contractor visiting
-- repeatedly should be one persistent record staff can search and select
-- (like the volunteer<->child cross-link), not a freeform name retyped
-- every visit — otherwise "how many times has the electrician come" can't
-- be answered reliably.

CREATE TABLE public.external_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organisation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PW/admin select external_visitors" ON public.external_visitors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin insert external_visitors" ON public.external_visitors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "PW/admin update external_visitors" ON public.external_visitors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'playground_worker') OR public.has_role(auth.uid(), 'super_admin'));

-- Nullable: existing/manually-typed visits stay valid without a linked record.
ALTER TABLE public.adult_visitors
  ADD COLUMN visitor_id UUID REFERENCES public.external_visitors(id) ON DELETE SET NULL;
CREATE INDEX adult_visitors_visitor_id_idx ON public.adult_visitors (visitor_id) WHERE visitor_id IS NOT NULL;
