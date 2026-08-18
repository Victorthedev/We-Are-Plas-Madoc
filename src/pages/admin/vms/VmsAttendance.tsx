import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MagnifyingGlassIcon, CheckCircleIcon, BabyIcon, UserListIcon, HandshakeIcon, CaretLeftIcon, CaretRightIcon, CaretDownIcon, ClockCounterClockwiseIcon, DownloadSimpleIcon, FileCsvIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPlayground, isYouthClubAge, downloadCsv } from "@/lib/vms";
import { generateListReportPdf } from "@/lib/pdf";
import { startOfWeek, endOfWeek, addDays, addWeeks, eachDayOfInterval, format, isSameDay } from "date-fns";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import FilterDisclosure from "@/components/admin/vms/FilterDisclosure";
import ExportMenu from "@/components/admin/vms/ExportMenu";

type Person = { id: string; first_name: string; last_name: string; type: "child" | "parent" | "volunteer"; playground: string | null; dateOfBirth?: string };
type TypeFilter = "all" | "playground" | "youth_club" | "parent" | "volunteer";
const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "playground", label: "Children (Playground)" },
  { key: "youth_club", label: "Youth Club" },
  { key: "parent", label: "Parents" },
  { key: "volunteer", label: "Volunteers" },
];

export default function VmsAttendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playgroundFilter = usePlaygroundFilter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [todaysAttendance, setTodaysAttendance] = useState<any[]>([]);
  const [marking, setMarking] = useState<string | null>(null);

  const [shiftTarget, setShiftTarget] = useState<Person | null>(null);
  const [shiftFrom, setShiftFrom] = useState("");
  const [shiftTo, setShiftTo] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [shiftAccident, setShiftAccident] = useState(false);
  const [shiftMedical, setShiftMedical] = useState(false);
  const [savingShift, setSavingShift] = useState(false);

  // A ?from=&to= link (e.g. from Reports) drops the visitor straight into a
  // fixed-range view instead of the default "today" screen.
  const linkedFrom = searchParams.get("from");
  const linkedTo = searchParams.get("to");
  const linkedService = searchParams.get("service");
  const linkedType = searchParams.get("type"); // "child" | "parent", scoping the range view to one person type
  const initialTypeFilter: TypeFilter =
    linkedType === "parent" ? "parent"
    : linkedService === "youth_club" ? "youth_club"
    : linkedService === "playground" ? "playground"
    : "all";
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialTypeFilter);
  const [viewMode, setViewMode] = useState<"live" | "history">(linkedFrom && linkedTo ? "history" : "live");
  const [historyScope, setHistoryScope] = useState<"day" | "week" | "range">(linkedFrom && linkedTo ? "range" : "day");
  const [historyDate, setHistoryDate] = useState(new Date());
  const [rangeFrom] = useState(linkedFrom || "");
  const [rangeTo] = useState(linkedTo || "");
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedAttendanceKey, setExpandedAttendanceKey] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: children }, { data: parents }, { data: volunteers }, { data: attendance }] = await Promise.all([
      supabase.from("children").select("id, first_name, last_name, playground, date_of_birth").is("archived_at", null),
      supabase.from("parents").select("id, first_name, last_name, playground"),
      supabase.from("volunteers").select("id, first_name, last_name").eq("status", "accepted"),
      supabase.from("attendance").select("id, child_id, parent_id, volunteer_id, service, playground, children(first_name, last_name), parents(first_name, last_name, playground), volunteers(first_name, last_name)").eq("attended_on", today),
    ]);
    const merged: Person[] = [
      ...(children || []).map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, type: "child" as const, playground: c.playground, dateOfBirth: c.date_of_birth })),
      ...(parents || []).map((p) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, type: "parent" as const, playground: p.playground })),
      ...(volunteers || []).map((v) => ({ id: v.id, first_name: v.first_name, last_name: v.last_name, type: "volunteer" as const, playground: null })),
    ].sort((a, b) => a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name));
    setPeople(merged);
    setTodaysAttendance(attendance || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Keyed by `${id}-${service}` for children (a youth-age child can be present at both
  // services same day); just `${id}` for parents; volunteers can log multiple shifts,
  // so they're never in this "already present" set.
  const presentKeys = useMemo(() => new Set(
    todaysAttendance.filter((a) => !a.volunteer_id).map((a) => a.child_id ? `${a.child_id}-${a.service}` : `${a.parent_id}`)
  ), [todaysAttendance]);

  const matchesPlaygroundFilter = (a: any) =>
    playgroundFilter === "all" || !!a.volunteer_id || (a.playground || a.parents?.playground) === playgroundFilter;
  const visibleTodaysAttendance = todaysAttendance.filter(matchesPlaygroundFilter);

  const filtered = search.trim().length === 0 ? [] : people.filter((p) => {
    if (playgroundFilter !== "all" && p.type !== "volunteer" && p.playground !== playgroundFilter) return false;
    return `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase());
  });

  const markPresent = async (person: Person, service: "playground" | "youth_club" = "playground") => {
    const key = person.type === "child" ? `${person.id}-${service}` : person.id;
    if (presentKeys.has(key) || !user) return;
    setMarking(key);
    const payload = person.type === "child"
      ? { child_id: person.id, playground: person.playground, service, recorded_by: user.id }
      : { parent_id: person.id, playground: person.playground, recorded_by: user.id };

    const { error } = await supabase.from("attendance").insert(payload);
    setMarking(null);

    if (error) {
      if (error.code === "23505") toast.error(`${person.first_name} is already marked present today`);
      else toast.error(error.message);
      return;
    }
    toast.success(`${person.first_name} ${person.last_name} marked present${person.type === "child" ? ` (${service === "youth_club" ? "Youth Club" : "Playground"})` : ""}`);
    fetchAll();
  };

  const openShiftLog = (volunteer: Person) => {
    setShiftTarget(volunteer);
    setShiftFrom("");
    setShiftTo("");
    setShiftNotes("");
    setShiftAccident(false);
    setShiftMedical(false);
  };

  const saveShift = async () => {
    if (!shiftTarget || !user) return;
    setSavingShift(true);
    const { error } = await supabase.from("attendance").insert({
      volunteer_id: shiftTarget.id,
      check_in_time: shiftFrom || null,
      check_out_time: shiftTo || null,
      activity_notes: shiftNotes || null,
      recorded_by: user.id,
    });
    setSavingShift(false);

    if (error) { toast.error(error.message); return; }

    toast.success(`Shift logged for ${shiftTarget.first_name} ${shiftTarget.last_name}`);
    const needsIncident = shiftAccident || shiftMedical;
    const target = shiftTarget;
    setShiftTarget(null);
    fetchAll();

    if (needsIncident) {
      navigate("/admin/vms/incidents", {
        state: {
          prefill: {
            person_type: "volunteer",
            person_name: `${target.first_name} ${target.last_name}`,
            volunteer_id: target.id,
            incident_type: shiftAccident ? "accident" : "medical_emergency",
          },
        },
      });
    }
  };

  const weekStart = startOfWeek(historyDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(historyDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const rangeStart = historyScope === "range" ? rangeFrom : historyScope === "day" ? format(historyDate, "yyyy-MM-dd") : format(weekStart, "yyyy-MM-dd");
    const rangeEnd = historyScope === "range" ? rangeTo : historyScope === "day" ? format(historyDate, "yyyy-MM-dd") : format(weekEnd, "yyyy-MM-dd");
    const { data } = await supabase
      .from("attendance")
      .select("id, child_id, parent_id, volunteer_id, service, attended_on, check_in_time, check_out_time, playground, children(first_name, last_name), parents(first_name, last_name, playground), volunteers(first_name, last_name)")
      .gte("attended_on", rangeStart)
      .lte("attended_on", rangeEnd)
      .order("attended_on");
    setHistoryRecords(data || []);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (viewMode === "history") fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, historyScope, historyDate]);

  const recordLabel = (a: any) => {
    const name = a.children ? `${a.children.first_name} ${a.children.last_name}`
      : a.parents ? `${a.parents.first_name} ${a.parents.last_name}`
      : `${a.volunteers?.first_name} ${a.volunteers?.last_name}`;
    const suffix = a.children && a.service === "youth_club" ? " (Youth Club)" : a.volunteer_id ? " (Volunteer shift)" : "";
    return `${name}${suffix}`;
  };

  const recordProfilePath = (a: any) =>
    a.child_id ? `/admin/vms/children/${a.child_id}`
      : a.parent_id ? `/admin/vms/parents/${a.parent_id}`
      : a.volunteer_id ? `/admin/vms/volunteers/${a.volunteer_id}`
      : null;

  const shiftHistoryDay = (days: number) => setHistoryDate((d) => historyScope === "week" ? addWeeks(d, days) : addDays(d, days));

  const matchesTypeFilter = (a: any) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "volunteer") return !!a.volunteer_id;
    if (typeFilter === "parent") return !!a.parent_id;
    if (typeFilter === "playground") return !!a.child_id && a.service === "playground";
    return !!a.child_id && a.service === "youth_club"; // typeFilter === "youth_club"
  };

  const visibleHistoryRecords = historyRecords
    .filter(matchesPlaygroundFilter)
    .filter(matchesTypeFilter);

  const historyRangeLabel = historyScope === "range"
    ? `${format(new Date(rangeFrom), "d MMM yyyy")} - ${format(new Date(rangeTo), "d MMM yyyy")}`
    : historyScope === "week"
      ? `${format(weekStart, "d MMM")} - ${format(weekEnd, "d MMM yyyy")}`
      : format(historyDate, "d MMM yyyy");
  const groupedAttendance = () => {
    const groups = new Map<string, { key: string; name: string; type: string; service: string; profilePath: string | null; dates: string[]; playgrounds: Set<string> }>();
    visibleHistoryRecords.forEach((a: any) => {
      const personId = a.child_id || a.parent_id || a.volunteer_id;
      const service = a.volunteer_id ? "Shift" : a.service === "youth_club" ? "Youth Club" : "Playground";
      const key = `${personId}-${service}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: recordLabel(a).replace(/ \((Youth Club|Volunteer shift)\)$/, ""),
          type: a.child_id ? "Child" : a.parent_id ? "Parent" : "Volunteer",
          service,
          profilePath: recordProfilePath(a),
          dates: [],
          playgrounds: new Set(),
        });
      }
      const g = groups.get(key)!;
      g.dates.push(a.attended_on);
      g.playgrounds.add(formatPlayground(a.playground || a.parents?.playground || null));
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const attendanceExportColumns = ["Name", "Type", "Service", "Visits", "Dates", "Playground"];
  const attendanceExportRows = () => groupedAttendance().map((g) => [
    g.name, g.type, g.service, g.dates.length,
    g.dates.map((d) => format(new Date(d), "d MMM yyyy")).join(", "),
    Array.from(g.playgrounds).join(", "),
  ]);
  const handleExportAttendancePdf = async () => {
    setExporting(true);
    try {
      const rows = attendanceExportRows();
      await generateListReportPdf("Attendance", "Attendance", historyRangeLabel, [{ heading: `${visibleHistoryRecords.length} visit${visibleHistoryRecords.length === 1 ? "" : "s"} across ${rows.length} ${rows.length === 1 ? "person" : "people"}`, columns: attendanceExportColumns, rows }]);
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExporting(false);
  };
  const handleExportAttendanceCsv = () => downloadCsv("WAPM_Attendance.csv", attendanceExportColumns, attendanceExportRows());

  return (
    <AdminShell title="Attendance" breadcrumb="Dashboard > Visitor Management > Attendance">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode("live")}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              viewMode === "live" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
          >
            Live Check-In
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-1.5",
              viewMode === "history" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
          >
            <ClockCounterClockwiseIcon className="w-4 h-4" /> Browse History
          </button>
        </div>

        {viewMode === "live" && (
        <>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-2">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <PlaygroundFilter />
        </div>
        {playgroundFilter !== "all" && (
          <p className="text-xs text-muted-foreground mb-4">Volunteers aren't tied to one playground, so they always show regardless of this filter.</p>
        )}

        <div className="relative mb-6">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search a name to mark present..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl h-12 text-base"
            autoFocus
          />
        </div>

        {search.trim().length > 0 && (
          <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)] mb-6">
            <CardContent className="p-0 divide-y divide-admin-border/60">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No matches</div>
              ) : (
                filtered.map((p) => {
                  const youthEligible = p.type === "child" && p.dateOfBirth && isYouthClubAge(p.dateOfBirth);
                  const playgroundPresent = presentKeys.has(p.type === "child" ? `${p.id}-playground` : p.id);
                  const youthPresent = presentKeys.has(`${p.id}-youth_club`);

                  return (
                    <div key={`${p.type}-${p.id}`} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                          p.type === "child" ? "bg-primary/10 text-primary" : p.type === "parent" ? "bg-accent/10 text-accent" : "bg-wapm-pink/10 text-wapm-pink"
                        )}>
                          {p.type === "child" ? <BabyIcon className="w-4 h-4" /> : p.type === "parent" ? <UserListIcon className="w-4 h-4" /> : <HandshakeIcon className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.type}{p.playground ? ` · ${formatPlayground(p.playground)}` : ""}</p>
                        </div>
                      </div>

                      {p.type === "volunteer" ? (
                        <Button size="sm" variant="outline" onClick={() => openShiftLog(p)} className="shrink-0 h-8 rounded-full border-primary/20 text-primary">
                          Log Shift
                        </Button>
                      ) : youthEligible ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => markPresent(p, "playground")}
                            disabled={playgroundPresent || marking === `${p.id}-playground`}
                            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                              playgroundPresent ? "bg-green-50 border-green-200 text-green-700" : "border-primary/20 text-primary hover:bg-primary/5"
                            )}
                          >
                            {playgroundPresent ? <span className="inline-flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5" weight="fill" /> Playground</span> : "Playground"}
                          </button>
                          <button
                            onClick={() => markPresent(p, "youth_club")}
                            disabled={youthPresent || marking === `${p.id}-youth_club`}
                            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                              youthPresent ? "bg-green-50 border-green-200 text-green-700" : "border-primary/20 text-primary hover:bg-primary/5"
                            )}
                          >
                            {youthPresent ? <span className="inline-flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5" weight="fill" /> Youth Club</span> : "Youth Club"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => markPresent(p)}
                          disabled={playgroundPresent || marking === (p.type === "child" ? `${p.id}-playground` : p.id)}
                          className="shrink-0"
                        >
                          {playgroundPresent ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                              <CheckCircleIcon className="w-4 h-4" weight="fill" /> Present
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-primary">{marking ? "Marking..." : "Tap to mark present"}</span>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Present today ({visibleTodaysAttendance.length})</h3>
          {visibleTodaysAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one marked present yet today.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleTodaysAttendance.map((a) => {
                const path = recordProfilePath(a);
                const pillClass = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors";
                const content = <><CheckCircleIcon className="w-3.5 h-3.5" weight="fill" /> {recordLabel(a)}</>;
                return path ? (
                  <Link key={a.id} to={path} className={pillClass}>{content}</Link>
                ) : (
                  <span key={a.id} className={pillClass}>{content}</span>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}

        {viewMode === "history" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            {historyScope === "range" ? (
              <>
                <span className="text-sm font-medium text-foreground">
                  {format(new Date(rangeFrom), "d MMM yyyy")} - {format(new Date(rangeTo), "d MMM yyyy")}
                  {typeFilter !== "all" && ` · ${TYPE_FILTERS.find((t) => t.key === typeFilter)?.label}`}
                </span>
                <Button variant="outline" size="sm" onClick={() => { setHistoryScope("day"); setHistoryDate(new Date()); }} className="rounded-full border-admin-border">
                  Back to Today
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryScope("day")}
                    className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      historyScope === "day" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setHistoryScope("week")}
                    className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      historyScope === "week" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
                  >
                    Week
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="icon" variant="outline" onClick={() => shiftHistoryDay(-1)} className="rounded-full border-admin-border h-9 w-9 shrink-0" aria-label="Previous">
                    <CaretLeftIcon className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-foreground text-center">
                    {historyScope === "day"
                      ? format(historyDate, "EEEE d MMMM yyyy")
                      : `${format(weekStart, "d MMM")} - ${format(weekEnd, "d MMM yyyy")}`}
                  </span>
                  <Button size="icon" variant="outline" onClick={() => shiftHistoryDay(1)} className="rounded-full border-admin-border h-9 w-9 shrink-0" aria-label="Next">
                    <CaretRightIcon className="w-4 h-4" />
                  </Button>
                  {!isSameDay(historyDate, new Date()) && (
                    <Button variant="outline" size="sm" onClick={() => setHistoryDate(new Date())} className="rounded-full border-admin-border shrink-0">
                      Today
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            {TYPE_FILTERS.map((t) => (
              <button key={t.key} onClick={() => setTypeFilter(t.key)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  typeFilter === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <FilterDisclosure>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <PlaygroundFilter compact />
              {historyScope !== "week" && (
                <ExportMenu
                  disabled={visibleHistoryRecords.length === 0 || exporting}
                  options={[
                    { label: "Export CSV", icon: <FileCsvIcon className="w-4 h-4" />, onClick: handleExportAttendanceCsv },
                    { label: exporting ? "Generating..." : "Download PDF", icon: <DownloadSimpleIcon className="w-4 h-4" />, onClick: handleExportAttendancePdf },
                  ]}
                />
              )}
            </div>
          </FilterDisclosure>

          {historyScope !== "week" ? (
            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-0">
                {historyLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : visibleHistoryRecords.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No attendance recorded in this range.</div>
                ) : (
                  <div className="divide-y divide-admin-border/60">
                    {groupedAttendance().map((g) => {
                      const expanded = expandedAttendanceKey === g.key;
                      return (
                        <div key={g.key} className="px-4">
                          <button
                            onClick={() => setExpandedAttendanceKey(expanded ? null : g.key)}
                            className="w-full flex items-center justify-between gap-3 py-3 text-left hover:text-primary transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircleIcon className="w-3.5 h-3.5 text-primary shrink-0" weight="fill" />
                              <span className="text-sm font-medium text-foreground truncate">{g.name}</span>
                              {g.service !== "Playground" && <span className="text-xs text-muted-foreground shrink-0">({g.service})</span>}
                            </div>
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                              {g.dates.length} visit{g.dates.length === 1 ? "" : "s"}
                              <CaretDownIcon className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
                            </span>
                          </button>
                          {expanded && (
                            <div className="pb-3 pl-6">
                              <ul className="space-y-1 mb-2">
                                {g.dates.slice().sort((a, b) => b.localeCompare(a)).map((d, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">{format(new Date(d), "EEE d MMM yyyy")}</li>
                                ))}
                              </ul>
                              {g.profilePath && (
                                <Link to={g.profilePath} className="text-xs text-primary hover:text-accent inline-flex items-center gap-1">
                                  View Profile <ArrowRightIcon className="w-3 h-3" weight="bold" />
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-0">
                {historyLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : (
                  <div className="divide-y divide-admin-border/60">
                    {weekDays.map((day) => {
                      const dayRecords = visibleHistoryRecords.filter((a) => isSameDay(new Date(a.attended_on), day));
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => { setHistoryDate(day); setHistoryScope("day"); }}
                          className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/50"
                        >
                          <span className={cn("text-sm font-medium", isSameDay(day, new Date()) ? "text-primary" : "text-foreground")}>
                            {format(day, "EEEE d MMMM")}
                          </span>
                          <span className="text-sm text-muted-foreground">{dayRecords.length === 0 ? "No attendance" : `${dayRecords.length} recorded`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
        )}

        {/* Volunteer shift log */}
        <Dialog open={!!shiftTarget} onOpenChange={(o) => !o && setShiftTarget(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Log Shift for {shiftTarget?.first_name} {shiftTarget?.last_name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs">From</Label><Input type="time" value={shiftFrom} onChange={e => setShiftFrom(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label className="text-xs">To</Label><Input type="time" value={shiftTo} onChange={e => setShiftTo(e.target.value)} className="rounded-[10px] mt-1" /></div>
              </div>
              <div>
                <Label className="text-xs">What did they do?</Label>
                <Textarea value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} className="rounded-xl mt-1" rows={3} />
              </div>
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="flex items-center gap-2">
                  <Checkbox checked={shiftAccident} onCheckedChange={(c) => setShiftAccident(!!c)} />
                  <span className="text-sm">There was an accident during this shift</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={shiftMedical} onCheckedChange={(c) => setShiftMedical(!!c)} />
                  <span className="text-sm">There was a medical emergency during this shift</span>
                </label>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShiftTarget(null)} className="rounded-full">Cancel</Button>
              <Button onClick={saveShift} disabled={savingShift} className="rounded-full bg-primary text-primary-foreground">
                {savingShift ? "Saving..." : (shiftAccident || shiftMedical) ? "Save & Log Incident" : "Save Shift"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
