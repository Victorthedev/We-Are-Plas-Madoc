import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchSettings, loadTrip, sendMemberEndedEmail, sendMemberPaymentFailedEmail, sendMemberWelcomeEmail,
  sendTripCancelledEmails, sendTripConfirmedEmails, type Member,
} from "../_shared/transport.ts";

const memberStatusFor = (s: Stripe.Subscription.Status) =>
  s === "active" || s === "trialing" ? "active"
    : s === "canceled" || s === "incomplete_expired" ? "cancelled"
    : "lapsed";

// Brings a member in line with their Stripe subscription and sends an email
// for any status change. Always re-fetches the subscription so it doesn't
// matter which event arrives first, or how many times.
async function syncMembership(supabase: SupabaseClient, stripe: Stripe, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const memberId = sub.metadata?.member_id;
  if (!memberId) return;
  const { data } = await supabase.from("members").select("*").eq("id", memberId).maybeSingle();
  if (!data) return;
  const before = data as Member;

  // Newer API versions moved the period onto subscription items.
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
    ?? sub.items.data[0]?.current_period_end;
  const status = memberStatusFor(sub.status);

  const update = {
    status,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    cancel_at_period_end: sub.cancel_at_period_end,
    ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString().slice(0, 10) } : {}),
    updated_at: new Date().toISOString(),
  };

  // Only the call that actually moves a member out of 'pending' sends the
  // welcome, so a retried or duplicate event can't email it twice.
  if (before.status === "pending") {
    const { data: activated } = await supabase.from("members").update(update)
      .eq("id", memberId).eq("status", "pending").select("*").maybeSingle();
    if (activated && status === "active") await sendMemberWelcomeEmail(activated as Member, await fetchSettings(supabase));
    return;
  }

  const { data: after } = await supabase.from("members").update(update).eq("id", memberId).select("*").single();
  if (before.status === status) return;
  if (status === "cancelled") await sendMemberEndedEmail(after as Member);
  if (status === "lapsed") await sendMemberPaymentFailedEmail(after as Member);
}

async function confirmTransportTrip(supabase: SupabaseClient, stripe: Stripe, tripId: string, session: Stripe.Checkout.Session) {
  const trip = await loadTrip(supabase, "id", tripId);
  // Stripe retries webhooks; only act the first time.
  if (!trip || trip.status === "confirmed" || trip.status === "cancelled") return;

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await supabase.from("transport_trips").update({
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntent,
  }).eq("id", tripId);

  // Normally the trip is still 'held'. If the expiry sweep got there first and
  // someone else has since taken the slot, re-confirming hits the
  // double-booking index: refund and apologise instead of overbooking.
  const { error } = await supabase.rpc("transport_set_trip_status", { _trip_id: tripId, _status: "confirmed" });
  if (error) {
    console.error(`stripe-webhook: trip ${tripId} paid but slot lost, refunding:`, error);
    const refund = paymentIntent ? await stripe.refunds.create({ payment_intent: paymentIntent }) : null;
    await supabase.rpc("transport_set_trip_status", { _trip_id: tripId, _status: "cancelled" });
    await supabase.from("transport_trips").update({
      cancelled_at: new Date().toISOString(),
      cancelled_by: "system",
      stripe_refund_id: refund?.id ?? null,
      refunded_pence: refund?.amount ?? null,
    }).eq("id", tripId);
    await sendTripCancelledEmails(supabase, trip, refund?.amount ?? null, "system");
    return;
  }

  const settings = await fetchSettings(supabase);
  await sendTripConfirmedEmails(supabase, trip, settings.cancel_cutoff_minutes);
}

serve(async (req) => {
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Stripe secrets not configured" }), { status: 500 });
  }

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  // Signature verification needs the raw, unparsed request body, not JSON.parse'd.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("stripe-webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const donationId = session.metadata?.donation_id;
      if (donationId) {
        await supabase.from("donations").update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        }).eq("id", donationId);
      }
      const tripId = session.metadata?.transport_trip_id;
      if (tripId) await confirmTransportTrip(supabase, stripe, tripId, session);
      if (session.mode === "subscription" && session.metadata?.member_id && session.subscription) {
        await syncMembership(supabase, stripe, typeof session.subscription === "string" ? session.subscription : session.subscription.id);
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncMembership(supabase, stripe, (event.data.object as Stripe.Subscription).id);
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const tripId = session.metadata?.transport_trip_id;
      if (tripId) {
        const trip = await loadTrip(supabase, "id", tripId);
        if (trip?.status === "held") await supabase.rpc("transport_set_trip_status", { _trip_id: tripId, _status: "expired" });
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("stripe-webhook processing error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500 });
  }
});
