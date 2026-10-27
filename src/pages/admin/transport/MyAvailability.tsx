import { useEffect, useMemo, useState } from "react";
import { addWeeks, format, isBefore, startOfDay, addDays, parseISO } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaretLeftIcon, CaretRightIcon, CopyIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { cellKey, fetchDrivers, fetchSlots, formatSlot, toDateKey, weekDays, type DriverOption, type SlotRow } from "@/lib/transport";

export default function MyAvailability() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("super_admin");
  const isDriver = roles.includes("driver");

  const [anchor, setAnchor] = useState(new Date());
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverId, setDriverId] = useState<string>("");
  const [available, setAvailable] = useState<Set<string>>(new Set());
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const from = toDateKey(days[0]);
  const to = toDateKey(days[6]);
  const today = startOfDay(new Date());

  useEffect(() => {
    fetchSlots().then(setSlots).catch((e) => toast.error(e.message));
    if (isAdmin) fetchDrivers().then(setDrivers);
  }, [isAdmin]);

  useEffect(() => {
    if (!driverId && user && isDriver) setDriverId(user.id);
  }, [user, isDriver, driverId]);

  const load = async () => {
    if (!driverId) { setLoading(false); return; }
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from("driver_availability").select("avail_date, slot_id").eq("driver_id", driverId).gte("avail_date", from).lte("avail_date", to),
      supabase.from("transport_bookings").select("booking_date, slot_id").eq("driver_id", driverId).in("status", ["held", "confirmed"]).gte("booking_date", from).lte("booking_date", to),
    ]);
    setAvailable(new Set((a.data || []).map((r) => cellKey(r.avail_date, r.slot_id))));
    setBooked(new Set((b.data || []).map((r) => cellKey(r.booking_date, r.slot_id))));
    setLoading(false);
  };

  useEffect(() => { load(); }, [driverId, from, to]);

  const toggle = async (date: string, slotId: string) => {
    const key = cellKey(date, slotId);
    setBusy(key);
    const { error } = available.has(key)
      ? await supabase.from("driver_availability").delete().eq("driver_id", driverId).eq("avail_date", date).eq("slot_id", slotId)
      : await supabase.from("driver_availability").insert({ driver_id: driverId, avail_date: date, slot_id: slotId });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const setWholeDay = async (date: string, on: boolean) => {
    setBusy(date);
    const { error } = on
      ? await supabase.from("driver_availability").upsert(
          slots.map((s) => ({ driver_id: driverId, avail_date: date, slot_id: s.id })),
          { onConflict: "driver_id,avail_date,slot_id", ignoreDuplicates: true },
        )
      : await supabase.from("driver_availability").delete().eq("driver_id", driverId).eq("avail_date", date)
          .in("slot_id", slots.filter((s) => !booked.has(cellKey(date, s.id))).map((s) => s.id));
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const copyPreviousWeek = async () => {
    const prevFrom = toDateKey(addDays(days[0], -7));
    const prevTo = toDateKey(addDays(days[6], -7));
    const { data, error } = await supabase.from("driver_availability").select("avail_date, slot_id")
      .eq("driver_id", driverId).gte("avail_date", prevFrom).lte("avail_date", prevTo);
    if (error) { toast.error(error.message); return; }
    const rows = (data || [])
      .map((r) => ({ driver_id: driverId, avail_date: toDateKey(addDays(parseISO(r.avail_date), 7)), slot_id: r.slot_id }))
      .filter((r) => !isBefore(parseISO(r.avail_date), today));
    if (rows.length === 0) { toast.info("Nothing to copy from last week"); return; }
    const { error: upErr } = await supabase.from("driver_availability").upsert(rows, { onConflict: "driver_id,avail_date,slot_id", ignoreDuplicates: true });
    if (upErr) { toast.error(upErr.message); return; }
    toast.success("Copied last week's availability");
    load();
  };

  return (
    <AdminShell title="My Availability" breadcrumb="Dashboard > Transport > Availability">
      <PermissionGuard roles={["super_admin", "driver"]}>
        {isAdmin && (
          <div className="mb-4 max-w-sm">
            <Label className="text-xs">Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Choose a driver" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}{d.id === user?.id ? " (you)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            {drivers.length === 0 && <p className="text-xs text-muted-foreground mt-1">No drivers yet. Give a staff account the Driver role in Staff Accounts.</p>}
          </div>
        )}

        {!driverId ? (
          <Card className="rounded-2xl border-admin-border"><CardContent className="p-8 text-center text-muted-foreground">Choose a driver to view their availability.</CardContent></Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setAnchor(addWeeks(anchor, -1))} disabled={!isBefore(today, days[0])} className="h-9 w-9 rounded-full" aria-label="Previous week">
                  <CaretLeftIcon className="w-4 h-4" />
                </Button>
                <p className="font-semibold text-foreground min-w-[180px] text-center">{format(days[0], "d MMM")} – {format(days[6], "d MMM yyyy")}</p>
                <Button size="icon" variant="outline" onClick={() => setAnchor(addWeeks(anchor, 1))} className="h-9 w-9 rounded-full" aria-label="Next week">
                  <CaretRightIcon className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={copyPreviousWeek} className="rounded-full border-primary/20 text-primary w-full sm:w-auto">
                <CopyIcon className="w-4 h-4 mr-1" /> Copy last week
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">Tap a time to mark yourself available. Booked times are locked. Contact an admin if you can no longer make one.</p>

            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : slots.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No time slots are set up yet.</div>
                ) : (
                  <div className="divide-y divide-admin-border/60">
                    {days.map((day) => {
                      const date = toDateKey(day);
                      const past = isBefore(day, today);
                      const allOn = slots.every((s) => available.has(cellKey(date, s.id)));
                      return (
                        <div key={date} className={cn("p-4", past && "opacity-50")}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-foreground">{format(day, "EEEE d MMM")}</p>
                            {!past && (
                              <button onClick={() => setWholeDay(date, !allOn)} disabled={busy === date} className="text-xs text-primary hover:text-accent">
                                {allOn ? "Clear day" : "Whole day"}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((s) => {
                              const key = cellKey(date, s.id);
                              const isBooked = booked.has(key);
                              const on = available.has(key);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => toggle(date, s.id)}
                                  disabled={past || isBooked || busy === key}
                                  className={cn(
                                    "px-3 py-2 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-1",
                                    isBooked ? "bg-wapm-deep-purple text-white border-wapm-deep-purple"
                                      : on ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-card text-muted-foreground border-admin-border hover:bg-primary/5",
                                  )}
                                >
                                  {isBooked && <LockSimpleIcon className="w-3.5 h-3.5" />}
                                  {formatSlot(s)}
                                  {isBooked && " · Booked"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </PermissionGuard>
    </AdminShell>
  );
}
