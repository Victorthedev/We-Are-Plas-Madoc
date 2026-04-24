-- Run this in the Supabase SQL Editor

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS recurrence_rule text DEFAULT 'none'
    CHECK (recurrence_rule IN ('none', 'weekly', 'fortnightly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_until date,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES events(id) ON DELETE SET NULL;
