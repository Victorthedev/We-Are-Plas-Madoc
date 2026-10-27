-- Lets staff pick which gallery photos appear in the home page's About section.
-- Null = not featured; a timestamp = featured since then (also used to order them).
ALTER TABLE public.gallery_items
  ADD COLUMN home_featured_at TIMESTAMPTZ;
