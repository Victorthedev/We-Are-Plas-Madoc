import { useEffect, useState } from "react";
import { useLocation, useSearchParams, Link } from "react-router-dom";
import { startOfToday, startOfMonth, startOfQuarter, startOfYear, format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon, FirstAidKitIcon, WarningIcon, HeartbeatIcon, MagnifyingGlassIcon, XIcon, FlagIcon, DownloadSimpleIcon, FileCsvIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PLAYGROUNDS, downloadCsv } from "@/lib/vms";
import { generateListReportPdf } from "@/lib/pdf";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import FilterDisclosure from "@/components/admin/vms/FilterDisclosure";
import ExportMenu from "@/components/admin/vms/ExportMenu";
import DateRangeFilter from "@/components/admin/vms/DateRangeFilter";

const SEARCHABLE_TABLES = { child: "children", parent: "parents", volunteer: "volunteers" } as const;
const PROFILE_PATHS: Record<string, string> = { child: "children", parent: "parents", volunteer: "volunteers" };

const tabs = ["all", "accident", "medical_emergency"] as const;
const typeLabels: Record<string, string> = { accident: "Accident", medical_emergency: "Medical Emergency" };
const typeColors: Record<string, string> = { accident: "bg-amber-100 text-amber-700", medical_emergency: "bg-red-100 text-red-600" };

const DATE_PRESETS = [
  { key: "today", label: "Today", start: () => startOfToday() },
  { key: "month", label: "This Month", start: () => startOfMonth(new Date()) },
  { key: "quarter", label: "This Quarter", start: () => startOfQuarter(new Date()) },
  { key: "year", label: "This Year", start: () => startOfYear(new Date()) },
] as const;
const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

const emptyForm = {
  person_type: "child",
  person_name: "",
  incident_type: "accident",
  description: "",
  action_taken: "",
  occurred_on: format(new Date(), "yyyy-MM-dd"),
  occurred_at: "",
  playground: "",
  parent_notified: false,
  follow_up_required: false,
  follow_up_notes: "",
};

