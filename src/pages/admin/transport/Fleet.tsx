import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, CarIcon, WheelchairIcon, PencilSimpleIcon, WrenchIcon, ArchiveIcon, ArrowCounterClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VEHICLE_TYPES, formatVehicleType, toDateKey, type VehicleRow, type VehicleType, type VehicleUnavailabilityRow } from "@/lib/transport";

const emptyForm = { name: "", registration: "", vehicle_type: "standard" as VehicleType, seats: "", notes: "" };
const emptyDowntime = { start_date: "", end_date: "", reason: "" };

export default function Fleet() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [downtime, setDowntime] = useState<VehicleUnavailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [downtimeVehicle, setDowntimeVehicle] = useState<VehicleRow | null>(null);
  const [downtimeForm, setDowntimeForm] = useState(emptyDowntime);

  const today = toDateKey(new Date());

  const load = async () => {
    setLoading(true);
    const [v, d] = await Promise.all([
      supabase.from("vehicles").select("*").order("vehicle_type").order("name"),
      supabase.from("vehicle_unavailability").select("*").gte("end_date", today).order("start_date"),
    ]);
    setVehicles((v.data || []) as VehicleRow[]);
    setDowntime((d.data || []) as VehicleUnavailabilityRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const active = vehicles.filter((v) => v.active);
  const archived = vehicles.filter((v) => !v.active);
  const visible = showArchived ? [...active, ...archived] : active;
  const outToday = (id: string) => downtime.some((d) => d.vehicle_id === id && d.start_date <= today && d.end_date >= today);
  const upcomingFor = (id: string) => downtime.filter((d) => d.vehicle_id === id);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (v: VehicleRow) => {
    setEditing(v);
    setForm({ name: v.name, registration: v.registration || "", vehicle_type: v.vehicle_type, seats: v.seats?.toString() || "", notes: v.notes || "" });
    setShowForm(true);
  };

  const saveVehicle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      registration: form.registration.trim().toUpperCase() || null,
      vehicle_type: form.vehicle_type,
      seats: form.seats ? parseInt(form.seats, 10) : null,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("vehicles").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : await supabase.from("vehicles").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Vehicle updated" : "Vehicle added");
    setShowForm(false);
    load();
  };

  const toggleActive = async (v: VehicleRow) => {
    const { error } = await supabase.from("vehicles").update({ active: !v.active, updated_at: new Date().toISOString() }).eq("id", v.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const addDowntime = async () => {
    if (!downtimeVehicle || !downtimeForm.start_date) return;
    const end = downtimeForm.end_date || downtimeForm.start_date;
    if (end < downtimeForm.start_date) { toast.error("End date must be on or after the start date"); return; }
    const { error } = await supabase.from("vehicle_unavailability").insert({
      vehicle_id: downtimeVehicle.id,
      start_date: downtimeForm.start_date,
      end_date: end,
      reason: downtimeForm.reason.trim() || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    setDowntimeForm(emptyDowntime);
    load();
  };

  const removeDowntime = async (id: string) => {
    const { error } = await supabase.from("vehicle_unavailability").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const count = (type: VehicleType) => active.filter((v) => v.vehicle_type === type).length;
  const countAvailableToday = (type: VehicleType) => active.filter((v) => v.vehicle_type === type && !outToday(v.id)).length;

  return (
    <AdminShell title="Fleet" breadcrumb="Dashboard > Transport > Fleet">
      <PermissionGuard roles={["super_admin"]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {VEHICLE_TYPES.map((t) => (
            <Card key={t.value} className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {t.value === "accessible" ? <WheelchairIcon className="w-6 h-6" /> : <CarIcon className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{count(t.value)}</p>
                  <p className="text-sm text-muted-foreground">{t.label} · {countAvailableToday(t.value)} available today</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          {archived.length > 0 ? (
            <button onClick={() => setShowArchived((s) => !s)} className="text-xs text-primary hover:text-accent">
              {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
            </button>
          ) : <span />}
          <Button onClick={openNew} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Add Vehicle
          </Button>
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : visible.length === 0 ? (
              <div className="p-12 text-center">
                <CarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No vehicles yet</p>
                <p className="text-sm text-muted-foreground">Add the vehicles available for community transport.</p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {visible.map((v) => {
                  const out = outToday(v.id);
                  const upcoming = upcomingFor(v.id);
                  return (
                    <div key={v.id} className={cn("p-4", !v.active && "opacity-50")}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <p className="font-medium text-foreground">
                            {v.name}
                            {v.registration && <span className="ml-2 text-xs font-mono text-muted-foreground">{v.registration}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatVehicleType(v.vehicle_type)}{v.seats ? ` · ${v.seats} seats` : ""}{v.notes ? ` · ${v.notes}` : ""}
                          </p>
                        </div>
                        <span className={cn("shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                          !v.active ? "bg-muted text-muted-foreground" : out ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                          {!v.active ? "Archived" : out ? "Out of service" : "Available"}
                        </span>
                      </div>
                      {v.active && upcoming.length > 0 && (
                        <p className="text-xs text-amber-700 mb-2">
                          Unavailable: {upcoming.map((d) => `${format(parseISO(d.start_date), "d MMM")}${d.end_date !== d.start_date ? `–${format(parseISO(d.end_date), "d MMM")}` : ""}`).join(", ")}
                        </p>
                      )}
                      <div className="flex gap-2 flex-wrap mt-2">
                        {v.active && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEdit(v)} className="h-8 rounded-full border-primary/20 text-primary">
                              <PencilSimpleIcon className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDowntimeVehicle(v); setDowntimeForm(emptyDowntime); }} className="h-8 rounded-full border-amber-300 text-amber-700">
                              <WrenchIcon className="w-3.5 h-3.5 mr-1" /> Mark Unavailable
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(v)} className="h-8 rounded-full">
                          {v.active
                            ? <><ArchiveIcon className="w-3.5 h-3.5 mr-1 text-destructive" /> Archive</>
                            : <><ArrowCounterClockwiseIcon className="w-3.5 h-3.5 mr-1 text-primary" /> Restore</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Blue Ford Tourneo" className="rounded-[10px] mt-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Type</Label>
                  <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v as VehicleType })}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Seats</Label>
                  <Input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} className="rounded-[10px] mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Registration</Label>
                <Input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} className="rounded-[10px] mt-1 uppercase" />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl mt-1" rows={2} placeholder="e.g. Rear ramp, 1 wheelchair space" />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-full">Cancel</Button>
              <Button onClick={saveVehicle} disabled={saving || !form.name.trim()} className="rounded-full bg-primary text-primary-foreground">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Vehicle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!downtimeVehicle} onOpenChange={(o) => !o && setDowntimeVehicle(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>{downtimeVehicle?.name}: Unavailable Dates</DialogTitle></DialogHeader>
            {downtimeVehicle && upcomingFor(downtimeVehicle.id).length > 0 && (
              <div className="space-y-2">
                {upcomingFor(downtimeVehicle.id).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 p-3 rounded-xl border border-admin-border">
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {format(parseISO(d.start_date), "d MMM yyyy")}{d.end_date !== d.start_date && ` – ${format(parseISO(d.end_date), "d MMM yyyy")}`}
                      </p>
                      {d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeDowntime(d.id)} className="h-8 w-8 shrink-0" aria-label="Remove">
                      <TrashIcon className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" min={today} value={downtimeForm.start_date} onChange={(e) => setDowntimeForm({ ...downtimeForm, start_date: e.target.value })} className="rounded-[10px] mt-1" />
                </div>
                <div>
                  <Label className="text-xs">To (inclusive)</Label>
                  <Input type="date" min={downtimeForm.start_date || today} value={downtimeForm.end_date} onChange={(e) => setDowntimeForm({ ...downtimeForm, end_date: e.target.value })} className="rounded-[10px] mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason (optional)</Label>
                <Input value={downtimeForm.reason} onChange={(e) => setDowntimeForm({ ...downtimeForm, reason: e.target.value })} placeholder="e.g. MOT, repairs" className="rounded-[10px] mt-1" />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDowntimeVehicle(null)} className="rounded-full">Done</Button>
              <Button onClick={addDowntime} disabled={!downtimeForm.start_date} className="rounded-full bg-primary text-primary-foreground">
                <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Add Period
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
