import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CloudSunIcon, QuotesIcon, HeartbeatIcon, IdentificationBadgeIcon, FlagIcon,
  CalendarBlankIcon, UsersIcon, ClockIcon, CircleNotchIcon, CheckCircleIcon, WarningIcon, PlusIcon, PencilSimpleIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { formatPlayground } from "@/lib/vms";
import {
  fetchTodayLogs, createLog, fetchLogChecks, fetchLogById, fetchChecklistItems, fetchReflectionData, saveCheck, saveChecksBulk, saveLogFields, todayKey,
  type DailyLogRow, type DailyLogCheckRow, type ChecklistItemRow, type ReflectionData,
} from "@/lib/dailyLog";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import { cn } from "@/lib/utils";

function ChecklistSection({
  title, items, checks, onToggle, onInitials, onComment, onFlag, onMarkAllFine, notes, onNotes, notesLabel,
}: {
  title: string;
  items: ChecklistItemRow[];
  checks: DailyLogCheckRow[];
  onToggle: (checkId: string, checked: boolean) => void;
  onInitials: (checkId: string, value: string) => void;
  onComment: (checkId: string, value: string) => void;
  onFlag: (item: ChecklistItemRow, check: DailyLogCheckRow) => void;
  onMarkAllFine: () => void;
  notes: string;
  onNotes: (value: string) => void;
  notesLabel: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const remaining = items.filter((item) => {
    const check = checks.find((c) => c.checklist_item_id === item.id);
    return check && !check.checked && !check.comment;
  }).length;

  return (
    <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)] mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {remaining > 0 && (
            <button
              onClick={onMarkAllFine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-wapm-green/30 text-wapm-green hover:bg-wapm-green/10 transition-colors shrink-0"
            >
              <CheckCircleIcon className="w-3.5 h-3.5" weight="fill" /> Everything's Fine
            </button>
          )}
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const check = checks.find((c) => c.checklist_item_id === item.id);
            if (!check) return null;
            const expanded = expandedIds.has(item.id) || !!check.comment;
            return (
              <div key={item.id} className="py-2 border-b border-admin-border/60 last:border-0">
                <div className="flex items-center gap-3">
                  <Checkbox checked={check.checked} onCheckedChange={(v) => onToggle(check.id, !!v)} className="shrink-0" />
                  <p className="text-sm text-foreground flex-1">{item.label}</p>
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-1"
                    aria-label={expanded ? "Hide details" : "Add name or comment"}
                  >
                    {check.comment ? <FlagIcon className="w-4 h-4 text-amber-600" weight="fill" /> : <PencilSimpleIcon className="w-4 h-4" />}
                  </button>
                </div>
                {expanded && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-8">
                    <Input
                      key={`${check.id}-${check.initials || ""}`}
                      placeholder="Name"
                      defaultValue={check.initials || ""}
                      onBlur={(e) => onInitials(check.id, e.target.value)}
                      className="rounded-[10px] h-9 flex-1 min-w-[140px]"
                    />
                    <Input
                      placeholder="Comment (optional)"
                      defaultValue={check.comment || ""}
                      onBlur={(e) => onComment(check.id, e.target.value)}
                      className="rounded-[10px] h-9 flex-1 min-w-[160px]"
                    />
                    {check.comment && (
                      <button
                        onClick={() => onFlag(item, check)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors shrink-0"
                      >
                        <FlagIcon className="w-3.5 h-3.5" weight="fill" /> Create Task
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-admin-border">
          <Label className="text-xs text-muted-foreground">{notesLabel}</Label>
          <Textarea
            defaultValue={notes}
            onBlur={(e) => onNotes(e.target.value)}
            placeholder="Add any site jobs to the appropriate whiteboard in the office"
            className="rounded-xl mt-1"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChecksLog() {
  const { id: routeLogId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const playgroundFilter = usePlaygroundFilter();
  const isTodayMode = !routeLogId;
  const selectedPlayground = playgroundFilter !== "all" ? playgroundFilter : null;

  const [log, setLog] = useState<DailyLogRow | null>(null);
  const [checks, setChecks] = useState<DailyLogCheckRow[]>([]);
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [reflection, setReflection] = useState<ReflectionData>({ incidents: [], visitors: [] });
  const [otherLogsToday, setOtherLogsToday] = useState<DailyLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingAnother, setStartingAnother] = useState(false);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [saveError, setSaveError] = useState(false);

  const runSave = async (fn: () => Promise<void>) => {
    setPendingSaves((n) => n + 1);
    try {
      await fn();
      setSaveError(false);
    } catch {
      setSaveError(true);
      toast.error("Could not save that change. Check your connection and try again.");
    } finally {
      setPendingSaves((n) => Math.max(0, n - 1));
    }
  };

  useEffect(() => {
    fetchChecklistItems().then(setItems);
  }, []);

  useEffect(() => {
    if (routeLogId) {
      setLoading(true);
      setOtherLogsToday([]);
      fetchLogById(routeLogId).then((result) => {
        if (!result) { setLog(null); setLoading(false); return; }
        setLog(result.log);
        setChecks(result.checks);
        fetchReflectionData(result.log.playground, result.log.log_date).then(setReflection);
        setLoading(false);
      });
      return;
    }
    if (!selectedPlayground || !user) return;
    setLoading(true);
    const date = todayKey();
    fetchTodayLogs(selectedPlayground, date).then(async (logs) => {
      let current = logs[0] || null;
      if (!current) {
        current = await createLog(selectedPlayground, date, user.id);
        logs = [current];
      }
      const [checksData, reflectionData] = await Promise.all([
        fetchLogChecks(current.id),
        fetchReflectionData(selectedPlayground, date),
      ]);
      setLog(current);
      setChecks(checksData);
      setOtherLogsToday(logs.slice(1));
      setReflection(reflectionData);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeLogId, selectedPlayground, user?.id]);

  const startAnotherLog = async () => {
    if (!selectedPlayground || !user) return;
    setStartingAnother(true);
    try {
      const newLog = await createLog(selectedPlayground, todayKey(), user.id);
      navigate(`/admin/checks/log/${newLog.id}`);
    } catch {
      toast.error("Could not start a new log. Please try again.");
      setStartingAnother(false);
    }
  };

  const updateCheckLocal = (checkId: string, patch: Partial<DailyLogCheckRow>) => {
    setChecks((prev) => prev.map((c) => (c.id === checkId ? { ...c, ...patch } : c)));
  };

  const handleToggle = (checkId: string, checked: boolean) => {
    const current = checks.find((c) => c.id === checkId);
    const patch: Partial<DailyLogCheckRow> = { checked, checked_by: checked ? user?.id || null : null };
    if (checked && !current?.initials && profile?.full_name) {
      patch.initials = profile.full_name;
    }
    updateCheckLocal(checkId, patch);
    runSave(() => saveCheck(checkId, patch));
  };
  const handleMarkAllFine = (sectionItems: ChecklistItemRow[]) => {
    if (!user) return;
    const toMark = sectionItems
      .map((item) => checks.find((c) => c.checklist_item_id === item.id))
      .filter((c): c is DailyLogCheckRow => !!c && !c.checked && !c.comment);
    if (toMark.length === 0) return;

    const withoutName = toMark.filter((c) => !c.initials).map((c) => c.id);
    const withName = toMark.filter((c) => c.initials).map((c) => c.id);

    setChecks((prev) => prev.map((c) => {
      if (withoutName.includes(c.id)) return { ...c, checked: true, checked_by: user.id, initials: profile?.full_name || c.initials };
      if (withName.includes(c.id)) return { ...c, checked: true, checked_by: user.id };
      return c;
    }));

    if (withoutName.length > 0) {
      runSave(() => saveChecksBulk(withoutName, { checked: true, checked_by: user.id, initials: profile?.full_name }));
    }
    if (withName.length > 0) {
      runSave(() => saveChecksBulk(withName, { checked: true, checked_by: user.id }));
    }
  };

  const handleInitials = (checkId: string, value: string) => {
    updateCheckLocal(checkId, { initials: value });
    runSave(() => saveCheck(checkId, { initials: value }));
  };
  const handleComment = (checkId: string, value: string) => {
    updateCheckLocal(checkId, { comment: value });
    runSave(() => saveCheck(checkId, { comment: value }));
  };

  const updateLogField = (field: keyof DailyLogRow, value: string) => {
    if (!log) return;
    setLog({ ...log, [field]: value });
    runSave(() => saveLogFields(log.id, { [field]: value }));
  };

  const playground = log?.playground || selectedPlayground;
  const isToday = log ? log.log_date === todayKey() : true;
  const openingItems = items.filter((i) => i.section === "opening");
  const closingItems = items.filter((i) => i.section === "closing");

  const handleFlag = (item: ChecklistItemRow, check: DailyLogCheckRow) => {
    navigate("/admin/checks/tasks", {
      state: { prefill: { title: item.label, description: check.comment, playground, daily_log_check_id: check.id } },
    });
  };

  if (isTodayMode && !selectedPlayground) {
    return (
      <AdminShell title="Daily Log" breadcrumb="Dashboard > Daily Log">
        <PermissionGuard roles={["super_admin", "playground_worker"]}>
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-8 text-center">
              <p className="text-foreground font-medium mb-4">Pick a playground to view or start today's log.</p>
              <div className="flex justify-center"><PlaygroundFilter /></div>
            </CardContent>
          </Card>
        </PermissionGuard>
      </AdminShell>
    );
  }

  if (!isTodayMode && !loading && !log) {
    return (
      <AdminShell title="Daily Log" breadcrumb="Dashboard > Daily Log">
        <PermissionGuard roles={["super_admin", "playground_worker"]}>
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-8 text-center">
              <p className="text-foreground font-medium">That log couldn't be found.</p>
              <Link to="/admin/checks/history" className="text-sm text-primary hover:text-accent mt-2 inline-block">Back to History</Link>
            </CardContent>
          </Card>
        </PermissionGuard>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Daily Log" breadcrumb="Dashboard > Daily Log">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{formatPlayground(playground)}</h2>
            {log && <p className="text-sm text-muted-foreground">{format(new Date(log.log_date), "EEEE d MMMM yyyy")}{isToday ? " (today)" : ""}</p>}
          </div>
          <div className="flex items-center gap-3">
            {!loading && log && (
              <span className="text-xs flex items-center gap-1.5 shrink-0">
                {pendingSaves > 0 ? (
                  <span className="text-muted-foreground flex items-center gap-1"><CircleNotchIcon className="w-3.5 h-3.5 animate-spin" /> Saving...</span>
                ) : saveError ? (
                  <span className="text-destructive flex items-center gap-1"><WarningIcon className="w-3.5 h-3.5" weight="fill" /> Couldn't save</span>
                ) : (
                  <span className="text-wapm-green flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5" weight="fill" /> All changes saved</span>
                )}
              </span>
            )}
            {isTodayMode && (
              <Button variant="outline" size="sm" onClick={startAnotherLog} disabled={startingAnother} className="rounded-full border-admin-border">
                <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Start Another Log
              </Button>
            )}
            {isTodayMode && <PlaygroundFilter />}
          </div>
        </div>

        {isTodayMode && !loading && otherLogsToday.length > 0 && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50/50 mb-6">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                {otherLogsToday.length === 1 ? "Another log" : `${otherLogsToday.length} other logs`} already exist{otherLogsToday.length === 1 ? "s" : ""} for today at {formatPlayground(playground)}.
              </p>
              <div className="flex gap-2 flex-wrap">
                {otherLogsToday.map((l) => (
                  <Link
                    key={l.id}
                    to={`/admin/checks/log/${l.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    View {l.staff_team || format(new Date(l.created_at), "HH:mm")}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loading || !log ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Card className="rounded-2xl border-admin-border mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" /> Staff Team</Label>
                    <Input defaultValue={log.staff_team || ""} onBlur={(e) => updateLogField("staff_team", e.target.value)} className="rounded-[10px] mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> Session Time</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="time" defaultValue={log.session_time_from || ""} onBlur={(e) => updateLogField("session_time_from", e.target.value)} className="rounded-[10px]" />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input type="time" defaultValue={log.session_time_to || ""} onBlur={(e) => updateLogField("session_time_to", e.target.value)} className="rounded-[10px]" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><CalendarBlankIcon className="w-3.5 h-3.5" /> Term</Label>
                    <div className="flex gap-2 mt-1">
                      {(["term_time", "school_holidays"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => updateLogField("term_type", t)}
                          className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex-1",
                            log.term_type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
                        >
                          {t === "term_time" ? "Term Time" : "School Holidays"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ChecklistSection
              title="Opening Checks"
              items={openingItems}
              checks={checks}
              onToggle={handleToggle}
              onInitials={handleInitials}
              onComment={handleComment}
              onFlag={handleFlag}
              onMarkAllFine={() => handleMarkAllFine(openingItems)}
              notes={log.opening_notes || ""}
              onNotes={(v) => updateLogField("opening_notes", v)}
              notesLabel="Additional observations"
            />

            <ChecklistSection
              title="Closing Checks"
              items={closingItems}
              checks={checks}
              onToggle={handleToggle}
              onInitials={handleInitials}
              onComment={handleComment}
              onFlag={handleFlag}
              onMarkAllFine={() => handleMarkAllFine(closingItems)}
              notes={log.closing_notes || ""}
              onNotes={(v) => updateLogField("closing_notes", v)}
              notesLabel="Additional observations"
            />

            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Reflection on the Session</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-wapm-cyan/5">
                    <CloudSunIcon className="w-5 h-5 text-wapm-cyan shrink-0 mt-0.5" weight="duotone" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weather</p>
                      <p className="text-sm text-foreground">{log.weather_snapshot || "Not available"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5">
                    <QuotesIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" weight="duotone" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quote</p>
                      <p className="text-sm text-foreground">{log.quote_snapshot}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50">
                    <HeartbeatIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" weight="duotone" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accidents, First Aid or Near Misses</p>
                      {reflection.incidents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None recorded today</p>
                      ) : (
                        <ul className="text-sm text-foreground space-y-1 mt-1">
                          {reflection.incidents.map((i) => (
                            <li key={i.id}>{i.person_name}, {i.incident_type === "accident" ? "Accident" : "Medical Emergency"}: {i.description}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/5">
                    <IdentificationBadgeIcon className="w-5 h-5 text-accent shrink-0 mt-0.5" weight="duotone" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adult Visitors</p>
                      {reflection.visitors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None recorded today</p>
                      ) : (
                        <ul className="text-sm text-foreground space-y-1 mt-1">
                          {reflection.visitors.map((v) => (
                            <li key={v.id}>{v.name}, {v.reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <Label className="text-xs text-muted-foreground">What stood out in the session? What reflections do you have, individually and as a team?</Label>
                <Textarea
                  defaultValue={log.reflection_notes || ""}
                  onBlur={(e) => updateLogField("reflection_notes", e.target.value)}
                  className="rounded-xl mt-1"
                  rows={5}
                />
              </CardContent>
            </Card>
          </>
        )}
      </PermissionGuard>
    </AdminShell>
  );
}
