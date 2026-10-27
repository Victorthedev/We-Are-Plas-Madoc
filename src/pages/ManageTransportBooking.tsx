import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import PageHero from "@/components/layout/PageHero";
import { CarIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { formatPence, formatPostcode, formatSlot, formatVehicleType, invokeTransport, type TripStatus } from "@/lib/transport";

interface ManagedTrip {
  reference: string;
  status: TripStatus;
  vehicle_type: string;
  trip_date: string;
  legs: { leg: "outbound" | "return"; start_time: string; end_time: string }[];
  pickup: string;
  pickup_postcode: string;
  dropoff: string;
  dropoff_postcode: string;
  passenger_name: string;
  amount_pence: number;
  can_cancel: boolean;
  cancel_deadline: string;
}

const statusLabel: Record<TripStatus, string> = {
  held: "Awaiting payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Not completed (no payment taken)",
};

export default function ManageTransportBooking() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [trip, setTrip] = useState<ManagedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refunded, setRefunded] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!token) { setError("This link isn't valid."); setLoading(false); return; }
    invokeTransport<{ trip: ManagedTrip }>("transport-booking", { action: "get", token })
      .then((res) => setTrip(res.trip))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await invokeTransport<{ refunded_pence: number | null }>("transport-booking", { action: "cancel", token });
      setRefunded(res.refunded_pence);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    }
    setCancelling(false);
  };

  return (
    <main id="main">
      <PageHero title="Your Booking" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Book Transport", to: "/transport" }, { label: "Your Booking" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-lg">
          <div className="card-wapm p-8">
            {loading ? (
              <p className="text-muted-foreground text-center">Loading...</p>
            ) : refunded !== undefined ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-wapm-green/10 text-wapm-green flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8" weight="duotone" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Your booking is cancelled</h2>
                {refunded ? <p className="text-muted-foreground">We've refunded {formatPence(refunded)} to your card. It usually appears within 5–10 working days.</p> : null}
                <p className="text-muted-foreground mt-2">We've emailed you a confirmation.</p>
                <Link to="/transport" className="btn-primary inline-block mt-6">Book another trip</Link>
              </div>
            ) : !trip ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground mb-2">Sorry</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><CarIcon className="w-7 h-7" weight="duotone" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Booking reference</p>
                    <p className="text-xl font-bold tracking-widest text-foreground">{trip.reference}</p>
                  </div>
                  <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-foreground">{statusLabel[trip.status]}</span>
                </div>
                <dl className="text-sm space-y-2 mb-6">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Passenger</dt><dd className="text-right font-medium">{trip.passenger_name}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date</dt><dd className="text-right font-medium">{format(parseISO(trip.trip_date), "EEEE d MMMM yyyy")}</dd></div>
                  {trip.legs.map((l) => (
                    <div key={l.leg} className="flex justify-between gap-4"><dt className="text-muted-foreground">{l.leg === "return" ? "Return pickup" : "Pickup"}</dt><dd className="text-right font-medium">{formatSlot(l)}</dd></div>
                  ))}
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">From</dt><dd className="text-right font-medium">{trip.pickup}, {formatPostcode(trip.pickup_postcode)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">To</dt><dd className="text-right font-medium">{trip.dropoff}, {formatPostcode(trip.dropoff_postcode)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Vehicle</dt><dd className="text-right font-medium">{formatVehicleType(trip.vehicle_type)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Paid</dt><dd className="text-right font-medium">{formatPence(trip.amount_pence)}</dd></div>
                </dl>

                {error && <p className="text-sm text-destructive mb-4">{error}</p>}

                {trip.can_cancel ? (
                  confirming ? (
                    <div className="bg-destructive/5 rounded-xl p-4">
                      <p className="text-sm text-foreground mb-3">Cancel this booking? You'll get a full refund of {formatPence(trip.amount_pence)}.</p>
                      <div className="flex gap-2">
                        <button onClick={cancel} disabled={cancelling} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-60">
                          {cancelling ? "Cancelling..." : "Yes, cancel"}
                        </button>
                        <button onClick={() => setConfirming(false)} disabled={cancelling} className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground">Keep booking</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setConfirming(true)} className="w-full py-2.5 rounded-xl border-2 border-destructive text-destructive font-semibold hover:bg-destructive/5">Cancel booking</button>
                      <p className="text-xs text-muted-foreground text-center mt-2">Free cancellation until {format(new Date(trip.cancel_deadline), "HH:mm 'on' EEEE d MMMM")}.</p>
                    </>
                  )
                ) : trip.status === "confirmed" ? (
                  <p className="text-sm text-muted-foreground bg-secondary/40 rounded-xl p-4">
                    It's too late to cancel online. If you can no longer travel, please <Link to="/contact" className="text-primary underline">contact us</Link>.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
