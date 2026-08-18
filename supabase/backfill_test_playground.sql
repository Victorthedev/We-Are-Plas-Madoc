-- One-time backfill: you already ran seed_test_data.sql before the Phase 5a
-- playground migration existed, so those parent/incident/visitor rows have
-- playground = NULL. This sets them to match the values now in
-- seed_test_data.sql, by id/name, so re-running the seed script isn't
-- needed. Safe to run once; a second run is a no-op (same values either way).

UPDATE public.parents SET playground = 'caia_park'  WHERE id = 'c058e717-9e86-431d-a9c1-2081eb9d0e9a'; -- TEST_ParentOne Jones
UPDATE public.parents SET playground = 'caia_park'  WHERE id = 'f8a262d9-262f-4f20-ad7c-5a1715ca6dd5'; -- TEST_ParentTwo Jones
UPDATE public.parents SET playground = 'plas_madoc' WHERE id = '8bda97de-44a2-46fa-93b2-3fb15b1b157d'; -- TEST_ParentThree Smith
UPDATE public.parents SET playground = 'caia_park'  WHERE id = '327b67ed-223e-4480-bcaa-e0ef0df4d68c'; -- TEST_ParentFour Adams
UPDATE public.parents SET playground = 'plas_madoc' WHERE id = 'fffde783-3a9a-4d37-aa15-1fca766e795c'; -- TEST_ParentFive Carter

UPDATE public.incidents SET playground = 'plas_madoc' WHERE person_name = 'TEST_Junior Smith';
UPDATE public.incidents SET playground = 'caia_park'  WHERE person_name = 'TEST_Adult Owen';
UPDATE public.incidents SET playground = 'plas_madoc' WHERE person_name = 'TEST_Visitor Delivery Driver';

UPDATE public.adult_visitors SET playground = 'caia_park'  WHERE name = 'TEST_Boiler Engineer Co';
UPDATE public.adult_visitors SET playground = 'plas_madoc' WHERE name = 'TEST_Fence Contractor Ltd';
