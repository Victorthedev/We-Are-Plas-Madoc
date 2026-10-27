-- Community transport, phase 1: fleet, drivers and availability.
--
-- A booking takes one vehicle + one driver for one fixed time slot on a date.
-- A slot is open for a vehicle type when BOTH a vehicle of that type AND a
-- driver are free in it (drivers can drive any vehicle, so they are one pool).
-- Drivers are staff accounts with the 'driver' role who set their own
-- availability per date + slot; vehicles can be taken out for date ranges
-- (repairs etc.). transport_bookings is kept minimal here so availability can
-- subtract booked drivers/vehicles; passenger, pricing and payment columns
-- come with the booking checkout (phase 2).

CREATE TABLE public.transport_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  min_notice_minutes INT NOT NULL DEFAULT 120,
  booking_horizon_days INT NOT NULL DEFAULT 60,
  cancel_cutoff_minutes INT NOT NULL DEFAULT 120,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.transport_settings DEFAULT VALUES;

CREATE TABLE public.transport_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIME NOT NULL UNIQUE,
  end_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration TEXT,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('standard','accessible')),
  seats INT CHECK (seats > 0),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX vehicle_unavailability_vehicle_idx ON public.vehicle_unavailability (vehicle_id, start_date);

CREATE TABLE public.driver_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avail_date DATE NOT NULL,
  slot_id UUID NOT NULL REFERENCES public.transport_slots(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (driver_id, avail_date, slot_id)
);
CREATE INDEX driver_availability_date_idx ON public.driver_availability (avail_date, slot_id);

CREATE TABLE public.transport_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_date DATE NOT NULL,
  slot_id UUID NOT NULL REFERENCES public.transport_slots(id),
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','confirmed','cancelled','expired')),
  hold_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- The database itself refuses a double booking, even if two checkouts race.
CREATE UNIQUE INDEX transport_bookings_driver_slot_uniq ON public.transport_bookings (driver_id, booking_date, slot_id)
  WHERE status IN ('held','confirmed');
CREATE UNIQUE INDEX transport_bookings_vehicle_slot_uniq ON public.transport_bookings (vehicle_id, booking_date, slot_id)
  WHERE status IN ('held','confirmed');
CREATE INDEX transport_bookings_date_idx ON public.transport_bookings (booking_date, slot_id);

-- Seed: four 2-hour slots. Admins can deactivate/add slots later.
INSERT INTO public.transport_slots (start_time, end_time) VALUES
  ('09:00','11:00'), ('11:00','13:00'), ('13:00','15:00'), ('15:00','17:00');

-- ---------------------------------------------------------------------------
-- Guards: availability can't be withdrawn out from under a live booking.
-- The admin reassigns or cancels the booking first.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_driver_availability_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.transport_bookings
    WHERE driver_id = OLD.driver_id AND booking_date = OLD.avail_date AND slot_id = OLD.slot_id
      AND status IN ('held','confirmed')
  ) THEN
    RAISE EXCEPTION 'You have a booking in this slot. Please contact an admin to reassign it before removing your availability.';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER driver_availability_delete_guard BEFORE DELETE ON public.driver_availability
  FOR EACH ROW EXECUTE FUNCTION public.guard_driver_availability_delete();

CREATE OR REPLACE FUNCTION public.guard_vehicle_unavailability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INT;
BEGIN
  SELECT count(*) INTO _n FROM public.transport_bookings
  WHERE vehicle_id = NEW.vehicle_id AND status IN ('held','confirmed')
    AND booking_date BETWEEN NEW.start_date AND NEW.end_date;
  IF _n > 0 THEN
    RAISE EXCEPTION 'This vehicle has % active booking(s) in that period. Reassign or cancel them first.', _n;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER vehicle_unavailability_guard BEFORE INSERT OR UPDATE ON public.vehicle_unavailability
  FOR EACH ROW EXECUTE FUNCTION public.guard_vehicle_unavailability();

CREATE OR REPLACE FUNCTION public.guard_vehicle_deactivate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INT;
BEGIN
  IF OLD.active AND NOT NEW.active THEN
    SELECT count(*) INTO _n FROM public.transport_bookings
    WHERE vehicle_id = NEW.id AND status IN ('held','confirmed') AND booking_date >= current_date;
    IF _n > 0 THEN
      RAISE EXCEPTION 'This vehicle has % upcoming booking(s). Reassign or cancel them first.', _n;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER vehicle_deactivate_guard BEFORE UPDATE OF active ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.guard_vehicle_deactivate();

