import { supabase } from "@/integrations/superbase/client";
import { addDays, format, startOfWeek } from "date-fns";

export type VehicleType = "standard" | "accessible";

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "accessible", label: "Wheelchair Accessible" },
];

export const formatVehicleType = (t: string) => VEHICLE_TYPES.find((v) => v.value === t)?.label || t;

export interface VehicleRow {
  id: string;
  name: string;
  registration: string | null;
  vehicle_type: VehicleType;
  seats: number | null;
  notes: string | null;
  active: boolean;
}

export interface VehicleUnavailabilityRow {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface SlotRow {
  id: string;
  start_time: string;
  end_time: string;
  active: boolean;
}

export interface AvailabilityRow {
  slot_date: string;
  slot_id: string;
  start_time: string;
  end_time: string;
  vehicle_type: VehicleType;
  free_vehicles: number;
  free_drivers: number;
  is_open: boolean;
}

export interface DriverOption {
  id: string;
  full_name: string;
}

// "09:00:00" -> "09:00"
export const formatTime = (t: string) => t.slice(0, 5);
export const formatSlot = (s: { start_time: string; end_time: string }) => `${formatTime(s.start_time)}–${formatTime(s.end_time)}`;

// Dates travel to/from Postgres as plain YYYY-MM-DD strings; never go through
// toISOString(), which would shift the day across the UTC boundary.
export const toDateKey = (d: Date) => format(d, "yyyy-MM-dd");

export function weekDays(anchor: Date): Date[] {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const cellKey = (date: string, slotId: string) => `${date}|${slotId}`;

export async function fetchSlots(): Promise<SlotRow[]> {
  const { data, error } = await supabase.from("transport_slots").select("*").eq("active", true).order("start_time");
  if (error) throw error;
  return (data || []) as SlotRow[];
}

export async function fetchDrivers(): Promise<DriverOption[]> {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("user_roles").select("user_id, role").eq("role", "driver"),
  ]);
  const ids = new Set((roles || []).map((r) => r.user_id));
  return (profiles || []).filter((p) => ids.has(p.id));
}

export interface TransportSettings {
  base_fare_pence: number;
  monthly_discount_pct: number;
  yearly_discount_pct: number;
  cancel_cutoff_minutes: number;
  booking_horizon_days: number;
  monthly_price_pence: number;
  yearly_price_pence: number;
}

export async function fetchSettings(): Promise<TransportSettings> {
  const { data, error } = await supabase.from("transport_settings").select("*").single();
  if (error) throw error;
  return data as TransportSettings;
}

// Display only: the server recomputes the price at checkout.
export function computePrice(s: TransportSettings, isReturn: boolean, discountPct: number) {
  const fare = s.base_fare_pence * (isReturn ? 2 : 1);
  return { fare, discount: fare - Math.round(fare * (100 - discountPct) / 100), total: Math.round(fare * (100 - discountPct) / 100) };
}

export const formatPence = (p: number) => `£${(p / 100).toFixed(2).replace(/\.00$/, "")}`;

export const formatPostcode = (pc: string) => {
  const n = pc.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return n.length > 3 ? `${n.slice(0, -3)} ${n.slice(-3)}` : n;
};

export interface AddressValue {
  postcode: string;
  address: string;
}

export const emptyAddress: AddressValue = { postcode: "", address: "" };

export type TripStatus = "held" | "confirmed" | "cancelled" | "expired";

// supabase.functions.invoke hides the JSON body of non-2xx responses behind a
// generic message; dig the function's own { error } back out for the user.
export async function invokeTransport<T>(fn: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let message = "Something went wrong. Please try again.";
    try {
      const ctx = (error as { context?: Response }).context;
      const payload = ctx ? await ctx.json() : null;
      if (payload?.error) message = payload.error;
    } catch { /* keep generic message */ }
    throw new Error(message);
  }
  return data as T;
}

export async function fetchAvailability(from: string, to: string): Promise<AvailabilityRow[]> {
  const { data, error } = await supabase.rpc("get_transport_availability", { _from: from, _to: to });
  if (error) throw error;
  return (data || []) as AvailabilityRow[];
}

// ---------------------------------------------------------------------------
// Booking draft: kept while someone leaves the booking form to buy a
// membership, so they come back to what they'd filled in. sessionStorage can
// be unavailable (private mode etc.), so every access is guarded.
// ---------------------------------------------------------------------------

export interface BookingDraft {
  vehicleType: VehicleType | null;
  date: string | null;
  slotId: string;
  isReturn: boolean;
  returnSlotId: string;
  pickup: AddressValue;
  dropoff: AddressValue;
  name: string;
  phone: string;
  email: string;
  notes: string;
  // Filled in after a successful membership purchase.
  memberNumber?: string;
  memberPostcode?: string;
}

const DRAFT_KEY = "wapm-transport-draft";

export function saveBookingDraft(draft: BookingDraft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* not critical */ }
}

export function loadBookingDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

export function updateBookingDraft(patch: Partial<BookingDraft>) {
  const draft = loadBookingDraft();
  if (draft) saveBookingDraft({ ...draft, ...patch });
}

export function clearBookingDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* not critical */ }
}
