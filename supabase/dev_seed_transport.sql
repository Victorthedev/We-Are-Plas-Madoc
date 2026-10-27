-- DEV ONLY: dummy members for testing the transport checkout locally.
-- Do not run against production. Run with:
--   docker exec -i supabase_db_aurcamruwoameygvyecv psql -U postgres < supabase/dev_seed_transport.sql
--
--   10000001 + LL14 3US  -> active yearly  (80% off)
--   10000002 + LL14 3US  -> active monthly (40% off)
--   10000003 + LL14 3US  -> lapsed (should be rejected)

INSERT INTO public.members (member_number, full_name, email, phone, address, postcode, plan, status, current_period_end) VALUES
  ('10000001', 'Yearly Tester', 'yearly.member@example.com', '07700900001', '1 Test Street, Plas Madoc, Wrexham', 'LL143US', 'yearly', 'active', current_date + 300),
  ('10000002', 'Monthly Tester', 'monthly.member@example.com', '07700900002', '2 Test Street, Plas Madoc, Wrexham', 'LL143US', 'monthly', 'active', current_date + 20),
  ('10000003', 'Lapsed Tester', 'lapsed.member@example.com', '07700900003', '3 Test Street, Plas Madoc, Wrexham', 'LL143US', 'monthly', 'lapsed', current_date - 10)
ON CONFLICT (member_number) DO NOTHING;
