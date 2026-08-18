import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { startOfMonth, startOfQuarter, startOfYear, subMonths, format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartBarIcon, UsersIcon, BabyIcon, StudentIcon, MagnifyingGlassIcon, WarningIcon, HeartbeatIcon, ArrowRightIcon, DownloadSimpleIcon, FileXlsIcon, CaretDownIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AGE_BANDS, calculateAge, getAgeBand, formatPlayground } from "@/lib/vms";
import { generateListReportPdf } from "@/lib/pdf";
import { downloadExcelWorkbook } from "@/lib/excel";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import ExportMenu from "@/components/admin/vms/ExportMenu";

const PROFILE_PATHS: Record<string, string> = { child: "children", parent: "parents", volunteer: "volunteers" };

const PRESETS = [
  { key: "month", label: "This Month", start: () => startOfMonth(new Date()) },
  { key: "quarter", label: "This Quarter", start: () => startOfQuarter(new Date()) },
  { key: "6months", label: "6 Months", start: () => subMonths(new Date(), 6) },
  { key: "year", label: "This Year", start: () => startOfYear(new Date()) },
] as const;

const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

export default function VmsReports() {
  const playgroundFilter = usePlaygroundFilter();
  const [preset, setPreset] = useState<string>("month");
  const [fromDate, setFromDate] = useState(toISODate(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(toISODate(new Date()));
  const [children, setChildren] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [childSearch, setChildSearch] = useState("");
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [exportingFullReport, setExportingFullReport] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      let query = supabase.from("children").select("id, date_of_birth, playground").is("archived_at", null);
      if (playgroundFilter !== "all") query = query.eq("playground", playgroundFilter);
      const { data } = await query;
      setChildren(data || []);
    };
    fetchChildren();
  }, [playgroundFilter]);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      let attendanceQuery = supabase
        .from("attendance")
        .select("id, child_id, parent_id, volunteer_id, service, attended_on, playground, children(first_name, last_name), parents(first_name, last_name, playground)")
        .gte("attended_on", fromDate)
        .lte("attended_on", toDate);
      let incidentQuery = supabase
        .from("incidents")
        .select("*")
        .gte("occurred_on", fromDate)
        .lte("occurred_on", toDate)
        .order("occurred_on", { ascending: false });
      let visitorQuery = supabase
        .from("adult_visitors")
        .select("*, external_visitors(organisation)")
        .gte("visit_date", fromDate)
        .lte("visit_date", toDate)
        .order("visit_date", { ascending: false });
      if (playgroundFilter !== "all") {
        attendanceQuery = attendanceQuery.eq("playground", playgroundFilter);
        incidentQuery = incidentQuery.eq("playground", playgroundFilter);
        visitorQuery = visitorQuery.eq("playground", playgroundFilter);
      }
      const [{ data: attendanceData }, { data: incidentData }, { data: visitorData }] = await Promise.all([attendanceQuery, incidentQuery, visitorQuery]);
      setAttendance(attendanceData || []);
      setIncidents(incidentData || []);
      setVisitors(visitorData || []);
      setLoading(false);
    };
    fetchAttendance();
  }, [fromDate, toDate, playgroundFilter]);

  const applyPreset = (key: typeof PRESETS[number]["key"]) => {
    setPreset(key);
    const p = PRESETS.find((x) => x.key === key);
    if (p) {
      setFromDate(toISODate(p.start()));
      setToDate(toISODate(new Date()));
    }
  };

  const ageBandCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(AGE_BANDS.map((b) => [b, 0]));
    children.forEach((c) => { counts[getAgeBand(calculateAge(c.date_of_birth))]++; });
    return counts;
  }, [children]);
  const maxBandCount = Math.max(...Object.values(ageBandCounts), 1);

  const playgroundVisits = attendance.filter((a) => a.child_id && a.service === "playground").length;
  const youthVisits = attendance.filter((a) => a.child_id && a.service === "youth_club").length;
  const parentVisits = attendance.filter((a) => a.parent_id).length;
  const totalVisits = attendance.length;

  const perChildCounts = useMemo(() => {
    const map: Record<string, { id: string; name: string; count: number }> = {};
    attendance.forEach((a) => {
      if (!a.child_id || !a.children) return;
      const key = a.child_id;
      const name = `${a.children.first_name} ${a.children.last_name}`;
      if (!map[key]) map[key] = { id: a.child_id, name, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendance]);

  const childVisitDates = (childId: string) =>
    attendance
      .filter((a) => a.child_id === childId)
      .map((a) => ({ date: a.attended_on, service: a.service }))
      .sort((a, b) => b.date.localeCompare(a.date));

  const filteredChildCounts = perChildCounts.filter((c) =>
    !childSearch || c.name.toLowerCase().includes(childSearch.toLowerCase())
  );

  const accidentCount = incidents.filter((i) => i.incident_type === "accident").length;
  const medicalCount = incidents.filter((i) => i.incident_type === "medical_emergency").length;

  // Every drill-down link carries the current playground scope, so the destination stays consistent.
  const playgroundParam = playgroundFilter !== "all" ? `&playground=${playgroundFilter}` : "";
  const rangeParams = `from=${fromDate}&to=${toDate}${playgroundParam}`;
  const rangeLabel = `${format(new Date(fromDate), "d MMM yyyy")} - ${format(new Date(toDate), "d MMM yyyy")}`;

  // Shared source data for the combined "Full Report" (PDF + Excel), so the two formats can never disagree.
  const fullReportSections = () => [
    {
      name: "Age Bands", heading: "Active Children by Age Band",
      columns: ["Age Band", "Count"],
      rows: AGE_BANDS.map((b) => [b, ageBandCounts[b]]),
    },
    {
      name: "Attendance", heading: `Attendance (${attendance.length})`,
      columns: ["Name", "Type", "Service", "Date", "Playground"],
      rows: attendance.map((a: any) => [
        a.children ? `${a.children.first_name} ${a.children.last_name}` : a.parents ? `${a.parents.first_name} ${a.parents.last_name}` : "-",
        a.child_id ? "Child" : "Parent",
        a.service === "youth_club" ? "Youth Club" : "Playground",
        format(new Date(a.attended_on), "d MMM yyyy"),
        formatPlayground(a.playground || a.parents?.playground || null),
      ]),
    },
    {
      name: "Incidents", heading: `Incidents (${incidents.length})`,
      columns: ["Date", "Type", "Person", "Person Type", "What Happened", "Action Taken", "Parent Notified", "Follow-up"],
      rows: incidents.map((i: any) => [
        format(new Date(i.occurred_on), "d MMM yyyy"),
        i.incident_type === "accident" ? "Accident" : "Medical Emergency",
        i.person_name, i.person_type, i.description, i.action_taken || "",
        i.parent_notified ? "Yes" : "No",
        i.follow_up_required ? (i.follow_up_notes || "Yes") : "No",
      ]),
    },
    {
      name: "Visitors", heading: `External Visitors (${visitors.length})`,
      columns: ["Name", "Organisation", "Reason", "Date", "Playground"],
      rows: visitors.map((v: any) => [v.name, v.external_visitors?.organisation || "", v.reason, format(new Date(v.visit_date), "d MMM yyyy"), formatPlayground(v.playground)]),
    },
  ];

  const handleExportFullReportPdf = async () => {
    setExportingFullReport(true);
    try {
      const sections = fullReportSections();
      await generateListReportPdf("Full_Report", "Full Report", rangeLabel, sections.map((s) => ({ heading: s.heading, columns: s.columns, rows: s.rows })));
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExportingFullReport(false);
  };

  const handleExportFullReportExcel = () => {
    const sections = fullReportSections();
    downloadExcelWorkbook("WAPM_Full_Report.xlsx", sections.map((s) => ({ name: s.name, headers: s.columns, rows: s.rows })));
  };

  return (
    <AdminShell title="Reports" breadcrumb="Dashboard > Visitor Management > Reports">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  preset === p.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPreset("custom"); }} className="rounded-[10px] mt-1 h-9" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPreset("custom"); }} className="rounded-[10px] mt-1 h-9" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
          <PlaygroundFilter />
          <ExportMenu
            disabled={loading || exportingFullReport}
            options={[
              { label: "Full Report (Excel)", icon: <FileXlsIcon className="w-4 h-4" />, onClick: handleExportFullReportExcel },
              { label: exportingFullReport ? "Generating..." : "Full Report (PDF)", icon: <DownloadSimpleIcon className="w-4 h-4" />, onClick: handleExportFullReportPdf },
            ]}
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link to={`/admin/vms/attendance?${rangeParams}&service=playground&type=child`}>
            <Card className="rounded-2xl border-admin-border hover:-translate-y-0.5 transition-transform">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BabyIcon className="w-6 h-6 text-primary" weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Playground Visits</p>
                  <p className="text-2xl font-bold text-foreground">{loading ? "..." : playgroundVisits.toLocaleString()}</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link to={`/admin/vms/attendance?${rangeParams}&service=youth_club&type=child`}>
            <Card className="rounded-2xl border-admin-border hover:-translate-y-0.5 transition-transform">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <StudentIcon className="w-6 h-6 text-accent" weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Youth Club Visits</p>
                  <p className="text-2xl font-bold text-foreground">{loading ? "..." : youthVisits.toLocaleString()}</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link to={`/admin/vms/attendance?${rangeParams}&type=parent`}>
            <Card className="rounded-2xl border-admin-border hover:-translate-y-0.5 transition-transform">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-wapm-pink/10 flex items-center justify-center shrink-0">
                  <UsersIcon className="w-6 h-6 text-wapm-pink" weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Parent Visits</p>
                  <p className="text-2xl font-bold text-foreground">{loading ? "..." : parentVisits.toLocaleString()}</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Total visits {format(new Date(fromDate), "d MMM yyyy")} to {format(new Date(toDate), "d MMM yyyy")}: <strong className="text-foreground">{totalVisits.toLocaleString()}</strong>
        </p>

        {/* Age band headcount (current active children, not date-ranged) */}
        <Card className="rounded-2xl border-admin-border mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2"><ChartBarIcon className="w-4 h-4" /> Active Children by Age Band</h3>
            <p className="text-xs text-muted-foreground mb-4">Current snapshot, not affected by the date range above.</p>
            <div className="space-y-3">
              {AGE_BANDS.map((band) => (
                <Link key={band} to={`/admin/vms/children?ageBand=${band}${playgroundParam}`} className="flex items-center gap-3 group -mx-2 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors">
                  <span className="text-xs text-muted-foreground w-12 shrink-0 group-hover:text-primary">{band}</span>
                  <div className="flex-1 h-2 rounded-full bg-primary/10 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(ageBandCounts[band] / maxBandCount) * 100}%` }} />
                  </div>
                  <span className="text-sm text-foreground tabular-nums w-8 text-right shrink-0">{ageBandCounts[band]}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Incidents within the selected range */}
        <Card className="rounded-2xl border-admin-border mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Incidents (selected range)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Link to={`/admin/vms/incidents?type=accident&${rangeParams}`} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
                <WarningIcon className="w-5 h-5 text-amber-600 shrink-0" weight="fill" />
                <div>
                  <p className="text-xl font-bold text-foreground">{loading ? "..." : accidentCount}</p>
                  <p className="text-xs text-muted-foreground">Accidents</p>
                </div>
              </Link>
              <Link to={`/admin/vms/incidents?type=medical_emergency&${rangeParams}`} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                <HeartbeatIcon className="w-5 h-5 text-red-600 shrink-0" weight="fill" />
                <div>
                  <p className="text-xl font-bold text-foreground">{loading ? "..." : medicalCount}</p>
                  <p className="text-xs text-muted-foreground">Medical Emergencies</p>
                </div>
              </Link>
            </div>
            {incidents.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {incidents.map((i) => {
                  const fkId = i.child_id || i.parent_id || i.volunteer_id;
                  const profilePath = PROFILE_PATHS[i.person_type];
                  return (
                    <div key={i.id} className="flex items-center justify-between text-sm py-1.5 border-b border-admin-border/60 last:border-0">
                      {fkId && profilePath ? (
                        <Link to={`/admin/vms/${profilePath}/${fkId}`} className="text-foreground hover:text-primary transition-colors">
                          {i.person_name} <span className="text-muted-foreground capitalize">({i.person_type})</span>
                        </Link>
                      ) : (
                        <span className="text-foreground">{i.person_name} <span className="text-muted-foreground capitalize">({i.person_type})</span></span>
                      )}
                      <span className="text-muted-foreground text-xs">{new Date(i.occurred_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-child visit counts within the selected range */}
        <Card className="rounded-2xl border-admin-border">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Visits per Child (selected range)</h3>
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name..." value={childSearch} onChange={(e) => setChildSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filteredChildCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits recorded in this range.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {filteredChildCounts.map((c) => {
                  const expanded = expandedChildId === c.id;
                  return (
                    <div key={c.id} className="border-b border-admin-border/60 last:border-0">
                      <button
                        onClick={() => setExpandedChildId(expanded ? null : c.id)}
                        className="w-full flex items-center justify-between text-sm py-1.5 hover:text-primary transition-colors text-left"
                      >
                        <span className="text-foreground">{c.name}</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums shrink-0">
                          {c.count} visit{c.count === 1 ? "" : "s"}
                          <CaretDownIcon className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
                        </span>
                      </button>
                      {expanded && (
                        <div className="pb-3 pl-2">
                          <ul className="space-y-1 mb-2">
                            {childVisitDates(c.id).map((v, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-center justify-between pr-1">
                                <span>{format(new Date(v.date), "EEE d MMM yyyy")}</span>
                                <span>{v.service === "youth_club" ? "Youth Club" : "Playground"}</span>
                              </li>
                            ))}
                          </ul>
                          <Link
                            to={`/admin/vms/report/child/${c.id}?from=${fromDate}&to=${toDate}`}
                            className="text-xs text-primary hover:text-accent inline-flex items-center gap-1"
                          >
                            View Full Report <ArrowRightIcon className="w-3 h-3" weight="bold" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </AdminShell>
  );
}
