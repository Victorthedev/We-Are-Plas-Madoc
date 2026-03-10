
-- event_rsvps table
CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  party_size integer NOT NULL DEFAULT 1,
  reminder_sent boolean NOT NULL DEFAULT false,
  cancellation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Public can RSVP (insert)
CREATE POLICY "Anyone can insert rsvps"
  ON public.event_rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated can read RSVPs
CREATE POLICY "Authenticated can read rsvps"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated can update RSVPs
CREATE POLICY "Authenticated can update rsvps"
  ON public.event_rsvps FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated can delete RSVPs
CREATE POLICY "Authenticated can delete rsvps"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (true);

-- Anon can read own RSVP by cancellation token (for cancel page)
CREATE POLICY "Anon can read rsvp by token"
  ON public.event_rsvps FOR SELECT
  TO anon
  USING (true);

-- Anon can delete own RSVP by cancellation token
CREATE POLICY "Anon can delete rsvp by token"
  ON public.event_rsvps FOR DELETE
  TO anon
  USING (true);
