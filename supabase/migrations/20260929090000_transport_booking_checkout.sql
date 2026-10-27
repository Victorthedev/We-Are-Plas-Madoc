-- Community transport, phase 2: public booking checkout.
--
-- A trip is what the passenger books and pays for (addresses, contact details,
-- price, Stripe ids). Each trip has one or two legs in transport_bookings
-- (outbound, and optionally a return later the same day); each leg holds one
-- driver + vehicle for one slot. Legs carry the status the double-booking
-- indexes from phase 1 look at, so trip and leg statuses are always changed
-- together.
--
-- members is the minimal shape needed to verify a membership at checkout;
-- buying/renewing memberships (Stripe subscriptions) comes in phase 3.

ALTER TABLE public.transport_settings
  ADD COLUMN base_fare_pence INT NOT NULL DEFAULT 2000 CHECK (base_fare_pence > 0),
  ADD COLUMN monthly_discount_pct INT NOT NULL DEFAULT 40 CHECK (monthly_discount_pct BETWEEN 0 AND 100),
  ADD COLUMN yearly_discount_pct INT NOT NULL DEFAULT 80 CHECK (yearly_discount_pct BETWEEN 0 AND 100);

CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Numeric so it can be typed on a phone keypad later.
  member_number TEXT NOT NULL UNIQUE CHECK (member_number ~ '^[0-9]{8}$'),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  -- Stored normalised: uppercase, no spaces.
  postcode TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('monthly','yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','lapsed','cancelled')),
  current_period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX members_email_idx ON public.members (lower(email));

