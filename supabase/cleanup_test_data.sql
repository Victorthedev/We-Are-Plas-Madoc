-- Removes everything inserted by supabase/seed_test_data.sql, and nothing else.
-- Every seeded row has a first_name/name/person_name starting with "TEST_",
-- which is the only thing this script matches on.
--
-- child_parent_links, attendance, and notifications tied to these people are
-- removed automatically via ON DELETE CASCADE when the child/parent/volunteer
-- rows are deleted below — incidents and adult_visitors have no cascade, so
-- they're deleted explicitly first.
--
-- Run this in the Supabase SQL Editor once you're done testing.

DELETE FROM public.incidents WHERE person_name LIKE 'TEST_%';
DELETE FROM public.adult_visitors WHERE name LIKE 'TEST_%';
DELETE FROM public.children WHERE first_name LIKE 'TEST_%';
DELETE FROM public.parents WHERE first_name LIKE 'TEST_%';
DELETE FROM public.volunteers WHERE first_name LIKE 'TEST_%';
