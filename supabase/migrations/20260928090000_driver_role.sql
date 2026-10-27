-- Add the driver role, used by the community transport booking module.
-- This must be its own migration: Postgres will not let a newly-added enum value be
-- used (compared, cast, referenced in a policy) within the same transaction that added it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';
