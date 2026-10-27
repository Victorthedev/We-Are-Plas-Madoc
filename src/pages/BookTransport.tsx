import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addDays, format, parseISO } from "date-fns";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CarIcon, WheelchairIcon, CheckCircleIcon, XCircleIcon, CalendarBlankIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AddressPicker from "@/components/transport/AddressPicker";
import MembershipCheck, { type VerifiedMember } from "@/components/transport/MembershipCheck";
import {
  clearBookingDraft, computePrice, emptyAddress, fetchAvailability, loadBookingDraft, saveBookingDraft, fetchSettings, formatPence, formatSlot, formatVehicleType, invokeTransport, toDateKey,
  type AddressValue, type AvailabilityRow, type TransportSettings, type VehicleType,
} from "@/lib/transport";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Step({ n, title, children, muted }: { n: number; title: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <section className={cn("card-wapm p-6 sm:p-8 bg-secondary/30 mb-6 transition-opacity", muted && "opacity-50 pointer-events-none")} aria-disabled={muted}>
      <h2 className="flex items-center gap-3 text-lg font-semibold text-foreground mb-5">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center shrink-0">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusView({ icon, tone, title, children }: { icon: React.ReactNode; tone: string; title: string; children: React.ReactNode }) {
  return (
    <main id="main">
      <PageHero title="Book Transport" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Book Transport" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-lg text-center">
          <AnimatedSection>
            <div className="card-wapm p-10 bg-secondary/30">
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4", tone)}>{icon}</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
              {children}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}

export default function BookTransport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status");
  const releasedRef = useRef(false);

  const [settings, setSettings] = useState<TransportSettings | null>(null);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  // A draft exists if they left to buy a membership; restore it once.
  const [draft] = useState(() => loadBookingDraft());
  useEffect(() => { clearBookingDraft(); }, []);

  const [vehicleType, setVehicleType] = useState<VehicleType | null>(draft?.vehicleType ?? null);
  const [date, setDate] = useState<Date | undefined>(draft?.date ? parseISO(draft.date) : undefined);
  const [slotId, setSlotId] = useState(draft?.slotId ?? "");
  const [isReturn, setIsReturn] = useState(draft?.isReturn ?? false);
  const [returnSlotId, setReturnSlotId] = useState(draft?.returnSlotId ?? "");
  const [pickup, setPickup] = useState<AddressValue>(draft?.pickup ?? emptyAddress);
  const [dropoff, setDropoff] = useState<AddressValue>(draft?.dropoff ?? emptyAddress);
  const [hasMembership, setHasMembership] = useState(!!draft?.memberNumber);
  const [member, setMember] = useState<VerifiedMember | null>(null);
  const [name, setName] = useState(draft?.name ?? "");
  const [phone, setPhone] = useState(draft?.phone ?? "");
  const [email, setEmail] = useState(draft?.email ?? "");
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchSettings();
      setSettings(s);
      const today = new Date();
      setRows(await fetchAvailability(toDateKey(today), toDateKey(addDays(today, s.booking_horizon_days))));
    } catch {
      toast.error("Couldn't load availability. Please refresh the page.");
    }
    setLoading(false);
  };

  useEffect(() => { if (status !== "success") load(); }, [status]);

  // Back from Stripe without paying: free the held slot straight away.
  useEffect(() => {
    const token = searchParams.get("token");
    if (status === "cancelled" && token && !releasedRef.current) {
      releasedRef.current = true;
      invokeTransport("transport-booking", { action: "release", token }).catch(() => { /* the hold expires on its own */ });
    }
  }, [status, searchParams]);

  const openRows = useMemo(() => rows.filter((r) => r.is_open && r.vehicle_type === vehicleType), [rows, vehicleType]);
  const openDates = useMemo(() => new Set(openRows.map((r) => r.slot_date)), [openRows]);
  const dateKey = date ? toDateKey(date) : "";
  const daySlots = openRows.filter((r) => r.slot_date === dateKey);
  const outbound = daySlots.find((r) => r.slot_id === slotId);
  const returnSlots = outbound ? daySlots.filter((r) => r.start_time >= outbound.end_time) : [];
  const returnSlot = returnSlots.find((r) => r.slot_id === returnSlotId);

  const price = settings ? computePrice(settings, isReturn, member?.discount_pct || 0) : null;

  const step2Ready = !!vehicleType;
  const step3Ready = step2Ready && !!outbound && (!isReturn || !!returnSlot);
  const journeyReady = !!pickup.address && !!dropoff.address;
  const detailsReady = !!name.trim() && phone.replace(/\D/g, "").length >= 10 && EMAIL_RE.test(email.trim());
  const membershipReady = !hasMembership || !!member;
  const ready = step3Ready && journeyReady && detailsReady && membershipReady;

  const chooseType = (t: VehicleType) => {
    setVehicleType(t);
    setDate(undefined);
    setSlotId("");
    setReturnSlotId("");
  };

  const chooseDate = (d: Date | undefined) => {
    setDate(d);
    setSlotId("");
    setReturnSlotId("");
  };

  const joinMembership = () => {
    saveBookingDraft({
      vehicleType, date: date ? toDateKey(date) : null, slotId, isReturn, returnSlotId,
      pickup, dropoff, name, phone, email, notes,
    });
    navigate("/membership?return=transport");
  };

  const pay = async () => {
    if (!vehicleType || !outbound) return;
    setSubmitting(true);
    try {
      const res = await invokeTransport<{ url: string }>("create-transport-checkout", {
        vehicle_type: vehicleType,
        date: dateKey,
        slot_id: outbound.slot_id,
        return_slot_id: isReturn ? returnSlot?.slot_id : null,
        pickup,
        dropoff,
        passenger: { name, phone, email },
        notes,
        member: member ? { number: member.number, postcode: member.postcode } : null,
        origin: window.location.origin,
      });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
      setSubmitting(false);
      setReviewOpen(false);
      // A slot may have just gone; refresh what's open.
      load();
    }
  };

  if (status === "success") {
    return (
      <StatusView icon={<CheckCircleIcon className="w-8 h-8" weight="duotone" />} tone="bg-wapm-green/10 text-wapm-green" title="You're booked!">
        <p className="text-muted-foreground mb-2">Payment received. We've emailed your confirmation and let your driver know.</p>
        {searchParams.get("ref") && <p className="text-foreground">Booking reference: <strong className="tracking-widest">{searchParams.get("ref")}</strong></p>}
        <p className="text-sm text-muted-foreground mt-4">The email has a link to view or cancel your booking.</p>
      </StatusView>
    );
  }

  const Summary = (
    <dl className="text-sm space-y-2">
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Vehicle</dt><dd className="text-right font-medium">{vehicleType && formatVehicleType(vehicleType)}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date</dt><dd className="text-right font-medium">{date && format(date, "EEEE d MMMM yyyy")}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Pickup time</dt><dd className="text-right font-medium">{outbound && formatSlot(outbound)}</dd></div>
      {isReturn && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Return pickup</dt><dd className="text-right font-medium">{returnSlot && formatSlot(returnSlot)}</dd></div>}
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">From</dt><dd className="text-right font-medium">{pickup.address}{pickup.postcode && `, ${pickup.postcode}`}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">To</dt><dd className="text-right font-medium">{dropoff.address}{dropoff.postcode && `, ${dropoff.postcode}`}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Contact</dt><dd className="text-right font-medium">{name}<br />{phone}<br />{email}</dd></div>
      {notes && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Notes</dt><dd className="text-right font-medium">{notes}</dd></div>}
      {member && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Membership</dt><dd className="text-right font-medium">{member.member.name} ({member.member.plan})</dd></div>}
    </dl>
  );

  const PriceLines = price && (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">{isReturn ? "Return journey" : "One-way journey"}</span><span>{formatPence(price.fare)}</span></div>
      {price.discount > 0 && <div className="flex justify-between text-wapm-green"><span>Member discount ({member?.discount_pct}%)</span><span>−{formatPence(price.discount)}</span></div>}
      <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border"><span>Total</span><span>{formatPence(price.total)}</span></div>
    </div>
  );

  return (
    <main id="main">
      <PageHero title="Book Transport" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services", to: "/services" }, { label: "Book Transport" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-2xl">
          {status === "cancelled" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/40 rounded-xl p-4 mb-6">
              <XCircleIcon className="w-5 h-5 shrink-0" /> No payment was taken and your booking wasn't made. You can start again below.
              <button onClick={() => setSearchParams({})} className="ml-auto text-primary underline shrink-0">Dismiss</button>
            </div>
          )}

          <Step n={1} title="Choose a vehicle">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([["standard", CarIcon, "Standard car"], ["accessible", WheelchairIcon, "Wheelchair accessible"]] as const).map(([t, Icon, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => chooseType(t)}
                  aria-pressed={vehicleType === t}
                  className={cn("flex items-center gap-3 p-5 rounded-2xl border-2 text-left transition-colors",
                    vehicleType === t ? "border-primary bg-primary/5" : "border-input bg-white hover:border-primary/40")}
                >
                  <Icon className={cn("w-8 h-8 shrink-0", vehicleType === t ? "text-primary" : "text-muted-foreground")} weight="duotone" />
                  <span className="font-semibold text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </Step>

          <Step n={2} title="Choose a date and time" muted={!step2Ready}>
            {loading ? (
              <p className="text-muted-foreground">Loading availability...</p>
            ) : step2Ready && openDates.size === 0 ? (
              <p className="text-muted-foreground flex items-center gap-2"><CalendarBlankIcon className="w-5 h-5" /> Sorry, there are no {formatVehicleType(vehicleType!).toLowerCase()} trips available at the moment. Please check back soon.</p>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="bg-white rounded-2xl border border-input self-start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={chooseDate}
                    weekStartsOn={1}
                    fromDate={new Date()}
                    toDate={settings ? addDays(new Date(), settings.booking_horizon_days) : undefined}
                    disabled={(d) => !openDates.has(toDateKey(d))}
                  />
                </div>
                <div className="flex-1">
                  {!date ? (
                    <p className="text-sm text-muted-foreground">Pick a highlighted date to see available pickup times.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground mb-2">Pickup time on {format(date, "EEEE d MMMM")}</p>
                      <div className="flex flex-wrap gap-2 mb-5">
                        {daySlots.map((r) => (
                          <button key={r.slot_id} type="button" onClick={() => { setSlotId(r.slot_id); setReturnSlotId(""); }}
                            aria-pressed={slotId === r.slot_id}
                            className={cn("px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors",
                              slotId === r.slot_id ? "bg-primary text-primary-foreground border-primary" : "bg-white border-input hover:border-primary/40")}
                          >
                            {formatSlot(r)}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">Your driver will arrive during this window.</p>

                      {outbound && (
                        <label className="flex items-start gap-2.5 bg-white rounded-xl p-4 cursor-pointer">
                          <Checkbox checked={isReturn} onCheckedChange={(v) => { setIsReturn(!!v); setReturnSlotId(""); }} className="mt-0.5" />
                          <span className="text-sm text-foreground"><span className="font-medium">I need a return journey</span> later the same day{settings && ` (+${formatPence(settings.base_fare_pence)})`}</span>
                        </label>
                      )}
                      {isReturn && outbound && (
                        returnSlots.length === 0 ? (
                          <p className="text-sm text-destructive mt-3">Sorry, there are no return times left that day. Try an earlier pickup or another date.</p>
                        ) : (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-foreground mb-2">Return pickup time</p>
                            <div className="flex flex-wrap gap-2">
                              {returnSlots.map((r) => (
                                <button key={r.slot_id} type="button" onClick={() => setReturnSlotId(r.slot_id)}
                                  aria-pressed={returnSlotId === r.slot_id}
                                  className={cn("px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors",
                                    returnSlotId === r.slot_id ? "bg-primary text-primary-foreground border-primary" : "bg-white border-input hover:border-primary/40")}
                                >
                                  {formatSlot(r)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </Step>

          <Step n={3} title="Where are you going?" muted={!step3Ready}>
            <div className="space-y-5">
              <AddressPicker id="pickup" label="Pickup address" value={pickup} onChange={setPickup} />
              <AddressPicker id="dropoff" label="Drop-off address" value={dropoff} onChange={setDropoff} />
            </div>
          </Step>

          <Step n={4} title="Membership" muted={!step3Ready}>
            <label className="flex items-start gap-2.5 bg-white rounded-xl p-4 cursor-pointer mb-4">
              <Checkbox checked={hasMembership} onCheckedChange={(v) => { setHasMembership(!!v); if (!v) setMember(null); }} className="mt-0.5" />
              <span className="text-sm text-foreground">
                <span className="font-medium">I have a membership.</span>
                {settings && ` Members save ${settings.yearly_discount_pct}% (yearly) or ${settings.monthly_discount_pct}% (monthly) on every trip.`}
              </span>
            </label>
            {hasMembership && (
              <MembershipCheck verified={member} onChange={setMember} initialNumber={draft?.memberNumber} initialPostcode={draft?.memberPostcode} />
            )}
            {!member && (
              <p className="text-sm text-muted-foreground mt-3">
                Not a member yet?{" "}
                <button type="button" onClick={joinMembership} className="text-primary underline">Join now</button>
                {" "}and come straight back to this booking.
              </p>
            )}
          </Step>

          <Step n={5} title="Your details" muted={!step3Ready}>
            <p className="text-sm text-muted-foreground mb-4">Who should we contact about this trip? If you're booking for someone else, you can put your own details here.</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">Passenger name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input-wapm border-input w-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                  <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="input-wapm border-input w-full" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email (for your confirmation)</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="input-wapm border-input w-full" />
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1.5">Anything the driver should know? (optional)</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="e.g. I use a walking frame; please knock loudly" className="input-wapm border-input w-full" />
              </div>
            </div>
          </Step>

          <div className="card-wapm p-6 sm:p-8 bg-secondary/30">
            {PriceLines}
            <button onClick={() => setReviewOpen(true)} disabled={!ready} className="btn-primary w-full py-3 disabled:opacity-60 mt-5">
              Review booking
            </button>
            {!ready && <p className="text-xs text-muted-foreground text-center mt-3">Complete each step above to continue.</p>}
            <p className="text-xs text-muted-foreground text-center mt-3">
              Free cancellation with a full refund up to {settings ? Math.round(settings.cancel_cutoff_minutes / 60) : 2} hours before pickup.
            </p>
          </div>
        </div>
      </section>

      <Dialog open={reviewOpen} onOpenChange={(o) => !submitting && setReviewOpen(o)}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check your booking</DialogTitle>
            <DialogDescription>Please make sure everything is right before paying.</DialogDescription>
          </DialogHeader>
          {Summary}
          <div className="bg-secondary/40 rounded-xl p-4">{PriceLines}</div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button onClick={() => setReviewOpen(false)} disabled={submitting} className="btn-outline-primary flex-1 py-2.5 rounded-xl">Change something</button>
            <button onClick={pay} disabled={submitting} className="btn-primary flex-1 py-2.5 disabled:opacity-60">
              {submitting ? "Redirecting..." : price ? `Pay ${formatPence(price.total)}` : "Pay"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center">Payments are handled securely by Stripe. We hold your time for 30 minutes while you pay.</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
