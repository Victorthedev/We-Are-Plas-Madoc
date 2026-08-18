import { supabase } from "@/integrations/superbase/client";
import { format } from "date-fns";
import { fetchWeatherNow, getQuoteOfDay, fetchCustomQuote } from "@/lib/vms";

export type ChecklistSection = "opening" | "closing";

export interface ChecklistItemRow {
  id: string;
  section: ChecklistSection;
  label: string;
  sort_order: number;
  active: boolean;
}

export interface DailyLogRow {
  id: string;
  log_date: string;
  playground: string;
  staff_team: string | null;
  session_time_from: string | null;
  session_time_to: string | null;
  term_type: string | null;
  opening_notes: string | null;
  closing_notes: string | null;
  reflection_notes: string | null;
  weather_snapshot: string | null;
  quote_snapshot: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DailyLogCheckRow {
  id: string;
  daily_log_id: string;
  checklist_item_id: string;
  checked: boolean;
  checked_by: string | null;
  initials: string | null;
  comment: string | null;
}

export const todayKey = () => format(new Date(), "yyyy-MM-dd");

export async function fetchChecklistItems(): Promise<ChecklistItemRow[]> {
  const { data } = await supabase.from("checklist_items").select("*").eq("active", true).order("section").order("sort_order");
  return (data || []) as ChecklistItemRow[];
}

/** All logs already started for a playground/date, most recent first. Usually zero or one, but a site can have more than one in a day (e.g. a separate morning/evening session). */
export async function fetchTodayLogs(playground: string, date: string): Promise<DailyLogRow[]> {
  const { data } = await supabase.from("daily_logs").select("*").eq("log_date", date).eq("playground", playground).order("created_at", { ascending: false });
  return (data || []) as DailyLogRow[];
}

/** Starts a fresh log (with a Weather/Quote snapshot and one check row per active checklist item). Callers decide when this is appropriate to call, e.g. only when no log exists yet, or when the user explicitly asks to start another. */
export async function createLog(playground: string, date: string, userId: string): Promise<DailyLogRow> {
  const [weather, customQuote] = await Promise.all([fetchWeatherNow(), fetchCustomQuote(date)]);
  const weatherSnapshot = weather ? `${weather.temperatureC}°C, ${weather.description}` : null;
  const quoteSnapshot = customQuote || getQuoteOfDay();

  const { data: created, error } = await supabase.from("daily_logs")
    .insert({ log_date: date, playground, created_by: userId, weather_snapshot: weatherSnapshot, quote_snapshot: quoteSnapshot })
    .select("*").single();
  if (error) throw error;
  const log = created as DailyLogRow;

  const items = await fetchChecklistItems();
  if (items.length) {
    await supabase.from("daily_log_checks").insert(items.map((item) => ({ daily_log_id: log.id, checklist_item_id: item.id })));
  }
  return log;
}

export async function fetchLogChecks(logId: string): Promise<DailyLogCheckRow[]> {
  const { data } = await supabase.from("daily_log_checks").select("*").eq("daily_log_id", logId);
  return (data || []) as DailyLogCheckRow[];
}

/** A specific log by its own id, for History links and cross-links from Tasks, regardless of whether it's today's or a past one, or one of several from the same day. */
export async function fetchLogById(id: string): Promise<{ log: DailyLogRow; checks: DailyLogCheckRow[] } | null> {
  const { data: log } = await supabase.from("daily_logs").select("*").eq("id", id).maybeSingle();
  if (!log) return null;
  const checks = await fetchLogChecks(id);
  return { log: log as DailyLogRow, checks };
}

export async function saveCheck(id: string, patch: Partial<Pick<DailyLogCheckRow, "checked" | "checked_by" | "initials" | "comment">>) {
  const { error } = await supabase.from("daily_log_checks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function saveLogFields(id: string, patch: Partial<Omit<DailyLogRow, "id">>) {
  const { error } = await supabase.from("daily_logs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export interface ReflectionData {
  incidents: { id: string; person_name: string; incident_type: string; description: string }[];
  visitors: { id: string; name: string; reason: string }[];
}

/** Live pull, not stored on the log, so it always reflects the current state of those modules for that date/playground. */
export async function fetchReflectionData(playground: string, date: string): Promise<ReflectionData> {
  const [{ data: incidents }, { data: visitors }] = await Promise.all([
    supabase.from("incidents").select("id, person_name, incident_type, description").eq("occurred_on", date).eq("playground", playground),
    supabase.from("adult_visitors").select("id, name, reason").eq("visit_date", date).eq("playground", playground),
  ]);
  return { incidents: incidents || [], visitors: visitors || [] };
}

export interface StaffOption {
  id: string;
  full_name: string;
}

export async function fetchStaffOptions(): Promise<StaffOption[]> {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const eligible = new Set((roles || []).filter((r) => r.role === "playground_worker" || r.role === "super_admin").map((r) => r.user_id));
  return (profiles || []).filter((p) => eligible.has(p.id));
}

export type TaskStatus = "open" | "in_progress" | "resolved";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  playground: string | null;
  assigned_to: string | null;
  created_by: string | null;
  daily_log_check_id: string | null;
  resolved_at: string | null;
  resolved_notes: string | null;
  created_at: string;
  /** The daily log this task's flagged item came from, if it was created via "Create Task" on a checklist item. */
  sourceLog: { id: string; log_date: string; playground: string } | null;
}

export async function fetchTasks(): Promise<TaskRow[]> {
  const { data } = await (supabase.from("vms_tasks") as any)
    .select("*, daily_log_checks(daily_log_id, daily_logs(id, log_date, playground))")
    .order("created_at", { ascending: false });
  return (data || []).map((t: any) => ({
    ...t,
    sourceLog: t.daily_log_checks?.daily_logs
      ? { id: t.daily_log_checks.daily_logs.id, log_date: t.daily_log_checks.daily_logs.log_date, playground: t.daily_log_checks.daily_logs.playground }
      : null,
  })) as TaskRow[];
}

export async function createTask(payload: {
  title: string;
  description?: string;
  playground?: string | null;
  assigned_to?: string | null;
  created_by: string;
  daily_log_check_id?: string;
}) {
  const { data, error } = await supabase.from("vms_tasks").insert(payload).select("id").single();
  if (error) throw error;
  if (payload.assigned_to) {
    // Best-effort: a failed notification shouldn't undo the task that was already created.
    supabase.functions.invoke("notify-task-assigned", { body: { task_id: data.id } }).catch(() => {});
  }
}

export async function updateTaskStatus(id: string, status: TaskStatus, resolvedNotes?: string) {
  await supabase.from("vms_tasks").update({
    status,
    resolved_at: status === "resolved" ? new Date().toISOString() : null,
    resolved_notes: resolvedNotes ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}
