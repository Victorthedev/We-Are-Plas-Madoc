-- Cross-linking: a volunteer can optionally be the same person as an
-- existing (or aged-out/archived) child record, e.g. an older teen who
-- volunteers, or an adult who first appears in the system as a parent's
-- child years ago. Nullable, no CHECK forcing a particular relationship,
-- since most volunteers won't have one.

ALTER TABLE public.volunteers
  ADD COLUMN child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX volunteers_child_id_idx ON public.volunteers (child_id) WHERE child_id IS NOT NULL;
