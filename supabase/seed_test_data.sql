-- VMS test data seed.
--
-- Every INSERT here is additive only (no UPDATE/DELETE of existing rows,
-- no schema changes) and every seeded name is prefixed TEST_ so it's
-- unmistakable in the UI and trivially removable with
-- supabase/cleanup_test_data.sql once you're done testing.
--
-- Run this in the Supabase SQL Editor. Uses fixed UUIDs so every table
-- below can reference the same seeded people consistently.
--
-- recorded_by / reported_by / logged_by all require a real auth.users id
-- with playground_worker or super_admin — this grabs whichever such user
-- exists first. If that returns NULL (no such user yet), those inserts
-- will fail with a NOT NULL violation and nothing else is affected.

-- ============================================================
-- CHILDREN — one of every case: each age band, allergy/medical
-- flag, manual archive, computed 18+ archive, new-to-youth-club,
-- pending review, rejected, and a long-time-no-attendance case.
-- ============================================================
INSERT INTO public.children (id, first_name, last_name, date_of_birth, playground, ethnicity, medical_conditions, allergies, additional_learning_needs, registration_source, approval_status, archived_at, archived_reason) VALUES
  ('e4064aaa-6038-4a03-b70d-cb3dee5538ea', 'TEST_Toddler', 'Jones',    CURRENT_DATE - INTERVAL '3 years 2 months',  'caia_park',   NULL, NULL, NULL, NULL, 'staff', 'approved', NULL, NULL),
  ('1ba2a0d8-f718-49ac-b562-75090973173c', 'TEST_Junior',  'Smith',    CURRENT_DATE - INTERVAL '6 years 4 months',  'plas_madoc',  'White Welsh', 'Mild asthma', 'Peanuts', NULL, 'staff', 'approved', NULL, NULL),
  ('394d83d7-7ead-4c2f-b12f-aa8304d4067c', 'TEST_Preteen', 'Evans',    CURRENT_DATE - INTERVAL '11 years 1 months', 'caia_park',   NULL, NULL, NULL, 'Extra reading support', 'staff', 'approved', NULL, NULL),
  ('e60ffefd-ad44-4b6a-89c5-c87c47cefd6e', 'TEST_Newteen', 'Baker',    CURRENT_DATE - INTERVAL '10 years 10 days',  'plas_madoc',  NULL, NULL, NULL, NULL, 'staff', 'approved', NULL, NULL),
  ('08fcc3af-57bd-4fac-9592-19c9cff1e150', 'TEST_Older',   'Carter',   CURRENT_DATE - INTERVAL '16 years 3 months', 'caia_park',   NULL, NULL, NULL, NULL, 'staff', 'approved', NULL, NULL),
  ('30e7934e-7555-4d26-9134-3675c48745e9', 'TEST_AgedOut', 'Wilson',   CURRENT_DATE - INTERVAL '18 years 5 days',   'plas_madoc',  NULL, NULL, NULL, NULL, 'staff', 'approved', NULL, NULL),
  ('a3a98734-4c92-4eb4-9400-a7fc8377896c', 'TEST_Archived','Green',    CURRENT_DATE - INTERVAL '7 years 6 months',  'caia_park',   NULL, NULL, NULL, NULL, 'staff', 'approved', now(), 'Family moved away'),
  ('e69d31ef-9b82-4c22-965a-3eb64f24baa6', 'TEST_Pending', 'Adams',    CURRENT_DATE - INTERVAL '5 years 1 months',  'caia_park',   NULL, NULL, NULL, NULL, 'self',  'pending',  NULL, NULL),
  ('b62f8fa2-a371-4e29-9ea1-f4df93733387', 'TEST_Rejected','Baxter',   CURRENT_DATE - INTERVAL '8 years 7 months',  'plas_madoc',  NULL, NULL, NULL, NULL, 'self',  'rejected', NULL, NULL),
  ('6c8f220e-9c1b-4d1e-9413-bee432268d55', 'TEST_LongAbsent','Foster', CURRENT_DATE - INTERVAL '9 years 3 months',  'caia_park',   NULL, NULL, NULL, NULL, 'staff', 'approved', NULL, NULL);