CREATE OR REPLACE FUNCTION public.guard_slot_deactivate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INT;
BEGIN
  IF OLD.active AND NOT NEW.active THEN
    SELECT count(*) INTO _n FROM public.transport_bookings
    WHERE slot_id = NEW.id AND status IN ('held','confirmed') AND booking_date >= current_date;
    IF _n > 0 THEN
      RAISE EXCEPTION 'This slot has % upcoming booking(s). Reassign or cancel them first.', _n;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER slot_deactivate_guard BEFORE UPDATE OF active ON public.transport_slots
  FOR EACH ROW EXECUTE FUNCTION public.guard_slot_deactivate();

-- ---------------------------------------------------------------------------
-- Availability: one row per date x active slot x vehicle type.
-- SECURITY DEFINER so the public booking page can call it without being able
-- to read drivers, vehicles or bookings directly — it only ever sees counts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_transport_availability(_from DATE, _to DATE)
RETURNS TABLE (
  slot_date DATE,
  slot_id UUID,
  start_time TIME,
  end_time TIME,
  vehicle_type TEXT,
  free_vehicles INT,
  free_drivers INT,
  is_open BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cfg AS (
    SELECT min_notice_minutes, booking_horizon_days FROM public.transport_settings LIMIT 1
  ),
  days AS (
    -- Capped at ~3 months per call to keep the grid bounded.
    SELECT d::date AS slot_date FROM generate_series(_from, LEAST(_to, _from + 92), interval '1 day') d
  ),
  booked AS (
    SELECT booking_date, slot_id, driver_id, vehicle_id FROM public.transport_bookings
    WHERE status IN ('held','confirmed') AND booking_date BETWEEN _from AND _to
  )
  SELECT
    days.slot_date, s.id, s.start_time, s.end_time, t.vehicle_type,
    fv.n, fd.n,
    fv.n > 0 AND fd.n > 0
      AND ((days.slot_date + s.start_time) AT TIME ZONE 'Europe/London') > now() + make_interval(mins => cfg.min_notice_minutes)
      AND days.slot_date <= current_date + cfg.booking_horizon_days
  FROM days
  CROSS JOIN public.transport_slots s
  CROSS JOIN (VALUES ('standard'), ('accessible')) AS t(vehicle_type)
  CROSS JOIN cfg
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS n FROM public.vehicles v
    WHERE v.active AND v.vehicle_type = t.vehicle_type
      AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_unavailability u
        WHERE u.vehicle_id = v.id AND days.slot_date BETWEEN u.start_date AND u.end_date
      )
      AND NOT EXISTS (
        SELECT 1 FROM booked b WHERE b.vehicle_id = v.id AND b.booking_date = days.slot_date AND b.slot_id = s.id
      )
  ) fv
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS n FROM public.driver_availability a
    WHERE a.avail_date = days.slot_date AND a.slot_id = s.id
      AND public.has_role(a.driver_id, 'driver')
      AND NOT EXISTS (
        SELECT 1 FROM booked b WHERE b.driver_id = a.driver_id AND b.booking_date = days.slot_date AND b.slot_id = s.id
      )
  ) fd
  WHERE s.active
  ORDER BY days.slot_date, s.start_time, t.vehicle_type
$$;

GRANT EXECUTE ON FUNCTION public.get_transport_availability(DATE, DATE) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select transport_settings" ON public.transport_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin update transport_settings" ON public.transport_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Public select transport_slots" ON public.transport_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert transport_slots" ON public.transport_slots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update transport_slots" ON public.transport_slots FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Driver/admin select vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin insert vehicles" ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update vehicles" ON public.vehicles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Driver/admin select vehicle_unavailability" ON public.vehicle_unavailability FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin insert vehicle_unavailability" ON public.vehicle_unavailability FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update vehicle_unavailability" ON public.vehicle_unavailability FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin delete vehicle_unavailability" ON public.vehicle_unavailability FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Drivers manage their own availability; admins can manage anyone's (e.g. a
-- driver who rings in rather than logging in).
CREATE POLICY "Own/admin select driver_availability" ON public.driver_availability FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Own/admin insert driver_availability" ON public.driver_availability FOR INSERT TO authenticated
  WITH CHECK (
    (driver_id = auth.uid() AND public.has_role(auth.uid(), 'driver'))
    OR (public.has_role(auth.uid(), 'super_admin') AND public.has_role(driver_id, 'driver'))
  );
CREATE POLICY "Own/admin delete driver_availability" ON public.driver_availability FOR DELETE TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Bookings are written by edge functions (service role) in phase 2.
CREATE POLICY "Own/admin select transport_bookings" ON public.transport_bookings FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
