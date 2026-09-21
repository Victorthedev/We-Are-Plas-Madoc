import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const {
      amount_pence, donor_email, origin,
      gift_aid, donor_first_name, donor_last_name, donor_phone, donor_address,
    } = await req.json();

    if (!amount_pence || amount_pence < 100) {
      return json({ error: "amount_pence must be at least 100 (£1)" }, 400);
    }
    if (!origin) return json({ error: "origin is required" }, 400);
    if (gift_aid && (!donor_first_name?.trim() || !donor_last_name?.trim() || !donor_address?.trim())) {
      return json({ error: "Gift Aid needs your full name and home address to be a valid declaration" }, 400);
    }

    const fullName = donor_first_name && donor_last_name ? `${donor_first_name} ${donor_last_name}` : null;

    const { data: donation, error: dbError } = await supabase
      .from("donations")
      .insert({
        amount_pence,
        donor_email: donor_email || null,
        donor_name: fullName,
        gift_aid: !!gift_aid,
        donor_first_name: donor_first_name || null,
        donor_last_name: donor_last_name || null,
        donor_phone: donor_phone || null,
        donor_address: donor_address || null,
      })
      .select("id")
      .single();
    if (dbError || !donation) return json({ error: dbError?.message || "Could not start the donation" }, 400);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: { name: "Donation to We Are Plas Madoc" },
          unit_amount: amount_pence,
        },
        quantity: 1,
      }],
      customer_email: donor_email || undefined,
      metadata: { donation_id: donation.id },
      success_url: `${origin}/donate?status=success`,
      cancel_url: `${origin}/donate?status=cancelled`,
    });

    await supabase.from("donations").update({ stripe_checkout_session_id: session.id }).eq("id", donation.id);

    return json({ url: session.url });
  } catch (err) {
    console.error("create-donation-checkout error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