-- ============================================================
-- PARENTS — a primary + secondary contact for one child, a
-- parent with two children, one paired with the pending child
-- (self-registration), and one with no linked child at all.
-- ============================================================
INSERT INTO public.parents (id, first_name, last_name, date_of_birth, phone, playground, language, cultural_background, religion, approval_status) VALUES
  ('c058e717-9e86-431d-a9c1-2081eb9d0e9a', 'TEST_ParentOne',   'Jones',  '1988-04-12', '07700900001', 'caia_park',  'English', NULL, NULL, 'approved'),
  ('f8a262d9-262f-4f20-ad7c-5a1715ca6dd5', 'TEST_ParentTwo',   'Jones',  '1986-11-02', '07700900002', 'caia_park',  'English', NULL, NULL, 'approved'),
  ('8bda97de-44a2-46fa-93b2-3fb15b1b157d', 'TEST_ParentThree', 'Smith',  NULL,         '07700900003', 'plas_madoc', 'Welsh',   NULL, NULL, 'approved'),
  ('327b67ed-223e-4480-bcaa-e0ef0df4d68c', 'TEST_ParentFour',  'Adams',  NULL,         '07700900004', 'caia_park',  NULL,      NULL, NULL, 'pending'),
  ('fffde783-3a9a-4d37-aa15-1fca766e795c', 'TEST_ParentFive',  'Carter', NULL,         '07700900005', 'plas_madoc', NULL,      NULL, NULL, 'approved');

-- Two parents linked to TEST_Toddler Jones (primary + secondary) to test
-- the emergency-contact display picking the primary one.
INSERT INTO public.child_parent_links (child_id, parent_id, relationship, is_primary_contact) VALUES
  ('e4064aaa-6038-4a03-b70d-cb3dee5538ea', 'c058e717-9e86-431d-a9c1-2081eb9d0e9a', 'Mother', true),
  ('e4064aaa-6038-4a03-b70d-cb3dee5538ea', 'f8a262d9-262f-4f20-ad7c-5a1715ca6dd5', 'Father', false),
  -- One parent linked to two different children, to test the parent profile's children list.
  ('1ba2a0d8-f718-49ac-b562-75090973173c', '8bda97de-44a2-46fa-93b2-3fb15b1b157d', 'Mother', true),
  ('394d83d7-7ead-4c2f-b12f-aa8304d4067c', '8bda97de-44a2-46fa-93b2-3fb15b1b157d', 'Mother', true),
  -- Pending parent + pending child pair (simulated self-registration).
  ('e69d31ef-9b82-4c22-965a-3eb64f24baa6', '327b67ed-223e-4480-bcaa-e0ef0df4d68c', 'Guardian', true);
-- TEST_ParentFive Carter is deliberately left with no linked children.

-- ============================================================
-- VOLUNTEERS — every DBS status, both volunteer types, one
-- cross-linked to an active child (teen volunteer), one
-- cross-linked to the aged-out/archived child re-engaging.
-- ============================================================
INSERT INTO public.volunteers (id, first_name, last_name, email, phone, position, volunteer_type, dbs_number, dbs_checked_status, status, child_id) VALUES
  ('8e659a72-29d4-4a0a-bb67-74f026cc1bca', 'TEST_Adult',       'Owen',    'test.owen@example.invalid',    '07700900010', 'Playground Volunteer', 'adult', 'DBS100001', 'checked',      'accepted', NULL),
  ('a728b06f-cb6a-4c59-989b-ac87a2e49284', 'TEST_DbsPending',  'Patel',   'test.patel@example.invalid',   '07700900011', 'Playground Volunteer', 'adult', NULL,        'pending',      'accepted', NULL),
  ('be8848cd-a5cc-41f1-8edf-41371921842d', 'TEST_NotRequired', 'Reeves',  'test.reeves@example.invalid',  '07700900012', 'Admin Support',        'adult', NULL,        'not_required', 'accepted', NULL),
  ('4f492a67-f94f-4395-b3d3-a1275a241c2e', 'TEST_Teen',        'Carter',  'test.carter@example.invalid',  '07700900013', 'Youth Helper',         'child', NULL,        'pending',      'accepted', '08fcc3af-57bd-4fac-9592-19c9cff1e150'),
  ('aa94fd76-89df-46c5-824e-88c9ff699ba8', 'TEST_Reengaged',   'Wilson',  'test.wilson@example.invalid',  '07700900014', 'Playground Volunteer', 'adult', 'DBS100002', 'checked',      'accepted', '30e7934e-7555-4d26-9134-3675c48745e9');

