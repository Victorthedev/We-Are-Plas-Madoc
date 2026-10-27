import { useEffect, useMemo, useState } from "react";
import { addWeeks, format, isBefore, startOfDay } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaretLeftIcon, CaretRightIcon, CarIcon, WheelchairIcon, UserCircleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  cellKey, fetchAvailability, fetchDrivers, fetchSlots, formatSlot, toDateKey, weekDays,
  type AvailabilityRow, type DriverOption, type SlotRow, type VehicleType,
} from "@/lib/transport";

function TypePill({ row, type }: { row?: AvailabilityRow; type: VehicleType }) {
  const Icon = type === "accessible" ? WheelchairIcon : CarIcon;
  if (!row) return null;
  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      row.is_open ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}
      title={`${row.free_vehicles} vehicle(s), ${row.free_drivers} driver(s) free`}
    >
      <Icon className="w-3.5 h-3.5" />
      {row.is_open ? "Open" : "Closed"}
      <span className="opacity-70">· {row.free_vehicles}v / {row.free_drivers}d</span>
    </div>
  );
}

export default function TransportAvailability() {
  const [anchor, setAnchor] = useState(new Date());
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [driversByCell, setDriversByCell] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const from = toDateKey(days[0]);
  const to = toDateKey(days[6]);
  const today = startOfDay(new Date());

  useEffect(() => {
    Promise.all([fetchSlots(), fetchDrivers()])
      .then(([s, d]) => { setSlots(s); setDrivers(d); })
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [avail, { data: da }] = await Promise.all([
          fetchAvailability(from, to),
          supabase.from("driver_availability").select("driver_id, avail_date, slot_id").gte("avail_date", from).lte("avail_date", to),
        ]);
        setRows(avail);
        const map: Record<string, string[]> = {};
        (da || []).forEach((r) => {
          const key = cellKey(r.avail_date, r.slot_id);
          (map[key] ||= []).push(r.driver_id);
        });
        setDriversByCell(map);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load availability");
      }
      setLoading(false);
    };
    load();
  }, [from, to]);

  const rowFor = (date: string, slotId: string, type: VehicleType) =>
    rows.find((r) => r.slot_date === date && r.slot_id === slotId && r.vehicle_type === type);
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.full_name || "Unknown";

  return (
    <AdminShell title="Transport Availability" breadcrumb="Dashboard > Transport > Overview">
      <PermissionGuard roles={["super_admin"]}>
        <div className="flex items-center gap-2 mb-4">
          <Button size="icon" variant="outline" onClick={() => setAnchor(addWeeks(anchor, -1))} className="h-9 w-9 rounded-full" aria-label="Previous week">
            <CaretLeftIcon className="w-4 h-4" />
          </Button>
          <p className="font-semibold text-foreground min-w-[180px] text-center">{format(days[0], "d MMM")} – {format(days[6], "d MMM yyyy")}</p>
          <Button size="icon" variant="outline" onClick={() => setAnchor(addWeeks(anchor, 1))} className="h-9 w-9 rounded-full" aria-label="Next week">
            <CaretRightIcon className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          A slot opens for a vehicle type when at least one vehicle of that type and one driver are free.
          "v / d" shows free vehicles and drivers. Slots inside the minimum notice period show as closed.
        </p>

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
                  return (
                    <div key={date} className={cn("p-4", isBefore(day, today) && "opacity-50")}>
                      <p className="font-medium text-foreground mb-3">{format(day, "EEEE d MMM")}</p>
                      <div className="space-y-2">
                        {slots.map((s) => {
                          const names = (driversByCell[cellKey(date, s.id)] || []).map(driverName);
                          return (
                            <div key={s.id} className="flex flex-col lg:flex-row lg:items-center gap-2 p-3 rounded-xl border border-admin-border">
                              <p className="text-sm font-medium text-foreground w-28 shrink-0">{formatSlot(s)}</p>
                              <div className="flex flex-wrap gap-2">
                                <TypePill row={rowFor(date, s.id, "standard")} type="standard" />
                                <TypePill row={rowFor(date, s.id, "accessible")} type="accessible" />
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 lg:ml-auto">
                                <UserCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                {names.length > 0 ? names.join(", ") : "No drivers"}
                              </p>
                            </div>
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
      </PermissionGuard>
    </AdminShell>
  );
}