export default function VmsIncidents() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const linkedFrom = searchParams.get("from");
  const linkedTo = searchParams.get("to");
  const playgroundFilter = usePlaygroundFilter();
  const [dateFrom, setDateFrom] = useState(linkedFrom || "");
  const [dateTo, setDateTo] = useState(linkedTo || "");
  const [datePreset, setDatePreset] = useState<string>(linkedFrom ? "custom" : "all");
  const [exporting, setExporting] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof tabs[number]>((searchParams.get("type") as typeof tabs[number]) || "all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [personResults, setPersonResults] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    const { data } = await supabase.from("incidents").select("*").order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
    setIncidents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchIncidents(); }, []);

  // Arriving from a volunteer shift log that flagged an accident/medical emergency
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (prefill) {
      setForm({ ...emptyForm, ...prefill });
      if (prefill.volunteer_id) setSelectedPersonId(prefill.volunteer_id);
      setShowForm(true);
      window.history.replaceState({}, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byPlayground = incidents
    .filter((i) => playgroundFilter === "all" || i.playground === playgroundFilter)
    .filter((i) => !dateFrom || !dateTo || (i.occurred_on >= dateFrom && i.occurred_on <= dateTo));
  const filtered = tab === "all" ? byPlayground : byPlayground.filter((i) => i.incident_type === tab);

  const applyDatePreset = (key: string) => {
    setDatePreset(key);
    if (key === "all") { setDateFrom(""); setDateTo(""); return; }
    const p = DATE_PRESETS.find((x) => x.key === key);
    if (p) { setDateFrom(toISODate(p.start())); setDateTo(toISODate(new Date())); }
  };

  const exportRows = () => filtered.map((i) => [
    format(new Date(i.occurred_on), "d MMM yyyy"),
    typeLabels[i.incident_type],
    i.person_name,
    i.person_type,
    i.description,
    i.action_taken || "",
    i.parent_notified ? "Yes" : "No",
    i.follow_up_required ? (i.follow_up_notes || "Yes") : "No",
  ]);
  const exportColumns = ["Date", "Type", "Person", "Person Type", "What Happened", "Action Taken", "Parent Notified", "Follow-up"];
  const rangeLabel = dateFrom && dateTo ? `${format(new Date(dateFrom), "d MMM yyyy")} - ${format(new Date(dateTo), "d MMM yyyy")}` : "All time";

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await generateListReportPdf("Incidents", "Incidents", rangeLabel, [{ heading: `Incidents (${filtered.length})`, columns: exportColumns, rows: exportRows() }]);
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExporting(false);
  };

  const handleExportCsv = () => downloadCsv("WAPM_Incidents.csv", exportColumns, exportRows());

  const searchTable = SEARCHABLE_TABLES[form.person_type as keyof typeof SEARCHABLE_TABLES];

  useEffect(() => {
    if (!searchTable || selectedPersonId || form.person_name.trim().length < 2) { setPersonResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from(searchTable)
        .select("id, first_name, last_name")
        .or(`first_name.ilike.%${form.person_name}%,last_name.ilike.%${form.person_name}%`)
        .limit(6);
      setPersonResults(data || []);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.person_name, searchTable, selectedPersonId]);

  const changePersonType = (personType: string) => {
    setForm({ ...emptyForm, person_type: personType, incident_type: form.incident_type, occurred_on: form.occurred_on });
    setSelectedPersonId(null);
    setPersonResults([]);
  };

  const selectPerson = (person: { id: string; first_name: string; last_name: string }) => {
    const fkField = `${form.person_type}_id`;
    setForm({ ...form, person_name: `${person.first_name} ${person.last_name}`, [fkField]: person.id });
    setSelectedPersonId(person.id);
    setPersonResults([]);
  };

  const clearSelectedPerson = () => {
    const fkField = `${form.person_type}_id`;
    setForm({ ...form, person_name: "", [fkField]: null });
    setSelectedPersonId(null);
  };

  const save = async () => {
    if (!form.person_name.trim() || !form.description.trim()) {
      toast.error("Person name and description are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("incidents").insert({
      incident_type: form.incident_type,
      person_type: form.person_type,
      person_name: form.person_name.trim(),
      child_id: form.child_id || null,
      parent_id: form.parent_id || null,
      volunteer_id: form.volunteer_id || null,
      description: form.description.trim(),
      action_taken: form.action_taken || null,
      occurred_on: form.occurred_on,
      occurred_at: form.occurred_at || null,
      playground: form.playground || null,
      parent_notified: form.parent_notified,
      follow_up_required: form.follow_up_required,
      follow_up_notes: form.follow_up_required ? (form.follow_up_notes || null) : null,
      reported_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Incident logged");
    setShowForm(false);
    setForm(emptyForm);
    fetchIncidents();
  };

  return (
    <AdminShell title="Incidents" breadcrumb="Dashboard > Visitor Management > Incidents">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
                )}
              >
                {t === "all" ? "All" : typeLabels[t]} ({t === "all" ? byPlayground.length : byPlayground.filter(i => i.incident_type === t).length})
              </button>
            ))}
          </div>
          <Button onClick={() => { setForm(emptyForm); setSelectedPersonId(null); setPersonResults([]); setShowForm(true); }} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Log Incident
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
            disabled={filtered.length === 0 || exporting}
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
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FirstAidKitIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No incidents logged</p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {filtered.map((i) => {
                  const fkId = i.child_id || i.parent_id || i.volunteer_id;
                  const profilePath = PROFILE_PATHS[i.person_type];
                  return (
                  <div key={i.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {fkId && profilePath ? (
                          <Link to={`/admin/vms/${profilePath}/${fkId}`} className="font-medium text-foreground hover:text-primary transition-colors">{i.person_name}</Link>
                        ) : (
                          <h3 className="font-medium text-foreground">{i.person_name}</h3>
                        )}
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize", typeColors[i.incident_type])}>
                          {i.incident_type === "accident" ? <WarningIcon className="w-3 h-3 inline mr-1" weight="fill" /> : <HeartbeatIcon className="w-3 h-3 inline mr-1" weight="fill" />}
                          {typeLabels[i.incident_type]}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">({i.person_type})</span>
                        {i.follow_up_required && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                            <FlagIcon className="w-3 h-3" weight="fill" /> Follow-up needed
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(i.occurred_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{i.description}</p>
                    {i.action_taken && <p className="text-xs text-muted-foreground mt-1"><strong>Action taken:</strong> {i.action_taken}</p>}
                    {i.follow_up_required && i.follow_up_notes && <p className="text-xs text-amber-700 mt-1"><strong>Follow-up:</strong> {i.follow_up_notes}</p>}
                    {i.person_type === "child" && <p className="text-xs text-muted-foreground mt-1">Parent notified: {i.parent_notified ? "Yes" : "No"}</p>}
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Log Incident</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Person Type *</Label>
                  <Select value={form.person_type} onValueChange={changePersonType}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="visitor">Visitor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Incident Type *</Label>
                  <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accident">Accident</SelectItem>
                      <SelectItem value="medical_emergency">Medical Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Playground</Label>
                <Select value={form.playground} onValueChange={(v) => setForm({ ...form, playground: v })}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Select a playground" /></SelectTrigger>
                  <SelectContent>
                    {PLAYGROUNDS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{searchTable ? "Name * (search or type manually)" : "Name *"}</Label>
                {selectedPersonId ? (
                  <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 rounded-[10px] border border-primary/30 bg-primary/5">
                    <span className="text-sm text-foreground">{form.person_name}</span>
                    <button onClick={clearSelectedPerson} className="text-muted-foreground hover:text-destructive" aria-label="Clear selection">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    {searchTable && <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                    <Input
                      value={form.person_name}
                      onChange={e => setForm({ ...form, person_name: e.target.value })}
                      className={cn("rounded-[10px] mt-1", searchTable && "pl-9")}
                      placeholder={searchTable ? "Start typing to search..." : undefined}
                    />
                  </div>
                )}
                {personResults.length > 0 && !selectedPersonId && (
                  <ul className="border border-admin-border rounded-xl overflow-hidden mt-1 max-h-40 overflow-y-auto">
                    {personResults.map((p) => (
                      <li key={p.id}>
                        <button onClick={() => selectPerson(p)} className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50">
                          {p.first_name} {p.last_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Date *</Label><Input type="date" value={form.occurred_on} onChange={e => setForm({ ...form, occurred_on: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Time</Label><Input type="time" value={form.occurred_at} onChange={e => setForm({ ...form, occurred_at: e.target.value })} className="rounded-[10px] mt-1" /></div>
              </div>
              <div><Label>What happened? *</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1" rows={3} /></div>
              <div><Label>Action Taken</Label><Textarea value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} className="rounded-xl mt-1" rows={2} /></div>
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="flex items-center gap-2">
                  <Checkbox checked={form.parent_notified} onCheckedChange={(c) => setForm({ ...form, parent_notified: !!c })} />
                  <span className="text-sm">Parent/guardian was notified</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={form.follow_up_required} onCheckedChange={(c) => setForm({ ...form, follow_up_required: !!c })} />
                  <span className="text-sm">This needs following up</span>
                </label>
                {form.follow_up_required && (
                  <Textarea
                    placeholder="What needs following up, and by when?"
                    value={form.follow_up_notes}
                    onChange={e => setForm({ ...form, follow_up_notes: e.target.value })}
                    className="rounded-xl"
                    rows={2}
                  />
                )}
              </div>
              <Button onClick={save} disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground">
                {saving ? "Saving..." : "Log Incident"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
