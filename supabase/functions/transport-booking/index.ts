// Manage an existing transport booking.
//   get          (token)   - booking summary for the manage page
//   release      (token)   - passenger backed out of Stripe Checkout: free the hold now
//   cancel       (token)   - passenger cancels; full refund if before the cutoff
//   admin-cancel (trip_id) - super_admin cancels any booking (no cutoff), refunds if paid
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  adminClient, cancelDeadline, corsHeaders, fetchSettings, firstStart, json, loadTrip, sendTripCancelledEmails,
  type Trip,
} from "../_shared/transport.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function releaseHold(supabase: SupabaseClient, stripe: Stripe, trip: Trip) {
  if (trip.stripe_checkout_session_id) {
    try {
      await stripe.checkout.sessions.expire(trip.stripe_checkout_session_id);
    } catch (err) {
      // Already expired/completed; the webhook handles those.
      console.error("transport-booking: could not expire checkout session:", err);
    }
  }
  await supabase.rpc("transport_set_trip_status", { _trip_id: trip.id, _status: "expired" });
}

async function cancelPaidTrip(supabase: SupabaseClient, stripe: Stripe, trip: Trip, by: "passenger" | "admin") {
  let refundId: string | null = null;
  let refunded: number | null = null;
  if (trip.stripe_payment_intent_id && trip.amount_pence > 0) {
    const refund = await stripe.refunds.create({ payment_intent: trip.stripe_payment_intent_id });
    refundId = refund.id;
    refunded = refund.amount;
  }
  await supabase.rpc("transport_set_trip_status", { _trip_id: trip.id, _status: "cancelled" });
  await supabase.from("transport_trips").update({
    cancelled_at: new Date().toISOString(),
    cancelled_by: by,
    stripe_refund_id: refundId,
    refunded_pence: refunded,
  }).eq("id", trip.id);
  await sendTripCancelledEmails(supabase, trip, refunded, by);
  return refunded;
}

async function isSuperAdmin(supabase: SupabaseClient, req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return false;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  return !!roles?.some((r) => r.role === "super_admin");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
  const supabase = adminClient();
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const { action, token, trip_id } = await req.json();

    if (action === "admin-cancel") {
      if (!(await isSuperAdmin(supabase, req))) return json({ error: "Forbidden" }, 403);
      if (!UUID_RE.test(trip_id || "")) return json({ error: "Invalid trip" }, 400);
      const trip = await loadTrip(supabase, "id", trip_id);
      if (!trip) return json({ error: "Booking not found" }, 404);
      if (trip.status === "held") { await releaseHold(supabase, stripe, trip); return json({ cancelled: true, refunded_pence: null }); }
      if (trip.status !== "confirmed") return json({ error: `This booking is already ${trip.status}` }, 400);
      const refunded = await cancelPaidTrip(supabase, stripe, trip, "admin");
      return json({ cancelled: true, refunded_pence: refunded });
    }

    if (!UUID_RE.test(token || "")) return json({ error: "This link isn't valid." }, 400);
    const trip = await loadTrip(supabase, "cancel_token", token);
    if (!trip) return json({ error: "We couldn't find that booking." }, 404);
    const settings = await fetchSettings(supabase);
    const deadline = cancelDeadline(trip, settings);

    if (action === "get") {
      return json({
        trip: {
          reference: trip.reference,
          status: trip.status,
          vehicle_type: trip.vehicle_type,
          trip_date: trip.trip_date,
          legs: trip.transport_bookings.map((l) => ({ leg: l.leg, start_time: l.transport_slots.start_time, end_time: l.transport_slots.end_time })),
          pickup: `${trip.pickup_address}`,
          pickup_postcode: trip.pickup_postcode,
          dropoff: `${trip.dropoff_address}`,
          dropoff_postcode: trip.dropoff_postcode,
          passenger_name: trip.passenger_name,
          amount_pence: trip.amount_pence,
          can_cancel: trip.status === "confirmed" && Date.now() < deadline.getTime(),
          cancel_deadline: deadline.toISOString(),
          starts_at: firstStart(trip).toISOString(),
        },
      });
    }

    if (action === "release") {
      if (trip.status === "held") await releaseHold(supabase, stripe, trip);
      return json({ released: true });
    }

    if (action === "cancel") {
      if (trip.status === "held") { await releaseHold(supabase, stripe, trip); return json({ cancelled: true, refunded_pence: null }); }
      if (trip.status !== "confirmed") return json({ error: `This booking is already ${trip.status}.` }, 400);
      if (Date.now() >= deadline.getTime()) {
        const hours = Math.round(settings.cancel_cutoff_minutes / 60);
        return json({ error: `Bookings can only be cancelled online up to ${hours} hours before pickup. Please contact us directly.` }, 400);
      }
      const refunded = await cancelPaidTrip(supabase, stripe, trip, "passenger");
      return json({ cancelled: true, refunded_pence: refunded });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("transport-booking error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
