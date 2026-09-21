-- Community donations via Stripe Checkout. A row is created as 'pending'
-- the moment a donor starts checkout (so abandoned/failed attempts are
-- still visible, not silently lost), then flipped to 'paid' by the
-- stripe-webhook function once Stripe confirms the payment actually
-- cleared. Amounts are stored in pence (integer) to avoid float rounding,
-- matching how Stripe itself represents money.
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_pence INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  donor_name TEXT,
  donor_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Financial data: super_admin only, same sensitivity tier as staff accounts.
-- No public policy at all; the only writer is the webhook function, which
-- uses the service-role key and bypasses RLS like every other server-side
-- write in this project.
CREATE POLICY "Super admin select donations" ON public.donations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));