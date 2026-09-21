-- Typed initials alone can clash between staff (two people with the same
-- initials). Add an unambiguous "who actually checked this" reference
-- alongside it; the initials field stays as a friendly, editable default
-- that mirrors what's printed on the paper form, not the source of truth.
ALTER TABLE public.daily_log_checks ADD COLUMN checked_by UUID REFERENCES auth.users(id);
