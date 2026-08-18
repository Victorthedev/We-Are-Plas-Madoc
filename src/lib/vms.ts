import { supabase } from "@/integrations/superbase/client";

export const AGE_BANDS = ["0-4", "5-8", "9-12", "13-15", "16-17"] as const;
export type AgeBand = typeof AGE_BANDS[number];

export const PLAYGROUNDS = [
  { value: "caia_park", label: "Caia Park" },
  { value: "plas_madoc", label: "Plas Madoc" },
] as const;

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function getAgeBand(age: number): AgeBand {
  if (age <= 4) return "0-4";
  if (age <= 8) return "5-8";
  if (age <= 12) return "9-12";
  if (age <= 15) return "13-15";
  return "16-17";
}

export function isEighteenOrOver(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) >= 18;
}

export function isYouthClubAge(dateOfBirth: string): boolean {
  const age = calculateAge(dateOfBirth);
  return age >= 10 && age < 18;
}

export const YOUTH_AGE_BANDS = ["10-12", "13-15", "16-17"] as const;
export type YouthAgeBand = typeof YOUTH_AGE_BANDS[number];

export function getYouthAgeBand(age: number): YouthAgeBand {
  if (age <= 12) return "10-12";
  if (age <= 15) return "13-15";
  return "16-17";
}

/** True for roughly the first month after a child's 10th birthday, for the "new to Youth Club" badge. */
export function isNewToYouthClub(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  const tenthBirthday = new Date(dob.getFullYear() + 10, dob.getMonth(), dob.getDate());
  const daysSince = (Date.now() - tenthBirthday.getTime()) / 86_400_000;
  return daysSince >= 0 && daysSince < 30;
}

