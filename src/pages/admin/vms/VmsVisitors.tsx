import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { startOfToday, startOfMonth, startOfQuarter, startOfYear, format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, IdentificationBadgeIcon, MagnifyingGlassIcon, XIcon, BuildingsIcon, DownloadSimpleIcon, FileCsvIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PLAYGROUNDS, formatPlayground, downloadCsv } from "@/lib/vms";
import { generateListReportPdf } from "@/lib/pdf";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import FilterDisclosure from "@/components/admin/vms/FilterDisclosure";
import ExportMenu from "@/components/admin/vms/ExportMenu";
import DateRangeFilter from "@/components/admin/vms/DateRangeFilter";

const emptyForm = { name: "", organisation: "", reason: "", visit_date: format(new Date(), "yyyy-MM-dd"), time_from: "", time_to: "", playground: "" };

const DATE_PRESETS = [
  { key: "today", label: "Today", start: () => startOfToday() },
  { key: "month", label: "This Month", start: () => startOfMonth(new Date()) },
  { key: "quarter", label: "This Quarter", start: () => startOfQuarter(new Date()) },
  { key: "year", label: "This Year", start: () => startOfYear(new Date()) },
] as const;
const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

export default function VmsVisitors() {
  const { user } = useAuth();
  const playgroundFilter = usePlaygroundFilter();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [groupBy, setGroupBy] = useState<"visit" | "visitor">("visit");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [exporting, setExporting] = useState(false);

  const [visitorSearch, setVisitorSearch] = useState("");
  const [visitorResults, setVisitorResults] = useState<any[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);

  const fetchVisitors = async () => {
    setLoading(true);
    const { data } = await supabase.from("adult_visitors").select("*, external_visitors(id, name, organisation)").order("visit_date", { ascending: false }).order("created_at", { ascending: false });
    setVisitors(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVisitors(); }, []);

  useEffect(() => {
    if (selectedVisitor || visitorSearch.trim().length < 2) { setVisitorResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("external_visitors")
        .select("id, name, organisation")
        .or(`name.ilike.%${visitorSearch}%,organisation.ilike.%${visitorSearch}%`)
        .limit(6);
      setVisitorResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [visitorSearch, selectedVisitor]);

  const selectVisitor = (v: any) => {
    setSelectedVisitor(v);
    setForm({ ...form, name: v.name, organisation: v.organisation || "" });
    setVisitorResults([]);
  };

  const clearSelectedVisitor = () => {
    setSelectedVisitor(null);
    setForm({ ...form, name: "", organisation: "" });
  };

  const save = async () => {
    if (!form.name.trim() || !form.reason.trim()) {
      toast.error("Name and reason are required");
      return;
    }
    setSaving(true);

    let visitorId = selectedVisitor?.id || null;
    if (!visitorId) {
      const { data: newVisitor, error: visitorError } = await supabase
        .from("external_visitors")
        .insert({ name: form.name.trim(), organisation: form.organisation.trim() || null })
        .select("id")
        .single();
      if (visitorError) { toast.error(visitorError.message); setSaving(false); return; }
      visitorId = newVisitor.id;
    }

    const { error } = await supabase.from("adult_visitors").insert({
      name: form.name.trim(), reason: form.reason.trim(), visit_date: form.visit_date,
      time_from: form.time_from || null, time_to: form.time_to || null, playground: form.playground || null,
      visitor_id: visitorId, logged_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Visitor logged");
    setShowForm(false);
    setForm(emptyForm);
    setSelectedVisitor(null);
    setVisitorSearch("");
    fetchVisitors();
  };

  const formatTime = (t: string | null) => t ? t.slice(0, 5) : "";

  const byPlayground = visitors
    .filter((v) => playgroundFilter === "all" || v.playground === playgroundFilter)
    .filter((v) => !dateFrom || !dateTo || (v.visit_date >= dateFrom && v.visit_date <= dateTo));

  const applyDatePreset = (key: string) => {
    setDatePreset(key);
    if (key === "all") { setDateFrom(""); setDateTo(""); return; }
    const p = DATE_PRESETS.find((x) => x.key === key);
    if (p) { setDateFrom(toISODate(p.start())); setDateTo(toISODate(new Date())); }
  };

  const exportColumns = ["Name", "Organisation", "Reason", "Date", "Playground", "Time"];
  const exportRows = () => byPlayground.map((v) => [
    v.name,
    v.external_visitors?.organisation || "",
    v.reason,
    format(new Date(v.visit_date), "d MMM yyyy"),
    formatPlayground(v.playground),
    (v.time_from || v.time_to) ? `${formatTime(v.time_from)}${v.time_to ? ` - ${formatTime(v.time_to)}` : ""}` : "",
  ]);
  const rangeLabel = dateFrom && dateTo ? `${format(new Date(dateFrom), "d MMM yyyy")} - ${format(new Date(dateTo), "d MMM yyyy")}` : "All time";

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await generateListReportPdf("Visitor_Log", "Visitor Log", rangeLabel, [{ heading: `Visits (${byPlayground.length})`, columns: exportColumns, rows: exportRows() }]);
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExporting(false);
  };

  const handleExportCsv = () => downloadCsv("WAPM_Visitor_Log.csv", exportColumns, exportRows());

  const groupedVisitors = (() => {
    const map: Record<string, { id: string; name: string; organisation: string | null; count: number }> = {};
    let unlinkedCount = 0;
    byPlayground.forEach((v) => {
      if (!v.visitor_id) { unlinkedCount++; return; }
      if (!map[v.visitor_id]) map[v.visitor_id] = { id: v.visitor_id, name: v.external_visitors?.name || v.name, organisation: v.external_visitors?.organisation || null, count: 0 };
      map[v.visitor_id].count++;
    });
    return { groups: Object.values(map).sort((a, b) => b.count - a.count), unlinkedCount };
  })();

  return (
    <AdminShell title="Visitor Log" breadcrumb="Dashboard > Visitor Management > Visitor Log">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <p className="text-sm text-muted-foreground mb-2">For adults on site who aren't registered in the system, e.g. a tradesperson or contractor.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">
          <div><span className="font-bold text-foreground text-lg">{byPlayground.length}</span> <span className="text-muted-foreground">total logged</span></div>
          <div><span className="font-bold text-foreground text-lg">{byPlayground.filter((v) => v.visit_date === format(new Date(), "yyyy-MM-dd")).length}</span> <span className="text-muted-foreground">today</span></div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex gap-2">
            <button onClick={() => setGroupBy("visit")}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                groupBy === "visit" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              By Visit
            </button>
            <button onClick={() => setGroupBy("visitor")}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                groupBy === "visitor" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              By Visitor
            </button>
          </div>
          <Button onClick={() => { setForm(emptyForm); setSelectedVisitor(null); setVisitorSearch(""); setShowForm(true); }} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Log Visitor
          </Button>
        </div>

        <FilterDisclosure>
          <div className="flex flex-wrap gap-3">
            <PlaygroundFilter compact />
            <DateRangeFilter
              presets={DATE_PRESETS}
              value={datePreset}
              onSelectPreset={applyDatePreset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={(v) => { setDateFrom(v); setDatePreset("custom"); }}
              onDateToChange={(v) => { setDateTo(v); setDatePreset("custom"); }}
            />
          </div>
          <ExportMenu
            disabled={byPlayground.length === 0 || exporting}
            options={[
              { label: "Export CSV", icon: <FileCsvIcon className="w-4 h-4" />, onClick: handleExportCsv },
              { label: exporting ? "Generating..." : "Download PDF", icon: <DownloadSimpleIcon className="w-4 h-4" />, onClick: handleExportPdf },
            ]}
          />
        </FilterDisclosure>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : byPlayground.length === 0 ? (
              <div className="p-12 text-center">
                <IdentificationBadgeIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No visitors logged</p>
              </div>
            ) : groupBy === "visit" ? (
              <div className="divide-y divide-admin-border/60">
                {byPlayground.map((v) => (
                  <div key={v.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">{v.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{v.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{new Date(v.visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {(v.time_from || v.time_to) && <p className="text-xs text-muted-foreground">{formatTime(v.time_from)}{v.time_to ? ` - ${formatTime(v.time_to)}` : ""}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {groupedVisitors.groups.map((g) => (
                  <Link key={g.id} to={`/admin/vms/visitors/${g.id}`} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">{g.name}</h3>
                      {g.organisation && <p className="text-xs text-muted-foreground flex items-center gap-1"><BuildingsIcon className="w-3 h-3" /> {g.organisation}</p>}
                    </div>
                    <span className="text-sm text-muted-foreground tabular-nums shrink-0">{g.count} visit{g.count === 1 ? "" : "s"}</span>
                  </Link>
                ))}
                {groupedVisitors.unlinkedCount > 0 && (
                  <div className="p-4 text-xs text-muted-foreground">
                    {groupedVisitors.unlinkedCount} visit{groupedVisitors.unlinkedCount === 1 ? "" : "s"} not yet linked to a visitor record.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Log a Visitor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name * (search or add new)</Label>
                {selectedVisitor ? (
                  <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 rounded-[10px] border border-primary/30 bg-primary/5">
                    <span className="text-sm text-foreground">{selectedVisitor.name}{selectedVisitor.organisation ? ` · ${selectedVisitor.organisation}` : ""}</span>
                    <button onClick={clearSelectedVisitor} className="text-muted-foreground hover:text-destructive" aria-label="Clear selection">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={form.name}
                      onChange={e => { setForm({ ...form, name: e.target.value }); setVisitorSearch(e.target.value); }}
                      className="rounded-[10px] mt-1 pl-9"
                      placeholder="Start typing to search..."
                    />
                  </div>
                )}
                {visitorResults.length > 0 && !selectedVisitor && (
                  <ul className="border border-admin-border rounded-xl overflow-hidden mt-1 max-h-40 overflow-y-auto">
                    {visitorResults.map((v) => (
                      <li key={v.id}>
                        <button onClick={() => selectVisitor(v)} className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50">
                          {v.name}{v.organisation ? <span className="text-muted-foreground"> · {v.organisation}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!selectedVisitor && (
                <div><Label>Organisation (optional)</Label><Input value={form.organisation} onChange={e => setForm({ ...form, organisation: e.target.value })} placeholder="e.g. ABC Plumbing Ltd" className="rounded-[10px] mt-1" /></div>
              )}
              <div><Label>Reason for Visit *</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Boiler repair" className="rounded-[10px] mt-1" /></div>
              <div><Label>Date *</Label><Input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} className="rounded-[10px] mt-1" /></div>
              <div>
                <Label>Playground</Label>
                <Select value={form.playground} onValueChange={(v) => setForm({ ...form, playground: v })}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Select a playground" /></SelectTrigger>
                  <SelectContent>
                    {PLAYGROUNDS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>From</Label><Input type="time" value={form.time_from} onChange={e => setForm({ ...form, time_from: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>To</Label><Input type="time" value={form.time_to} onChange={e => setForm({ ...form, time_to: e.target.value })} className="rounded-[10px] mt-1" /></div>
              </div>
              <Button onClick={save} disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground">
                {saving ? "Saving..." : "Log Visitor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
