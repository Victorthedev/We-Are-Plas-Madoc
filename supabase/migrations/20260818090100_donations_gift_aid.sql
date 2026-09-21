-- Gift Aid lets a UK charity reclaim an extra 25p per £1 from HMRC on a
-- UK taxpayer's donation, at no cost to the donor, but only if a valid
-- declaration is captured at the time of donation: an explicit opt-in plus
-- full name and home address (HMRC requires the address to identify the
-- taxpayer, not just an email). All optional at the app level, since
-- donors can still give anonymously without ever seeing these fields.
ALTER TABLE public.donations
  ADD COLUMN gift_aid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN donor_first_name TEXT,
  ADD COLUMN donor_last_name TEXT,
  ADD COLUMN donor_phone TEXT,
  ADD COLUMN donor_address TEXT;
