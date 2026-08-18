-- Phase 5a: playground scoping. children and attendance already carry a
-- playground column; parents, incidents, and adult_visitors need one too so
-- the whole module can be filtered by Caia Park / Plas Madoc / combined.
-- Nullable everywhere here so existing/seeded rows aren't retroactively
-- broken; forms are updated separately to start capturing it going forward.
-- volunteers deliberately excluded: playground-agnostic by design.

ALTER TABLE public.parents
  ADD COLUMN playground TEXT CHECK (playground IN ('caia_park', 'plas_madoc'));

ALTER TABLE public.incidents
  ADD COLUMN playground TEXT CHECK (playground IN ('caia_park', 'plas_madoc'));

ALTER TABLE public.adult_visitors
  ADD COLUMN playground TEXT CHECK (playground IN ('caia_park', 'plas_madoc'));