CREATE TABLE public.transport_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 6 digits, keypad-friendly for the phone line later.
  reference TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('standard','accessible')),
  trip_date DATE NOT NULL,
  is_return BOOLEAN NOT NULL DEFAULT false,
  pickup_postcode TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_postcode TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  passenger_email TEXT NOT NULL,
  notes TEXT,
  member_id UUID REFERENCES public.members(id),
  fare_pence INT NOT NULL,
  discount_pct INT NOT NULL DEFAULT 0,
  amount_pence INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','confirmed','cancelled','expired')),
  cancel_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  site_origin TEXT,
  hold_expires_at TIMESTAMPTZ,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  refunded_pence INT,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT CHECK (cancelled_by IN ('passenger','admin','system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transport_trips_date_idx ON public.transport_trips (trip_date, status);
CREATE INDEX transport_trips_held_idx ON public.transport_trips (hold_expires_at) WHERE status = 'held';

ALTER TABLE public.transport_bookings
  ADD COLUMN trip_id UUID REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  ADD COLUMN leg TEXT CHECK (leg IN ('outbound','return')),
  ADD COLUMN starts_at TIMESTAMPTZ;
CREATE INDEX transport_bookings_trip_idx ON public.transport_bookings (trip_id);

-- Simple sliding-window rate limiting for the public member lookup endpoints.
CREATE TABLE public.transport_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transport_rate_limits_idx ON public.transport_rate_limits (bucket, key, created_at);

-- ---------------------------------------------------------------------------
-- Hold a trip: re-check the slot(s) are open, pick a driver + vehicle for each
-- leg, and insert the trip and its legs, all in one transaction. Only edge
-- functions (service role) may call it; price is decided there.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transport_hold_trip(
  _trip JSONB,
  _slot_id UUID,
  _return_slot_id UUID,
  _hold_until TIMESTAMPTZ
)
RETURNS TABLE (trip_id UUID, reference TEXT, cancel_token UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  _date DATE := (_trip->>'trip_date')::date;
  _type TEXT := _trip->>'vehicle_type';
  _out public.transport_slots;
  _ret public.transport_slots;
  _slot public.transport_slots;
  _sid UUID;
  _ref TEXT;
  _trip_id UUID;
  _token UUID;
  _driver UUID;
  _vehicle UUID;
  _prev_driver UUID;
  _prev_vehicle UUID;
BEGIN
  -- Serialise allocation per date so two checkouts can't both take the last
  -- driver/vehicle. (The unique indexes would catch it anyway; this turns a
  -- constraint error into a clean "just been taken" message.)
  PERFORM pg_advisory_xact_lock(hashtext('transport:' || _date::text));

  SELECT * INTO _out FROM public.transport_slots WHERE id = _slot_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'That time is no longer available. Please choose another.'; END IF;

  IF _return_slot_id IS NOT NULL THEN
    SELECT * INTO _ret FROM public.transport_slots WHERE id = _return_slot_id AND active;
    IF NOT FOUND OR _ret.start_time < _out.end_time THEN
      RAISE EXCEPTION 'The return journey must be after the outbound journey.';
    END IF;
  END IF;

  FOREACH _sid IN ARRAY array_remove(ARRAY[_slot_id, _return_slot_id], NULL) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.get_transport_availability(_date, _date) a
      WHERE a.slot_id = _sid AND a.vehicle_type = _type AND a.is_open
    ) THEN
      RAISE EXCEPTION 'Sorry, that time has just been taken. Please choose another.';
    END IF;
  END LOOP;

  LOOP
    _ref := lpad(floor(random() * 1000000)::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.transport_trips t WHERE t.reference = _ref);
  END LOOP;

  INSERT INTO public.transport_trips (
    reference, vehicle_type, trip_date, is_return,
    pickup_postcode, pickup_address, dropoff_postcode, dropoff_address,
    passenger_name, passenger_phone, passenger_email, notes,
    member_id, fare_pence, discount_pct, amount_pence,
    site_origin, hold_expires_at
  ) VALUES (
    _ref, _type, _date, _return_slot_id IS NOT NULL,
    _trip->>'pickup_postcode', _trip->>'pickup_address', _trip->>'dropoff_postcode', _trip->>'dropoff_address',
    _trip->>'passenger_name', _trip->>'passenger_phone', _trip->>'passenger_email', NULLIF(_trip->>'notes', ''),
    NULLIF(_trip->>'member_id', '')::uuid, (_trip->>'fare_pence')::int, COALESCE((_trip->>'discount_pct')::int, 0), (_trip->>'amount_pence')::int,
    _trip->>'site_origin', _hold_until
  )
  RETURNING id, cancel_token INTO _trip_id, _token;

  FOREACH _sid IN ARRAY array_remove(ARRAY[_slot_id, _return_slot_id], NULL) LOOP
    SELECT * INTO _slot FROM public.transport_slots WHERE id = _sid;

    -- Prefer the same driver/vehicle as the outbound leg for a return, then
    -- whoever has the fewest trips that day, so work is spread fairly.
    SELECT a.driver_id INTO _driver
    FROM public.driver_availability a
    WHERE a.avail_date = _date AND a.slot_id = _sid
      AND public.has_role(a.driver_id, 'driver')
      AND NOT EXISTS (
        SELECT 1 FROM public.transport_bookings b
        WHERE b.driver_id = a.driver_id AND b.booking_date = _date AND b.slot_id = _sid AND b.status IN ('held','confirmed')
      )
    ORDER BY
      (a.driver_id = _prev_driver) DESC NULLS LAST,
      (SELECT count(*) FROM public.transport_bookings b2
        WHERE b2.driver_id = a.driver_id AND b2.booking_date = _date AND b2.status IN ('held','confirmed')),
      random()
    LIMIT 1;

    SELECT v.id INTO _vehicle
    FROM public.vehicles v
    WHERE v.active AND v.vehicle_type = _type
      AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_unavailability u
        WHERE u.vehicle_id = v.id AND _date BETWEEN u.start_date AND u.end_date
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.transport_bookings b
        WHERE b.vehicle_id = v.id AND b.booking_date = _date AND b.slot_id = _sid AND b.status IN ('held','confirmed')
      )
    ORDER BY (v.id = _prev_vehicle) DESC NULLS LAST, random()
    LIMIT 1;

    IF _driver IS NULL OR _vehicle IS NULL THEN
      RAISE EXCEPTION 'Sorry, that time has just been taken. Please choose another.';
    END IF;

    INSERT INTO public.transport_bookings (booking_date, slot_id, driver_id, vehicle_id, status, hold_expires_at, trip_id, leg, starts_at)
    VALUES (
      _date, _sid, _driver, _vehicle, 'held', _hold_until, _trip_id,
      CASE WHEN _sid = _slot_id THEN 'outbound' ELSE 'return' END,
      (_date + _slot.start_time) AT TIME ZONE 'Europe/London'
    );

    _prev_driver := _driver;
    _prev_vehicle := _vehicle;
  END LOOP;

  RETURN QUERY SELECT _trip_id, _ref, _token;
END $$;

REVOKE ALL ON FUNCTION public.transport_hold_trip(JSONB, UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transport_hold_trip(JSONB, UUID, UUID, TIMESTAMPTZ) TO service_role;

-- Change a trip and all its legs to a new status together.
CREATE OR REPLACE FUNCTION public.transport_set_trip_status(_trip_id UUID, _status TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.transport_trips SET status = _status, updated_at = now() WHERE id = _trip_id;
  UPDATE public.transport_bookings SET status = _status, updated_at = now() WHERE trip_id = _trip_id;
$$;

REVOKE ALL ON FUNCTION public.transport_set_trip_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transport_set_trip_status(UUID, TEXT) TO service_role;

-- Safety net if Stripe's checkout.session.expired webhook is missed: release
-- holds a few minutes past their expiry (Stripe won't take payment after
-- expires_at, so these can never be paid). Also trims old rate-limit rows.
-- Scheduled by supabase/setup_transport_cron.sql.
CREATE OR REPLACE FUNCTION public.transport_expire_stale_holds()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INT;
BEGIN
  WITH t AS (
    UPDATE public.transport_trips SET status = 'expired', updated_at = now()
    WHERE status = 'held' AND hold_expires_at < now() - interval '5 minutes'
    RETURNING id
  )
  UPDATE public.transport_bookings b SET status = 'expired', updated_at = now()
  FROM t WHERE b.trip_id = t.id;
  GET DIAGNOSTICS _n = ROW_COUNT;

  DELETE FROM public.transport_rate_limits WHERE created_at < now() - interval '1 day';
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.transport_expire_stale_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transport_expire_stale_holds() TO service_role;

-- ---------------------------------------------------------------------------
-- RLS: members, trips and rate limits are written only by edge functions.
-- ---------------------------------------------------------------------------

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin select members" ON public.members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Drivers see the trips they're driving (pickup/drop-off and passenger contact).
CREATE POLICY "Driver/admin select transport_trips" ON public.transport_trips FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.transport_bookings b WHERE b.trip_id = transport_trips.id AND b.driver_id = auth.uid())
  );
