import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircleIcon, XCircleIcon, IdentificationCardIcon, HourglassIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AddressPicker from "@/components/transport/AddressPicker";
import {
  emptyAddress, fetchSettings, formatPence, invokeTransport, updateBookingDraft,
  type AddressValue, type TransportSettings,
} from "@/lib/transport";

type Plan = "monthly" | "yearly";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MemberSummary {
  member_number: string;
  postcode: string;
  plan: Plan;
  status: string;
  discount_pct: number;
}

function Hero() {
  return <PageHero title="Membership" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services", to: "/services" }, { label: "Membership" }]} />;
}

// After Stripe: the webhook activates the membership a moment after the
// redirect, so poll briefly until it shows as active.
function JoinedView({ token, returnTo }: { token: string; returnTo: string | null }) {
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await invokeTransport<{ member: MemberSummary }>("membership", { action: "get", token });
        if (cancelled) return;
        if (res.member.status === "active") {
          setMember(res.member);
          if (returnTo === "transport") updateBookingDraft({ memberNumber: res.member.member_number, memberPostcode: res.member.postcode });
          return;
        }
      } catch { /* keep polling */ }
      if (attempts < 15) setTimeout(poll, 2000);
      else if (!cancelled) setTimedOut(true);
    };
    poll();
    return () => { cancelled = true; };
  }, [token, returnTo]);

  return (
    <main id="main">
      <Hero />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-lg text-center">
          <AnimatedSection>
            <div className="card-wapm p-10 bg-secondary/30">
              {member ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-wapm-green/10 text-wapm-green flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8" weight="duotone" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Welcome, member!</h2>
                  <p className="text-muted-foreground mb-5">You now get {member.discount_pct}% off every trip. We've emailed you these details too.</p>
                  <div className="bg-white rounded-2xl p-5 mb-6">
                    <p className="text-xs text-muted-foreground mb-1">Your membership number</p>
                    <p className="text-3xl font-bold tracking-[0.2em] text-primary">{member.member_number.slice(0, 4)} {member.member_number.slice(4)}</p>
                  </div>
                  {returnTo === "transport" ? (
                    <Link to="/transport" className="btn-primary inline-block">Continue your booking</Link>
                  ) : (
                    <Link to="/transport" className="btn-primary inline-block">Book a trip</Link>
                  )}
                </>
              ) : timedOut ? (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">Payment received</h2>
                  <p className="text-muted-foreground">We're still setting up your membership. Your membership number will arrive by email in a few minutes.</p>
                </>
              ) : (
                <>
                  <HourglassIcon className="w-10 h-10 text-primary mx-auto mb-3 animate-pulse" />
                  <p className="text-muted-foreground">Confirming your payment…</p>
                </>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}

export default function Membership() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status");
  const returnTo = params.get("return");
  const token = params.get("token");

  const [settings, setSettings] = useState<TransportSettings | null>(null);
  const [plan, setPlan] = useState<Plan>("yearly");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [linkEmail, setLinkEmail] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => { fetchSettings().then(setSettings).catch(() => toast.error("Couldn't load membership prices")); }, []);

  if (status === "success" && token) return <JoinedView token={token} returnTo={returnTo} />;

  const ready = !!name.trim() && EMAIL_RE.test(email.trim()) && phone.replace(/\D/g, "").length >= 10 && !!address.address && agreed;

  const join = async () => {
    setSubmitting(true);
    try {
      const res = await invokeTransport<{ url: string }>("create-membership-checkout", {
        plan, name, email, phone, address: address.address, postcode: address.postcode,
        origin: window.location.origin, return_to: returnTo,
      });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
      setSubmitting(false);
    }
  };

  const requestLink = async () => {
    setLinkState("sending");
    try {
      await invokeTransport("membership", { action: "request-link", email: linkEmail });
      setLinkState("sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
      setLinkState("idle");
    }
  };

  const plans: { value: Plan; label: string; price: string; pct?: number }[] = settings ? [
    { value: "monthly", label: "Monthly", price: `${formatPence(settings.monthly_price_pence)} / month`, pct: settings.monthly_discount_pct },
    { value: "yearly", label: "Yearly", price: `${formatPence(settings.yearly_price_pence)} / year`, pct: settings.yearly_discount_pct },
  ] : [];

  return (
    <main id="main">
      <Hero />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-2xl">
          {status === "cancelled" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/40 rounded-xl p-4 mb-6">
              <XCircleIcon className="w-5 h-5 shrink-0" /> No payment was taken. You can try again below.
              <button onClick={() => setParams(returnTo ? { return: returnTo } : {})} className="ml-auto text-primary underline shrink-0">Dismiss</button>
            </div>
          )}
          {returnTo === "transport" && (
            <p className="text-sm bg-primary/5 rounded-xl p-4 mb-6">
              Your booking details are saved. Once you've joined, you'll go straight back to finish booking with your member discount.{" "}
              <Link to="/transport" className="text-primary underline">Back to booking without joining</Link>
            </p>
          )}

          <AnimatedSection>
            <div className="card-wapm p-6 sm:p-8 bg-secondary/30 mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">Become a member</h2>
              <p className="text-sm text-muted-foreground mb-5">Members save on every community transport trip. Cancel any time.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {plans.map((p) => (
                  <button key={p.value} type="button" onClick={() => setPlan(p.value)} aria-pressed={plan === p.value}
                    className={cn("text-left p-5 rounded-2xl border-2 transition-colors",
                      plan === p.value ? "border-primary bg-primary/5" : "border-input bg-white hover:border-primary/40")}
                  >
                    <p className="font-semibold text-foreground">{p.label}</p>
                    <p className="text-2xl font-bold text-primary my-1">{p.price}</p>
                    <p className="text-sm text-muted-foreground">{p.pct}% off every trip</p>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="m-name" className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
                  <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input-wapm border-input w-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="m-email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                    <input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="input-wapm border-input w-full" />
                  </div>
                  <div>
                    <label htmlFor="m-phone" className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                    <input id="m-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="input-wapm border-input w-full" />
                  </div>
                </div>
                <AddressPicker id="m-address" label="Home address" value={address} onChange={setAddress} />
                <p className="text-xs text-muted-foreground">You'll use your membership number and this postcode to get your discount when booking.</p>
              </div>

              <label className="flex items-start gap-2.5 bg-white rounded-xl p-4 my-5 cursor-pointer">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
                <span className="text-sm text-foreground">
                  I understand my membership renews automatically {plan === "yearly" ? "each year" : "each month"} until I cancel, and I can cancel any time from the link in my welcome email.
                </span>
              </label>

              <button onClick={join} disabled={!ready || submitting} className="btn-primary w-full py-3 disabled:opacity-60">
                {submitting ? "Redirecting..." : `Join for ${plans.find((p) => p.value === plan)?.price ?? ""}`}
              </button>
              <p className="text-xs text-muted-foreground text-center mt-3">Payments are handled securely by Stripe.</p>
            </div>

            <div className="card-wapm p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
                <IdentificationCardIcon className="w-5 h-5 text-primary" /> Already a member?
              </h2>
              <p className="text-sm text-muted-foreground mb-4">We'll email you a link to see your membership number, update your card or cancel.</p>
              {linkState === "sent" ? (
                <p className="text-sm text-foreground">If that email belongs to a member, a link is on its way.</p>
              ) : (
                <div className="flex gap-2">
                  <input type="email" placeholder="Your email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className="input-wapm border-input flex-1" />
                  <button onClick={requestLink} disabled={linkState === "sending" || !linkEmail.trim()} className="btn-outline-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50 shrink-0">
                    {linkState === "sending" ? "Sending..." : "Email me a link"}
                  </button>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
