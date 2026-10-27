// Public: start an online membership. Creates a 'pending' member row, then a
// Stripe Checkout session in subscription mode; stripe-webhook activates the
// member and emails their number once the first payment succeeds.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import {
  adminClient, clientIp, corsHeaders, fetchSettings, json, looksLikePostcode, normalisePostcode, planLabel, rateLimited,
} from "../_shared/transport.ts";

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
  const supabase = adminClient();
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const body = await req.json();
    const plan = body.plan;
    const name = clean(body.name, 100);
    const email = clean(body.email).toLowerCase();
    const phone = clean(body.phone, 30);
    const address = clean(body.address);
    const postcode = clean(body.postcode, 10);
    const origin = clean(body.origin);
    // Only allow returning to our own booking page.
    const returnTo = body.return_to === "transport" ? "transport" : null;

    if (!["monthly", "yearly"].includes(plan)) return json({ error: "Please choose monthly or yearly" }, 400);
    if (!name) return json({ error: "Please enter your name" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email address" }, 400);
    if (phone.replace(/\D/g, "").length < 10) return json({ error: "Please enter a phone number" }, 400);
    if (!looksLikePostcode(postcode) || !address) return json({ error: "Please enter your home address" }, 400);
    if (!origin) return json({ error: "origin is required" }, 400);

    if (await rateLimited(supabase, "membership-checkout", clientIp(req), 10, 60)) {
      return json({ error: "Too many attempts. Please try again later." }, 429);
    }

    const settings = await fetchSettings(supabase);
    const pricePence = plan === "yearly" ? settings.yearly_price_pence : settings.monthly_price_pence;

    const { data: member, error: insertError } = await supabase.from("members").insert({
      full_name: name,
      email,
      phone,
      address,
      postcode: normalisePostcode(postcode),
      plan,
      status: "pending",
      source: "online",
      // Replaced with the real period end when Stripe confirms payment.
      current_period_end: new Date().toISOString().slice(0, 10),
    }).select("id, member_number, manage_token").single();
    if (insertError || !member) return json({ error: insertError?.message || "Could not start membership" }, 400);

    const successParams = new URLSearchParams({ status: "success", token: member.manage_token });
    if (returnTo) successParams.set("return", returnTo);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: { name: `We Are Plas Madoc Membership (${planLabel(plan)})` },
          unit_amount: pricePence,
          recurring: { interval: plan === "yearly" ? "year" : "month" },
        },
        quantity: 1,
      }],
      customer_email: email,
      metadata: { member_id: member.id },
      subscription_data: { metadata: { member_id: member.id } },
      success_url: `${origin}/membership?${successParams}`,
      cancel_url: `${origin}/membership?status=cancelled${returnTo ? `&return=${returnTo}` : ""}`,
    });

    await supabase.from("members").update({ stripe_checkout_session_id: session.id }).eq("id", member.id);
    return json({ url: session.url });
  } catch (err) {
    console.error("create-membership-checkout error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
