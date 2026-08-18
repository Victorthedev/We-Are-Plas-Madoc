-- Phase 5b: approval audit trail (who actioned a pending review, and when)
-- and incident follow-up tracking (was the parent notified, does this need
-- following up on, and any notes about that).

ALTER TABLE public.children
  ADD COLUMN approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN approved_at TIMESTAMPTZ;

ALTER TABLE public.parents
  ADD COLUMN approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN approved_at TIMESTAMPTZ;

ALTER TABLE public.incidents
  ADD COLUMN parent_notified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN follow_up_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN follow_up_notes TEXT;
