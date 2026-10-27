-- Community transport, phase 3: buying and managing memberships.
--
-- Online members pay through a Stripe subscription (monthly or yearly); the
-- stripe-webhook keeps status/current_period_end in sync. A member row is
-- created as 'pending' when checkout starts and becomes 'active' once Stripe
-- confirms payment, so an unpaid signup can never pass verification.
-- Manual members (cash / phone) are added by an admin with a paid-until date
-- and renewed by hand.
-- Nobody signs in: members reach their details through an emailed manage link
-- (manage_token), and change card / cancel in Stripe's Customer Portal.

ALTER TABLE public.transport_settings
  ADD COLUMN monthly_price_pence INT NOT NULL DEFAULT 1000 CHECK (monthly_price_pence > 0),
  ADD COLUMN yearly_price_pence INT NOT NULL DEFAULT 10000 CHECK (yearly_price_pence > 0);

CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE _n TEXT;
BEGIN
  LOOP
    -- 8 digits, never starting with 0 so it survives being typed as a number.
    _n := (10000000 + floor(random() * 90000000))::int::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.members WHERE member_number = _n);
  END LOOP;
  RETURN _n;
END $$;

ALTER TABLE public.members
  ALTER COLUMN member_number SET DEFAULT public.generate_member_number(),
  ADD COLUMN source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','manual')),
  ADD COLUMN manage_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN stripe_checkout_session_id TEXT,
  ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN notes TEXT,
  ADD COLUMN created_by UUID REFERENCES auth.users(id),
  ADD CONSTRAINT members_email_lowercase CHECK (email = lower(email));

-- 'pending' = online signup that hasn't paid yet.
ALTER TABLE public.members DROP CONSTRAINT members_status_check;
ALTER TABLE public.members ADD CONSTRAINT members_status_check CHECK (status IN ('pending','active','lapsed','cancelled'));

-- Admins manage members directly (manual members, contact detail fixes).
CREATE POLICY "Admin insert members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update members" ON public.members FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
