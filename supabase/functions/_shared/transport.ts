// Shared helpers for the community transport edge functions.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "./mailer.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const adminClient = () => createClient(Deno.env.get("SUPERBASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const DEFAULT_ORIGIN = "https://weareplasmadoc.co.uk";
// Where links in emails not tied to a booking (membership emails) point.
// Set SITE_URL=http://localhost:8080 locally.
export const siteUrl = () => Deno.env.get("SITE_URL") || DEFAULT_ORIGIN;

// ---------------------------------------------------------------------------
// Postcodes
// ---------------------------------------------------------------------------

export const normalisePostcode = (pc: string) => (pc || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const formatPostcode = (pc: string) => {
  const n = normalisePostcode(pc);
  return n.length > 3 ? `${n.slice(0, -3)} ${n.slice(-3)}` : n;
};
// Loose UK shape check; postcodes.io does the real validation during lookup.
export const looksLikePostcode = (pc: string) => /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(normalisePostcode(pc));

// ---------------------------------------------------------------------------
// Rate limiting (sliding window, per bucket + key, stored in Postgres)
// ---------------------------------------------------------------------------

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

export async function rateLimited(supabase: SupabaseClient, bucket: string, key: string, limit: number, windowMinutes: number) {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await supabase.from("transport_rate_limits").select("id", { count: "exact", head: true })
    .eq("bucket", bucket).eq("key", key).gte("created_at", since);
  if ((count || 0) >= limit) return true;
  await supabase.from("transport_rate_limits").insert({ bucket, key });
  return false;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export interface Member {
  id: string;
  member_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postcode: string;
  plan: "monthly" | "yearly";
  status: string;
  current_period_end: string;
  source: "online" | "manual";
  manage_token: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  cancel_at_period_end: boolean;
}

export interface TransportSettings {
  base_fare_pence: number;
  monthly_discount_pct: number;
  yearly_discount_pct: number;
  cancel_cutoff_minutes: number;
  monthly_price_pence: number;
  yearly_price_pence: number;
}

export async function fetchSettings(supabase: SupabaseClient): Promise<TransportSettings> {
  const { data, error } = await supabase.from("transport_settings").select("*").single();
  if (error || !data) throw new Error("Transport settings missing");
  return data as TransportSettings;
}

export type MemberCheck =
  | { ok: true; member: Member }
  | { ok: false; reason: "not_found" | "inactive" };

// Number AND postcode must match, so a guessed number alone reveals nothing.
export async function verifyMember(supabase: SupabaseClient, memberNumber: string, postcode: string): Promise<MemberCheck> {
  const number = (memberNumber || "").replace(/\D/g, "");
  if (number.length !== 8 || !looksLikePostcode(postcode)) return { ok: false, reason: "not_found" };
  const { data } = await supabase.from("members").select("*").eq("member_number", number).maybeSingle();
  if (!data || data.postcode !== normalisePostcode(postcode)) return { ok: false, reason: "not_found" };
  if (!isMemberActive(data as Member)) return { ok: false, reason: "inactive" };
  return { ok: true, member: data as Member };
}

// Online renewals land via webhook, which can lag the period end slightly, so
// allow a few days' grace; manual members are valid exactly to their date.
export function isMemberActive(m: Member) {
  if (m.status !== "active") return false;
  const graceDays = m.source === "online" ? 3 : 0;
  const lastValid = new Date(`${m.current_period_end}T00:00:00Z`);
  lastValid.setUTCDate(lastValid.getUTCDate() + graceDays);
  return lastValid.toISOString().slice(0, 10) >= new Date().toISOString().slice(0, 10);
}

export const memberManageUrl = (m: Member) => `${siteUrl()}/membership/manage?token=${m.manage_token}`;
export const planLabel = (plan: string) => (plan === "yearly" ? "Yearly" : "Monthly");

export const discountFor = (plan: string | null | undefined, s: TransportSettings) =>
  plan === "yearly" ? s.yearly_discount_pct : plan === "monthly" ? s.monthly_discount_pct : 0;

// Enough for the member to recognise themselves, not enough to be useful to
// someone who guessed a number + postcode.
export function maskedMember(m: Member) {
  const maskWord = (w: string) => (w.length <= 1 ? w : w[0] + "*".repeat(Math.min(w.length - 1, 5)));
  const [first, ...rest] = m.full_name.trim().split(/\s+/);
  return {
    name: [first, ...rest.map(maskWord)].join(" "),
    phone: m.phone ? `••••• ••${m.phone.replace(/\s/g, "").slice(-3)}` : null,
    address: m.address ? `${m.address.split(",")[0].replace(/^(\S+\s+\S{0,3})\S*/, "$1***")}, ${formatPostcode(m.postcode)}` : formatPostcode(m.postcode),
    plan: m.plan,
    renews: m.current_period_end,
  };
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export interface TripLeg {
  id: string;
  leg: "outbound" | "return";
  starts_at: string;
  driver_id: string;
  vehicle_id: string;
  transport_slots: { start_time: string; end_time: string };
  vehicles: { name: string; registration: string | null };
}

export interface Trip {
  id: string;
  reference: string;
  vehicle_type: string;
  trip_date: string;
  is_return: boolean;
  pickup_postcode: string;
  pickup_address: string;
  dropoff_postcode: string;
  dropoff_address: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string;
  notes: string | null;
  member_id: string | null;
  fare_pence: number;
  discount_pct: number;
  amount_pence: number;
  status: string;
  cancel_token: string;
  site_origin: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  transport_bookings: TripLeg[];
}

export async function loadTrip(supabase: SupabaseClient, column: "id" | "cancel_token", value: string): Promise<Trip | null> {
  const { data } = await supabase
    .from("transport_trips")
    .select("*, transport_bookings(id, leg, starts_at, driver_id, vehicle_id, transport_slots(start_time, end_time), vehicles(name, registration))")
    .eq(column, value)
    .maybeSingle();
  if (!data) return null;
  const trip = data as Trip;
  trip.transport_bookings.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return trip;
}

export const firstStart = (trip: Trip) => new Date(trip.transport_bookings[0]?.starts_at);

export function cancelDeadline(trip: Trip, s: TransportSettings) {
  return new Date(firstStart(trip).getTime() - s.cancel_cutoff_minutes * 60_000);
}

export const manageUrl = (trip: Trip) => `${trip.site_origin || DEFAULT_ORIGIN}/transport/manage?token=${trip.cancel_token}`;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const formatPence = (p: number) => `£${(p / 100).toFixed(2)}`;
export const formatTripDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
export const formatSlot = (s: { start_time: string; end_time: string }) => `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`;
export const vehicleLabel = (t: string) => (t === "accessible" ? "Wheelchair accessible vehicle" : "Standard vehicle");
const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

function layout(heading: string, body: string) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#7B2D8E;padding:28px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;margin:0;">${heading}</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">We Are Plas Madoc · Community Transport</p>
  </div>
  <div style="padding:32px;background:#ffffff;">${body}</div>
  <div style="background:#F5F0FF;padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;margin:0;">We Are Plas Madoc (WAPM) · CIO Charity No. 1197278</p>
    <p style="color:#999;font-size:11px;margin:4px 0 0;">The Opportunities Centre, Plas Madoc, Wrexham, LL14 3US</p>
  </div>
</div>
</body></html>`;
}

const row = (label: string, value: string) =>
  `<p style="color:#2D1B4E;font-size:14px;margin:6px 0;"><strong>${label}:</strong> ${value}</p>`;

function journeyBlock(trip: Trip, legs: TripLeg[]) {
  const legLines = legs.map((l) =>
    row(l.leg === "return" ? "Return pickup" : "Pickup", `${formatSlot(l.transport_slots)} (driver arrives during this window)`)
  ).join("");
  return `
    <div style="background:#F5F0FF;border-radius:12px;padding:20px;margin:20px 0;">
      ${row("Booking reference", `<span style="font-size:18px;letter-spacing:2px;">${trip.reference}</span>`)}
      ${row("Date", formatTripDate(trip.trip_date))}
      ${legLines}
      ${row("From", `${esc(trip.pickup_address)}, ${esc(formatPostcode(trip.pickup_postcode))}`)}
      ${row("To", `${esc(trip.dropoff_address)}, ${esc(formatPostcode(trip.dropoff_postcode))}`)}
      ${row("Vehicle", vehicleLabel(trip.vehicle_type))}
    </div>`;
}

const button = (href: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;background:#7B2D8E;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;">${label}</a></div>`;

async function safeSend(to: string, subject: string, html: string) {
  try {
    const ok = await sendEmail(to, subject, html);
    if (!ok) console.error(`transport email to ${to} not sent (mailer returned false)`);
  } catch (err) {
    console.error(`transport email to ${to} failed:`, err);
  }
}

async function driverEmails(supabase: SupabaseClient, trip: Trip) {
  const ids = [...new Set(trip.transport_bookings.map((l) => l.driver_id))];
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  return (data || []) as { id: string; full_name: string; email: string }[];
}

export async function sendTripConfirmedEmails(supabase: SupabaseClient, trip: Trip, cutoffMinutes: number) {
  const paid = trip.discount_pct > 0
    ? `${formatPence(trip.amount_pence)} (member discount ${trip.discount_pct}% off ${formatPence(trip.fare_pence)})`
    : formatPence(trip.amount_pence);
  const hours = Math.round(cutoffMinutes / 60);

  await safeSend(trip.passenger_email, `Your transport is booked: ${formatTripDate(trip.trip_date)} (ref ${trip.reference})`, layout("Transport Booked ✅", `
    <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(trip.passenger_name)},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">Your community transport is confirmed. Please be ready at the start of your pickup window.</p>
    ${journeyBlock(trip, trip.transport_bookings)}
    ${row("Paid", paid)}
    <p style="color:#555;font-size:13px;line-height:1.6;margin-top:20px;">Plans changed? You can cancel for a full refund up to ${hours} hours before pickup.</p>
    ${button(manageUrl(trip), "View or cancel booking")}
  `));

  for (const driver of await driverEmails(supabase, trip)) {
    const legs = trip.transport_bookings.filter((l) => l.driver_id === driver.id);
    const vehicles = [...new Set(legs.map((l) => `${l.vehicles.name}${l.vehicles.registration ? ` (${l.vehicles.registration})` : ""}`))].join(", ");
    await safeSend(driver.email, `New trip: ${formatTripDate(trip.trip_date)} ${legs.map((l) => l.transport_slots.start_time.slice(0, 5)).join(" & ")}`, layout("New Trip Assigned", `
      <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(driver.full_name)},</p>
      <p style="color:#555;font-size:14px;line-height:1.6;">You've been booked for a community transport trip.</p>
      ${journeyBlock(trip, legs)}
      ${row("Your vehicle", esc(vehicles))}
      ${row("Passenger", esc(trip.passenger_name))}
      ${row("Passenger phone", esc(trip.passenger_phone))}
      ${trip.notes ? row("Notes from passenger", esc(trip.notes)) : ""}
    `));
  }
}

export async function sendTripCancelledEmails(supabase: SupabaseClient, trip: Trip, refundedPence: number | null, by: "passenger" | "admin" | "system") {
  const refundLine = refundedPence
    ? `<p style="color:#555;font-size:14px;line-height:1.6;">A full refund of <strong>${formatPence(refundedPence)}</strong> has been issued to your card. It usually appears within 5–10 working days.</p>`
    : "";
  const why = by === "passenger"
    ? "As requested, your booking has been cancelled."
    : "We're very sorry, but we've had to cancel your booking.";

  await safeSend(trip.passenger_email, `Transport booking cancelled (ref ${trip.reference})`, layout("Booking Cancelled", `
    <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(trip.passenger_name)},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">${why}</p>
    ${journeyBlock(trip, trip.transport_bookings)}
    ${refundLine}
    ${button(`${trip.site_origin || DEFAULT_ORIGIN}/transport`, "Book another trip")}
  `));

  for (const driver of await driverEmails(supabase, trip)) {
    const legs = trip.transport_bookings.filter((l) => l.driver_id === driver.id);
    await safeSend(driver.email, `Trip cancelled: ${formatTripDate(trip.trip_date)} ${legs.map((l) => l.transport_slots.start_time.slice(0, 5)).join(" & ")}`, layout("Trip Cancelled", `
      <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(driver.full_name)},</p>
      <p style="color:#555;font-size:14px;line-height:1.6;">This trip has been cancelled. You no longer need to drive it, and your availability for that time is open again.</p>
      ${journeyBlock(trip, legs)}
    `));
  }
}

const memberNumberBlock = (m: Member) => `
    <div style="background:#F5F0FF;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <p style="color:#555;font-size:12px;margin:0 0 6px;">Membership number</p>
      <p style="color:#7B2D8E;font-size:28px;letter-spacing:4px;font-weight:700;margin:0;">${m.member_number.slice(0, 4)} ${m.member_number.slice(4)}</p>
    </div>`;

export async function sendMemberNumberEmail(member: Member) {
  await safeSend(member.email, "Your We Are Plas Madoc membership number", layout("Your Membership Number", `
    <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(member.full_name.split(" ")[0])},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">You asked us to remind you of your membership number:</p>
    ${memberNumberBlock(member)}
    ${button(memberManageUrl(member), "View your membership")}
    <p style="color:#999;font-size:12px;line-height:1.6;">Didn't ask for this? You can safely ignore this email.</p>
  `));
}

export async function sendMemberWelcomeEmail(member: Member, s: TransportSettings) {
  const pct = discountFor(member.plan, s);
  const renewal = member.source === "online"
    ? `Your membership renews automatically ${member.plan === "yearly" ? "every year" : "every month"}. You can cancel any time.`
    : `Your membership is paid until ${formatTripDate(member.current_period_end)}.`;
  await safeSend(member.email, "Welcome! Your We Are Plas Madoc membership", layout("Welcome, Member! 🎉", `
    <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(member.full_name.split(" ")[0])},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">Thank you for joining. As a ${planLabel(member.plan).toLowerCase()} member you get <strong>${pct}% off</strong> every community transport trip.</p>
    ${memberNumberBlock(member)}
    <p style="color:#555;font-size:14px;line-height:1.6;">When you book, tick "I have a membership" and enter this number with your postcode (${esc(formatPostcode(member.postcode))}).</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">${renewal}</p>
    ${button(memberManageUrl(member), "View or manage membership")}
    ${button(`${siteUrl()}/transport`, "Book a trip")}
  `));
}

export async function sendMemberEndedEmail(member: Member) {
  await safeSend(member.email, "Your We Are Plas Madoc membership has ended", layout("Membership Ended", `
    <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(member.full_name.split(" ")[0])},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">Your ${planLabel(member.plan).toLowerCase()} membership (${member.member_number}) has ended, so member discounts no longer apply to new bookings. Any trips you've already booked are unaffected.</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">We'd love to have you back any time.</p>
    ${button(`${siteUrl()}/membership`, "Rejoin")}
  `));
}

export async function sendMemberPaymentFailedEmail(member: Member) {
  await safeSend(member.email, "Action needed: your membership payment didn't go through", layout("Payment Problem", `
    <p style="color:#2D1B4E;font-size:16px;">Hi ${esc(member.full_name.split(" ")[0])},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;">We couldn't take your latest membership payment. Until it's sorted, member discounts are paused. Please update your card to keep your membership.</p>
    ${button(memberManageUrl(member), "Update payment details")}
  `));
}
