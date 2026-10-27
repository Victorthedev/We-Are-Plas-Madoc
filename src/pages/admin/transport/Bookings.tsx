import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CarIcon, WheelchairIcon, UserCircleIcon, PhoneIcon, MapPinIcon, XCircleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchDrivers, formatPence, formatPostcode, formatSlot, invokeTransport, toDateKey, type DriverOption, type TripStatus } from "@/lib/transport";

interface TripLegRow {
  id: string;
  leg: "outbound" | "return";
  starts_at: string;
  driver_id: string;
  transport_slots: { start_time: string; end_time: string } | null;
  vehicles: { name: string; registration: string | null } | null;
}

interface TripRow {
  id: string;
  reference: string;
  status: TripStatus;
  vehicle_type: string;
  trip_date: string;
  pickup_address: string;
  pickup_postcode: string;
  dropoff_address: string;
  dropoff_postcode: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string;
  notes: string | null;
  amount_pence: number;
  discount_pct: number;
  refunded_pence: number | null;
  cancelled_by: string | null;
  transport_bookings: TripLegRow[];
}

const statusBadge: Record<TripStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
  held: { label: "Awaiting payment", className: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  expired: { label: "Unpaid", className: "bg-muted text-muted-foreground" },
};

type Tab = "upcoming" | "past" | "cancelled";

export default function TransportBookings() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("super_admin");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<TripRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const today = toDateKey(new Date());

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("transport_trips")
      .select("*, transport_bookings(id, leg, starts_at, driver_id, transport_slots(start_time, end_time), vehicles(name, registration))");
    if (tab === "upcoming") q = q.in("status", ["confirmed", "held"]).gte("trip_date", today).order("trip_date");
    if (tab === "past") q = q.eq("status", "confirmed").lt("trip_date", today).order("trip_date", { ascending: false }).limit(100);
    if (tab === "cancelled") q = q.eq("status", "cancelled").order("trip_date", { ascending: false }).limit(100);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    const rows = (data || []) as unknown as TripRow[];
    rows.forEach((t) => t.transport_bookings.sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    // Same-day trips in pickup order.
    rows.sort((a, b) => a.trip_date === b.trip_date ? (a.transport_bookings[0]?.starts_at || "").localeCompare(b.transport_bookings[0]?.starts_at || "") : 0);
    setTrips(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { if (isAdmin) fetchDrivers().then(setDrivers); }, [isAdmin]);

  const driverName = (id: string) => drivers.find((d) => d.id === id)?.full_name || (isAdmin ? "Unknown driver" : "You");

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await invokeTransport<{ refunded_pence: number | null }>("transport-booking", { action: "admin-cancel", trip_id: cancelTarget.id });
      toast.success(res.refunded_pence ? `Cancelled and refunded ${formatPence(res.refunded_pence)}` : "Booking cancelled");
      setCancelTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel");
    }
    setCancelling(false);
  };

  return (
    <AdminShell title={isAdmin ? "Transport Bookings" : "My Trips"} breadcrumb="Dashboard > Transport > Bookings">
      <PermissionGuard roles={["super_admin", "driver"]}>
        <div className="flex gap-2 flex-wrap mb-6">
          {(["upcoming", "past", "cancelled"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize",
                tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              {t}
            </button>
          ))}
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : trips.length === 0 ? (
              <div className="p-12 text-center">
                <CarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No {tab} trips</p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {trips.map((t) => {
                  const Icon = t.vehicle_type === "accessible" ? WheelchairIcon : CarIcon;
                  return (
                    <div key={t.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-2">
                            <Icon className="w-4 h-4 text-primary" />
                            {format(parseISO(t.trip_date), "EEE d MMM yyyy")} · {t.transport_bookings.map((l) => l.transport_slots && formatSlot(l.transport_slots)).join(" & return ")}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">Ref {t.reference}</p>
                        </div>
                        <span className={cn("shrink-0 text-xs font-medium px-2 py-0.5 rounded-full", statusBadge[t.status].className)}>{statusBadge[t.status].label}</span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                        <p className="flex items-start gap-1.5"><MapPinIcon className="w-4 h-4 shrink-0 mt-0.5" /> {t.pickup_address}, {formatPostcode(t.pickup_postcode)} → {t.dropoff_address}, {formatPostcode(t.dropoff_postcode)}</p>
                        <p className="flex items-center gap-1.5"><PhoneIcon className="w-4 h-4 shrink-0" /> {t.passenger_name} · {t.passenger_phone}</p>
                        {t.transport_bookings.map((l) => (
                          <p key={l.id} className="flex items-center gap-1.5">
                            <UserCircleIcon className="w-4 h-4 shrink-0" />
                            {l.leg === "return" ? "Return" : "Outbound"}: {driverName(l.driver_id)} · {l.vehicles?.name}{l.vehicles?.registration && ` (${l.vehicles.registration})`}
                          </p>
                        ))}
                      </div>
                      {t.notes && <p className="text-sm text-foreground bg-secondary/40 rounded-lg px-3 py-2 mt-2">{t.notes}</p>}
                      {isAdmin && (
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {formatPence(t.amount_pence)}{t.discount_pct > 0 && ` (member −${t.discount_pct}%)`} · {t.passenger_email}
                            {t.refunded_pence ? ` · Refunded ${formatPence(t.refunded_pence)} (${t.cancelled_by})` : ""}
                          </p>
                          {(t.status === "confirmed" || t.status === "held") && (
                            <Button size="sm" variant="outline" onClick={() => setCancelTarget(t)} className="h-8 rounded-full border-destructive/30 text-destructive ml-auto">
                              <XCircleIcon className="w-3.5 h-3.5 mr-1" /> Cancel & Refund
                            </Button>
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

        <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && !cancelling && setCancelTarget(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Cancel booking {cancelTarget?.reference}?</DialogTitle>
              <DialogDescription>
                {cancelTarget?.status === "confirmed"
                  ? `The passenger will get a full refund of ${formatPence(cancelTarget.amount_pence)}, and they and the driver will be emailed. This ignores the usual cancellation cutoff.`
                  : "No payment has been taken yet. This releases the held slot."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelling} className="rounded-full">Keep booking</Button>
              <Button onClick={confirmCancel} disabled={cancelling} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {cancelling ? "Cancelling..." : "Cancel booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
