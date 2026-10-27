// Public: validate a booking, price it server-side, hold the slot(s) with a
// driver + vehicle, and start a Stripe Checkout session that expires with the
// hold. The stripe-webhook confirms (or expires) the trip.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import {
  adminClient, clientIp, corsHeaders, discountFor, fetchSettings, formatPostcode, formatTripDate, json,
  looksLikePostcode, normalisePostcode, rateLimited, verifyMember,
} from "../_shared/transport.ts";

// Stripe requires expires_at to be at least 30 minutes away.
const HOLD_MINUTES = 31;

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

  const supabase = adminClient();
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const body = await req.json();
    const vehicleType = body.vehicle_type;
    const date = clean(body.date, 10);
    const slotId = clean(body.slot_id, 36);
    const returnSlotId = body.return_slot_id ? clean(body.return_slot_id, 36) : null;
    const pickup = { postcode: clean(body.pickup?.postcode, 10), address: clean(body.pickup?.address) };
    const dropoff = { postcode: clean(body.dropoff?.postcode, 10), address: clean(body.dropoff?.address) };
    const passenger = { name: clean(body.passenger?.name, 100), phone: clean(body.passenger?.phone, 30), email: clean(body.passenger?.email, 200).toLowerCase() };
    const notes = clean(body.notes, 500);
    const origin = clean(body.origin, 200);

    if (!["standard", "accessible"].includes(vehicleType)) return json({ error: "Please choose a vehicle type" }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slotId) return json({ error: "Please choose a date and time" }, 400);
    if (!looksLikePostcode(pickup.postcode) || !pickup.address) return json({ error: "Please enter your pickup address" }, 400);
    if (!looksLikePostcode(dropoff.postcode) || !dropoff.address) return json({ error: "Please enter your drop-off address" }, 400);
    if (!passenger.name) return json({ error: "Please enter the passenger's name" }, 400);
    if (passenger.phone.replace(/\D/g, "").length < 10) return json({ error: "Please enter a contact phone number" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passenger.email)) return json({ error: "Please enter a valid email address" }, 400);
    if (!origin) return json({ error: "origin is required" }, 400);

    if (await rateLimited(supabase, "checkout", clientIp(req), 10, 60)) {
      return json({ error: "Too many booking attempts. Please try again later." }, 429);
    }

    // Price is always decided here, never trusted from the browser.
    const settings = await fetchSettings(supabase);
    let memberId: string | null = null;
    let discountPct = 0;
    if (body.member?.number) {
      const check = await verifyMember(supabase, body.member.number, body.member.postcode);
      if (!check.ok) return json({ error: "We couldn't verify that membership. Remove it to continue without a discount." }, 400);
      memberId = check.member.id;
      discountPct = discountFor(check.member.plan, settings);
    }
    const farePence = settings.base_fare_pence * (returnSlotId ? 2 : 1);
    const amountPence = Math.round(farePence * (100 - discountPct) / 100);

    const holdUntil = new Date(Date.now() + HOLD_MINUTES * 60_000);
    const { data: held, error: holdError } = await supabase.rpc("transport_hold_trip", {
      _trip: {
        trip_date: date,
        vehicle_type: vehicleType,
        pickup_postcode: normalisePostcode(pickup.postcode),
        pickup_address: pickup.address,
        dropoff_postcode: normalisePostcode(dropoff.postcode),
        dropoff_address: dropoff.address,
        passenger_name: passenger.name,
        passenger_phone: passenger.phone,
        passenger_email: passenger.email,
        notes,
        member_id: memberId,
        fare_pence: farePence,
        discount_pct: discountPct,
        amount_pence: amountPence,
        site_origin: origin,
      },
      _slot_id: slotId,
      _return_slot_id: returnSlotId,
      _hold_until: holdUntil.toISOString(),
    });
    // Errors raised inside the hold function are written for the passenger.
    if (holdError || !held?.[0]) return json({ error: holdError?.message || "That time is no longer available" }, 409);
    const { trip_id, reference, cancel_token } = held[0];

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Community transport${returnSlotId ? " (return)" : ""}`,
              description: `${formatTripDate(date)} · ${formatPostcode(pickup.postcode)} → ${formatPostcode(dropoff.postcode)} · Ref ${reference}`,
            },
            unit_amount: amountPence,
          },
          quantity: 1,
        }],
        customer_email: passenger.email,
        metadata: { transport_trip_id: trip_id },
        payment_intent_data: { metadata: { transport_trip_id: trip_id } },
        expires_at: Math.floor(holdUntil.getTime() / 1000),
        success_url: `${origin}/transport?status=success&ref=${reference}`,
        cancel_url: `${origin}/transport?status=cancelled&token=${cancel_token}`,
      });
      await supabase.from("transport_trips").update({ stripe_checkout_session_id: session.id }).eq("id", trip_id);
      return json({ url: session.url, reference });
    } catch (stripeErr) {
      // Don't leave the slot blocked for 30 minutes if we never got to payment.
      await supabase.rpc("transport_set_trip_status", { _trip_id: trip_id, _status: "expired" });
      throw stripeErr;
    }
  } catch (err) {
    console.error("create-transport-checkout error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
