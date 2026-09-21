-- Add the playground_worker role, used by the new Visitor Management System module.
-- This must be its own migration: Postgres will not let a newly-added enum value be
-- used (compared, cast, referenced in a policy) within the same transaction that added it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'playground_worker';