export function formatPlayground(value: string | null): string {
  return PLAYGROUNDS.find((p) => p.value === value)?.label || value || "-";
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

/** Primary (or first-linked, as a fallback) parent/guardian contact per child, for list-row display. */
export async function fetchEmergencyContacts(childIds: string[]): Promise<Record<string, EmergencyContact>> {
  if (childIds.length === 0) return {};
  const { data } = await supabase
    .from("child_parent_links")
    .select("child_id, is_primary_contact, parents(first_name, last_name, phone)")
    .in("child_id", childIds);

  const map: Record<string, EmergencyContact> = {};
  for (const link of data || []) {
    const parent = (link as any).parents;
    if (!parent) continue;
    if (!map[link.child_id] || link.is_primary_contact) {
      map[link.child_id] = { name: `${parent.first_name} ${parent.last_name}`, phone: parent.phone };
    }
  }
  return map;
}

export const SERVICES = [
  { value: "playground", label: "Playground" },
  { value: "youth_club", label: "Youth Club" },
] as const;

export const QUOTES = [
  "Every child you welcome today is a memory they'll keep for life.",
  "Small moments of kindness build the biggest sense of belonging.",
  "Play is how children make sense of the world. Thank you for holding that space.",
  "The best playgrounds are built on patience, not equipment.",
  "A steady, familiar face is worth more than any toy on the shelf.",
  "You don't just supervise play, you make it safe to be a kid.",
  "Some of these children will remember you long after they forget the day itself.",
  "Consistency is a quiet gift. Showing up for these kids every week is one.",
  "The quietest child today might just need someone to notice them.",
  "Every scraped knee you tend to is also a lesson in being cared for.",
  "Community isn't a building, it's the people who keep opening the door.",
  "A good laugh with a child can undo a whole hard week for them.",
  "You are, for some of these kids, the most reliable adult in their day.",
  "Youth work is slow, patient, unglamorous, and quietly life-changing.",
  "The energy you bring in the morning sets the tone for every child's afternoon.",
  "Nobody remembers the paperwork. Everybody remembers who made them feel safe.",
  "A well-run session looks effortless because someone cared enough to make it that way.",
  "Every child deserves at least one adult who is glad to see them. Be that today.",
  "Structure and warmth together, that's what turns a session into a home away from home.",
  "The teenagers rolling their eyes still notice when you show up for them.",
  "Sometimes the job is just being a calm, steady presence in someone's chaotic day.",
  "You're not just filling an afternoon, you're shaping how these kids remember growing up.",
  "Trust with children is built in ordinary Tuesdays, not big gestures.",
  "The volunteers and staff here are quietly one of the most important parts of this community.",
  "A child who feels safe here carries that confidence everywhere else too.",
  "Good youth work is invisible when it's working. Keep doing what you're doing.",
  "Every parent who drops off and relaxes for an hour is trusting you with something precious.",
  "The best thing you can give a child today might just be your full attention.",
  "Play today, resilience tomorrow. That's the quiet trade you make every session.",
  "Thank you for being part of the village it takes.",
] as const;

/** Deterministic pick by day-of-year, so everyone sees the same quote on a given day with no backend needed. */
export function getQuoteOfDay(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}

/** A staff-set quote for a given date, if one has been recorded. Falls back to getQuoteOfDay() when null. */
export async function fetchCustomQuote(date: string): Promise<string | null> {
  const { data } = await supabase.from("vms_daily_quotes").select("quote_text").eq("quote_date", date).maybeSingle();
  return data?.quote_text || null;
}

export async function setCustomQuote(date: string, text: string, userId: string): Promise<void> {
  await supabase.from("vms_daily_quotes").upsert({ quote_date: date, quote_text: text, created_by: userId }, { onConflict: "quote_date" });
}

export async function clearCustomQuote(date: string): Promise<void> {
  await supabase.from("vms_daily_quotes").delete().eq("quote_date", date);
}

// Wrexham, Wales (nearest major town to Plas Madoc / Caia Park).
const WEATHER_LAT = 53.047;
const WEATHER_LON = -3.0;

export interface WeatherNow {
  temperatureC: number;
  weatherCode: number;
  description: string;
}

const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

export async function fetchWeatherNow(): Promise<WeatherNow | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const code: number = data?.current_weather?.weathercode;
    return {
      temperatureC: Math.round(data?.current_weather?.temperature),
      weatherCode: code,
      description: WEATHER_CODE_DESCRIPTIONS[code] || "Weather unavailable",
    };
  } catch {
    return null;
  }
}

export type ReportPersonType = "child" | "parent" | "volunteer";

export interface PersonReportEntry {
  date: string;
  label: string;
  incident: { incidentType: string; description: string } | null;
}

/**
 * A day-by-day ledger of a person's attendance in a date range, each entry
 * annotated with any incident recorded against them on that same date
 * (explicitly null when there wasn't one), used by both the interactive
 * report page and PDF/CSV export so they never drift from each other.
 */
export async function fetchPersonReport(
  personType: ReportPersonType,
  personId: string,
  from: string,
  to: string
): Promise<PersonReportEntry[]> {
  const fkField = `${personType}_id`;
  const attendanceRes = await (supabase.from("attendance") as any).select("*").eq(fkField, personId).gte("attended_on", from).lte("attended_on", to).order("attended_on");
  const incidentRes = await (supabase.from("incidents") as any).select("*").eq(fkField, personId).gte("occurred_on", from).lte("occurred_on", to);
  const attendanceRows: any[] = attendanceRes.data;
  const incidentRows: any[] = incidentRes.data;

  return (attendanceRows || []).map((a: any) => {
    const incident = (incidentRows || []).find((i: any) => i.occurred_on === a.attended_on);
    const label = personType === "child" && a.service === "youth_club" ? "Youth Club"
      : personType === "volunteer" ? "Shift"
      : "Playground";
    return {
      date: a.attended_on,
      label,
      incident: incident ? { incidentType: incident.incident_type, description: incident.description } : null,
    };
  });
}

/** Client-side CSV download, no library needed. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
