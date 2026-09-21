import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAY_MS = 86_400_000;

function isSameMonthDay(dob: string, today: Date): boolean {
  const d = new Date(dob);
  return d.getUTCMonth() === today.getUTCMonth() && d.getUTCDate() === today.getUTCDate();
}

function ageOn(dob: string, today: Date): number {
  const d = new Date(dob);
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const threeMonthsAgo = new Date(today.getTime() - 90 * DAY_MS).toISOString().slice(0, 10);
    const oneYearAgo = new Date(today.getTime() - 365 * DAY_MS).toISOString().slice(0, 10);
    const dedupeWindow90 = new Date(today.getTime() - 90 * DAY_MS).toISOString();
    const dedupeWindow300 = new Date(today.getTime() - 300 * DAY_MS).toISOString();

    let created = 0;

    // Only notify once per person per day for a given type: check existing notifications created today.
    const { data: todaysNotifications } = await supabase
      .from("notifications")
      .select("notification_type, child_id, parent_id")
      .gte("created_at", `${todayIso}T00:00:00Z`);
    const alreadyNotifiedToday = new Set(
      (todaysNotifications || []).map((n) => `${n.notification_type}:${n.child_id || n.parent_id}`)
    );

    const insertNotification = async (row: Record<string, unknown>, dedupeKey: string) => {
      if (alreadyNotifiedToday.has(dedupeKey)) return;
      const { error } = await supabase.from("notifications").insert(row);
      if (!error) created++;
    };

    // --- Birthdays & youth-club transition (children) ---
    const { data: children } = await supabase
      .from("children")
      .select("id, first_name, last_name, date_of_birth")
      .eq("approval_status", "approved")
      .is("archived_at", null);

    for (const child of children || []) {
      if (!isSameMonthDay(child.date_of_birth, today)) continue;
      const age = ageOn(child.date_of_birth, today);
      if (age === 10) {
        await insertNotification(
          {
            notification_type: "youth_transition",
            person_type: "child",
            child_id: child.id,
            message: `${child.first_name} ${child.last_name} turns 10 today and is now eligible for Youth Club.`,
          },
          `youth_transition:${child.id}`
        );
      } else {
        await insertNotification(
          {
            notification_type: "birthday",
            person_type: "child",
            child_id: child.id,
            message: `${child.first_name} ${child.last_name} has a birthday today (turning ${age}).`,
          },
          `birthday:${child.id}`
        );
      }
    }

    // --- Birthdays (parents, where date_of_birth is on file) ---
    const { data: parents } = await supabase
      .from("parents")
      .select("id, first_name, last_name, date_of_birth")
      .eq("approval_status", "approved")
      .not("date_of_birth", "is", null);

    for (const parent of parents || []) {
      if (!parent.date_of_birth || !isSameMonthDay(parent.date_of_birth, today)) continue;
      await insertNotification(
        {
          notification_type: "birthday",
          person_type: "parent",
          parent_id: parent.id,
          message: `${parent.first_name} ${parent.last_name} has a birthday today.`,
        },
        `birthday:${parent.id}`
      );
    }

    // --- Absence detection (children who have attended before, then gone quiet) ---
    const { data: recent90 } = await supabase
      .from("attendance")
      .select("child_id")
      .not("child_id", "is", null)
      .gte("attended_on", threeMonthsAgo);
    const { data: recent365 } = await supabase
      .from("attendance")
      .select("child_id")
      .not("child_id", "is", null)
      .gte("attended_on", oneYearAgo);
    const { data: everAttended } = await supabase
      .from("attendance")
      .select("child_id")
      .not("child_id", "is", null);

    const attendedLast90 = new Set((recent90 || []).map((r) => r.child_id));
    const attendedLast365 = new Set((recent365 || []).map((r) => r.child_id));
    const everAttendedSet = new Set((everAttended || []).map((r) => r.child_id));

    for (const childId of everAttendedSet) {
      if (attendedLast90.has(childId)) continue;

      const notificationType = attendedLast365.has(childId) ? "absence_3mo" : "absence_1yr";
      const dedupeCutoff = notificationType === "absence_3mo" ? dedupeWindow90 : dedupeWindow300;

      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("notification_type", notificationType)
        .eq("child_id", childId)
        .gte("created_at", dedupeCutoff)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      const { data: child } = await supabase
        .from("children")
        .select("first_name, last_name")
        .eq("id", childId)
        .maybeSingle();
      if (!child) continue;

      const label = notificationType === "absence_3mo" ? "3 months" : "a year";
      await insertNotification(
        {
          notification_type: notificationType,
          person_type: "child",
          child_id: childId,
          message: `${child.first_name} ${child.last_name} hasn't attended in over ${label}.`,
        },
        `${notificationType}:${childId}`
      );
    }

    return json({ success: true, created });
  } catch (err) {
    console.error("vms-daily-notifications error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
