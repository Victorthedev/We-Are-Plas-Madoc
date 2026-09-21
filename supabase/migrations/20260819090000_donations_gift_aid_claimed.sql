-- Tracks whether a Gift Aid donation's tax reclaim has already been filed with
-- HMRC, so it can be excluded from "still to reclaim" totals while remaining
-- part of the all-time raised total. Null = not yet claimed.
ALTER TABLE public.donations
  ADD COLUMN gift_aid_claimed_at TIMESTAMPTZ;
