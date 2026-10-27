import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import PageHero from "@/components/layout/PageHero";
import { IdentificationCardIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPostcode, invokeTransport } from "@/lib/transport";

interface ManagedMember {
  member_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postcode: string;
  plan: "monthly" | "yearly";
  status: "pending" | "active" | "lapsed" | "cancelled";
  active: boolean;
  current_period_end: string;
  cancel_at_period_end: boolean;
  source: "online" | "manual";
  discount_pct: number;
  can_manage_billing: boolean;
}

export default function ManageMembership() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [member, setMember] = useState<ManagedMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!token) { setError("This link isn't valid."); setLoading(false); return; }
    invokeTransport<{ member: ManagedMember }>("membership", { action: "get", token })
      .then((res) => setMember(res.member))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const openPortal = async () => {
    setOpening(true);
    try {
      const res = await invokeTransport<{ url: string }>("membership", { action: "portal", token, origin: window.location.origin });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing");
      setOpening(false);
    }
  };

  const ends = member ? format(parseISO(member.current_period_end), "d MMMM yyyy") : "";
  const statusText = !member ? "" :
    member.status === "pending" ? "Awaiting payment"
      : member.status === "cancelled" ? "Ended"
      : member.status === "lapsed" ? "Payment problem: discounts paused"
      : !member.active ? "Expired"
      : member.cancel_at_period_end ? `Active until ${ends} (won't renew)`
      : member.source === "manual" ? `Active, paid until ${ends}`
      : `Active, renews ${ends}`;

  return (
    <main id="main">
      <PageHero title="Your Membership" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Membership", to: "/membership" }, { label: "Your Membership" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-lg">
          <div className="card-wapm p-8">
            {loading ? (
              <p className="text-muted-foreground text-center">Loading...</p>
            ) : !member ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground mb-2">Sorry</p>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Link to="/membership" className="text-primary underline">Request a new link</Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><IdentificationCardIcon className="w-7 h-7" weight="duotone" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Membership number</p>
                    <p className="text-2xl font-bold tracking-[0.2em] text-foreground">{member.member_number.slice(0, 4)} {member.member_number.slice(4)}</p>
                  </div>
                </div>
                <p className={cn("text-sm font-medium px-3 py-2 rounded-xl mb-6",
                  member.active && member.status === "active" ? "bg-wapm-green/10 text-wapm-green" : "bg-amber-100 text-amber-800")}>
                  {statusText}
                </p>
                <dl className="text-sm space-y-2 mb-6">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Plan</dt><dd className="text-right font-medium capitalize">{member.plan} ({member.discount_pct}% off trips)</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Name</dt><dd className="text-right font-medium">{member.full_name}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Email</dt><dd className="text-right font-medium">{member.email}</dd></div>
                  {member.phone && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Phone</dt><dd className="text-right font-medium">{member.phone}</dd></div>}
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Address</dt><dd className="text-right font-medium">{member.address}{member.address && ", "}{formatPostcode(member.postcode)}</dd></div>
                </dl>

                {member.can_manage_billing ? (
                  <>
                    <button onClick={openPortal} disabled={opening} className="btn-primary w-full py-3 disabled:opacity-60">
                      {opening ? "Opening..." : "Update card or cancel membership"}
                    </button>
                    <p className="text-xs text-muted-foreground text-center mt-2">Opens our secure payment provider, Stripe.</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground bg-secondary/40 rounded-xl p-4">
                    To renew or change your membership, please <Link to="/contact" className="text-primary underline">contact us</Link>.
                  </p>
                )}
                {(member.status === "cancelled" || !member.active) && member.status !== "pending" && (
                  <Link to="/membership" className="btn-outline-primary w-full text-center block mt-3">Rejoin</Link>
                )}
                <p className="text-xs text-muted-foreground mt-6">To change your name, phone or address, please <Link to="/contact" className="text-primary underline">contact us</Link>.</p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
