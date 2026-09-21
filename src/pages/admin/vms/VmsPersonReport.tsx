import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { startOfMonth, startOfQuarter, startOfYear, subMonths, format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeftIcon, DownloadSimpleIcon, FileCsvIcon, CalendarBlankIcon,
  CheckCircleIcon, XCircleIcon, ClockCounterClockwiseIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchPersonReport, downloadCsv, type ReportPersonType, type PersonReportEntry } from "@/lib/vms";
import { generatePersonReportPdf } from "@/lib/pdf";
import ExportMenu from "@/components/admin/vms/ExportMenu";

const PRESETS = [
  { key: "month", label: "This Month", start: () => startOfMonth(new Date()) },
  { key: "quarter", label: "This Quarter", start: () => startOfQuarter(new Date()) },
  { key: "6months", label: "6 Months", start: () => subMonths(new Date(), 6) },
  { key: "year", label: "This Year", start: () => startOfYear(new Date()) },
] as const;

const TABLE_BY_TYPE = { child: "children", parent: "parents", volunteer: "volunteers" } as const;
const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

export default function VmsPersonReport() {
  const { personType, id } = useParams<{ personType: ReportPersonType; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [personName, setPersonName] = useState("");
  const [preset, setPreset] = useState<string>(searchParams.get("from") ? "custom" : "month");
  const [fromDate, setFromDate] = useState(searchParams.get("from") || toISODate(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(searchParams.get("to") || toISODate(new Date()));
  const [entries, setEntries] = useState<PersonReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [lookupDate, setLookupDate] = useState(toISODate(new Date()));
  const [lookupResult, setLookupResult] = useState<boolean | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (!personType || !id) return;
    const table = TABLE_BY_TYPE[personType];
    supabase.from(table).select("first_name, last_name").eq("id", id).maybeSingle().then(({ data }: any) => {
      if (data) setPersonName(`${data.first_name} ${data.last_name}`);
    });
  }, [personType, id]);

  useEffect(() => {
    if (!personType || !id) return;
    setLoading(true);
    fetchPersonReport(personType, id, fromDate, toDate).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, [personType, id, fromDate, toDate]);

  const applyPreset = (key: typeof PRESETS[number]["key"]) => {
    setPreset(key);
    const p = PRESETS.find((x) => x.key === key);
    if (p) {
      setFromDate(toISODate(p.start()));
      setToDate(toISODate(new Date()));
    }
  };

  const runLookup = async () => {
    if (!personType || !id) return;
    setLookupLoading(true);
    const data = await fetchPersonReport(personType, id, lookupDate, lookupDate);
    setLookupResult(data.length > 0);
    setLookupLoading(false);
  };

  const dateRangeLabel = `${format(new Date(fromDate), "d MMM yyyy")} - ${format(new Date(toDate), "d MMM yyyy")}`;

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      await generatePersonReportPdf(personName, dateRangeLabel, entries);
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setGenerating(false);
  };

  const handleExportCsv = () => {
    downloadCsv(
      `WAPM_Attendance_Report_${personName.replace(/[^a-z0-9]+/gi, "_")}.csv`,
      ["Date", "Type", "Incident"],
      entries.map((e) => [
        format(new Date(e.date), "d MMM yyyy"),
        e.label,
        e.incident ? `${e.incident.incidentType === "accident" ? "Accident" : "Medical Emergency"}: ${e.incident.description}` : "None recorded",
      ])
    );
  };

  return (
    <AdminShell title={personName ? `Report: ${personName}` : "Attendance Report"} breadcrumb="Dashboard > Visitor Management > Report">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-primary mb-6"><ArrowLeftIcon className="w-4 h-4 mr-1" /> Back</Button>

        <Card className="rounded-2xl border-admin-border mb-6">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarBlankIcon className="w-4 h-4 text-primary" /> Was {personName || "this person"} present on a specific day?
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={lookupDate} onChange={(e) => { setLookupDate(e.target.value); setLookupResult(null); }} className="rounded-[10px] mt-1 h-9" />
              </div>
              <Button onClick={runLookup} disabled={lookupLoading} variant="outline" className="rounded-full border-primary/20 text-primary h-9">
                {lookupLoading ? "Checking..." : "Check"}
              </Button>
              {lookupResult !== null && (
                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                  lookupResult ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
                )}>
                  {lookupResult ? <CheckCircleIcon className="w-4 h-4" weight="fill" /> : <XCircleIcon className="w-4 h-4" />}
                  {lookupResult ? "Present that day" : "Not recorded present"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

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
          <div className="flex items-end gap-2 flex-wrap">
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

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClockCounterClockwiseIcon className="w-4 h-4 text-primary" /> {dateRangeLabel}
          </h3>
          <ExportMenu
            disabled={entries.length === 0 || generating}
            options={[
              { label: "Export CSV", icon: <FileCsvIcon className="w-4 h-4" />, onClick: handleExportCsv },
              { label: generating ? "Generating..." : "Download PDF", icon: <DownloadSimpleIcon className="w-4 h-4" />, onClick: handleDownloadPdf },
            ]}
          />
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No attendance recorded in this range.</div>
            ) : (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-admin-border">
                      <th className="text-left p-4 font-semibold text-foreground">Date</th>
                      <th className="text-left p-4 font-semibold text-foreground">Type</th>
                      <th className="text-left p-4 font-semibold text-foreground">Incident</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={i} className="border-b border-admin-border/60">
                        <td className="p-4 text-foreground">{format(new Date(e.date), "d MMM yyyy")}</td>
                        <td className="p-4 text-muted-foreground">{e.label}</td>
                        <td className="p-4 text-muted-foreground">
                          {e.incident ? (
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", e.incident.incidentType === "accident" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600")}>
                              {e.incident.incidentType === "accident" ? "Accident" : "Medical Emergency"}: {e.incident.description}
                            </span>
                          ) : "None recorded"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && entries.length > 0 && (
              <div className="md:hidden divide-y divide-admin-border/60">
                {entries.map((e, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{format(new Date(e.date), "d MMM yyyy")}</span>
                      <span className="text-xs text-muted-foreground">{e.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.incident ? `${e.incident.incidentType === "accident" ? "Accident" : "Medical Emergency"}: ${e.incident.description}` : "No incident recorded"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </AdminShell>
  );
}