-- ============================================================
-- ATTENDANCE — today, this week, last week (for the history
-- browser), a dual-service same-day check-in, and two "gone
-- quiet" cases for the absence-detection query (one ~4 months
-- since last attendance, one ~13 months).
-- ============================================================
INSERT INTO public.attendance (child_id, parent_id, volunteer_id, playground, attended_on, service, recorded_by) VALUES
  -- Today: youth-eligible child attends both services same day.
  ('394d83d7-7ead-4c2f-b12f-aa8304d4067c', NULL, NULL, 'caia_park', CURRENT_DATE, 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  ('394d83d7-7ead-4c2f-b12f-aa8304d4067c', NULL, NULL, 'caia_park', CURRENT_DATE, 'youth_club', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  ('1ba2a0d8-f718-49ac-b562-75090973173c', NULL, NULL, 'plas_madoc', CURRENT_DATE, 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  (NULL, 'c058e717-9e86-431d-a9c1-2081eb9d0e9a', NULL, NULL, CURRENT_DATE, 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  -- This week, a few days ago.
  ('08fcc3af-57bd-4fac-9592-19c9cff1e150', NULL, NULL, 'caia_park', CURRENT_DATE - INTERVAL '2 days', 'youth_club', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  -- Last week, for the week browser to show a filled previous week.
  ('1ba2a0d8-f718-49ac-b562-75090973173c', NULL, NULL, 'plas_madoc', CURRENT_DATE - INTERVAL '9 days', 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  -- Volunteer shifts.
  (NULL, NULL, '8e659a72-29d4-4a0a-bb67-74f026cc1bca', NULL, CURRENT_DATE, 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  (NULL, NULL, 'a728b06f-cb6a-4c59-989b-ac87a2e49284', NULL, CURRENT_DATE - INTERVAL '5 days', 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  -- Long-quiet cases for the absence_3mo / absence_1yr detection query
  -- (each child's ONLY attendance record, so they read as "gone quiet").
  ('e60ffefd-ad44-4b6a-89c5-c87c47cefd6e', NULL, NULL, 'plas_madoc', CURRENT_DATE - INTERVAL '100 days', 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  ('6c8f220e-9c1b-4d1e-9413-bee432268d55', NULL, NULL, 'caia_park', CURRENT_DATE - INTERVAL '400 days', 'playground', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1));

UPDATE public.attendance SET activity_notes = 'TEST_ shift: helped run craft table' WHERE volunteer_id = '8e659a72-29d4-4a0a-bb67-74f026cc1bca' AND attended_on = CURRENT_DATE;
UPDATE public.attendance SET activity_notes = 'TEST_ shift: supervised football' WHERE volunteer_id = 'a728b06f-cb6a-4c59-989b-ac87a2e49284';

-- ============================================================
-- INCIDENTS — accident + medical emergency, across a registered
-- child, a registered volunteer, and an unregistered visitor
-- (the flexible person_name-only path).
-- ============================================================
INSERT INTO public.incidents (incident_type, person_type, person_name, child_id, parent_id, volunteer_id, description, action_taken, occurred_on, playground, reported_by) VALUES
  ('accident', 'child', 'TEST_Junior Smith', '1ba2a0d8-f718-49ac-b562-75090973173c', NULL, NULL, 'Fell off the climbing frame and grazed a knee.', 'Cleaned and plastered, informed parent at pickup.', CURRENT_DATE, 'plas_madoc', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  ('medical_emergency', 'volunteer', 'TEST_Adult Owen', NULL, NULL, '8e659a72-29d4-4a0a-bb67-74f026cc1bca', 'Felt dizzy partway through a shift, sat down and recovered after water and a rest.', 'Monitored for 30 minutes, no further action needed.', CURRENT_DATE - INTERVAL '3 days', 'caia_park', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  ('accident', 'visitor', 'TEST_Visitor Delivery Driver', NULL, NULL, NULL, 'Slipped on a wet floor near the entrance.', 'Wet floor sign put out, no injury reported.', CURRENT_DATE - INTERVAL '7 days', 'plas_madoc', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1));

-- ============================================================
-- ADULT VISITORS
-- ============================================================
INSERT INTO public.adult_visitors (name, reason, visit_date, time_from, time_to, playground, logged_by) VALUES
  ('TEST_Boiler Engineer Co', 'Annual boiler service', CURRENT_DATE, '09:00', '11:00', 'caia_park', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1)),
  ('TEST_Fence Contractor Ltd', 'Repairing playground fence', CURRENT_DATE - INTERVAL '3 days', '08:30', '15:00', 'plas_madoc', (SELECT user_id FROM public.user_roles WHERE role IN ('playground_worker','super_admin') LIMIT 1));

-- ============================================================
-- NOTIFICATIONS — one of each notification_type, mixed read/unread.
-- ============================================================
INSERT INTO public.notifications (notification_type, person_type, child_id, message, is_read) VALUES
  ('birthday', 'child', '1ba2a0d8-f718-49ac-b562-75090973173c', 'TEST_Junior Smith has a birthday today.', false),
  ('youth_transition', 'child', 'e60ffefd-ad44-4b6a-89c5-c87c47cefd6e', 'TEST_Newteen Baker turns 10 today and is now eligible for Youth Club.', false),
  ('new_registration', 'child', 'e69d31ef-9b82-4c22-965a-3eb64f24baa6', 'New self-registration pending review: TEST_Pending Adams', false),
  ('absence_3mo', 'child', '6c8f220e-9c1b-4d1e-9413-bee432268d55', 'TEST_LongAbsent Foster has not attended in over 3 months.', true),
  ('absence_1yr', 'child', '6c8f220e-9c1b-4d1e-9413-bee432268d55', 'TEST_LongAbsent Foster has not attended in over a year.', false);
