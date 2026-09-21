import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/superbase/client";
import { HeartStraightIcon, CheckCircleIcon, XCircleIcon, InfoIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const PRESET_AMOUNTS = [5, 10, 25, 50];

export default function Donate() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  const [amount, setAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [email, setEmail] = useState("");
  const [giftAid, setGiftAid] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedAmount = customAmount ? parseFloat(customAmount) : amount;

  const selectPreset = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleDonate = async () => {
    if (!selectedAmount || selectedAmount < 1) {
      toast.error("Please choose an amount of at least £1.");
      return;
    }
    if (giftAid && (!firstName.trim() || !lastName.trim() || !address.trim())) {
      toast.error("Gift Aid needs your full name and home address to be a valid declaration.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
      body: {
        amount_pence: Math.round(selectedAmount * 100),
        donor_email: email || undefined,
        gift_aid: giftAid,
        donor_first_name: firstName || undefined,
        donor_last_name: lastName || undefined,
        donor_phone: phone || undefined,
        donor_address: address || undefined,
        origin: window.location.origin,
      },
    });
    if (error || !data?.url) {
      toast.error("Could not start the donation. Please try again.");
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  if (status === "success") {
    return (
      <main id="main">
        <PageHero title="Donate" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Donate" }]} />
        <section className="section-padding bg-background">
          <div className="container mx-auto max-w-lg text-center">
            <AnimatedSection>
              <div className="card-wapm p-10 bg-secondary/30">
                <div className="w-14 h-14 rounded-full bg-wapm-green/10 text-wapm-green flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Thank you!</h2>
                <p className="text-muted-foreground">Your donation means a lot to the community here. We're grateful for your support.</p>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main">
      <PageHero title="Donate" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Donate" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-lg">
          <AnimatedSection>
            <div className="card-wapm p-8 bg-secondary/30">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <HeartStraightIcon className="w-8 h-8" weight="duotone" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Support We Are Plas Madoc</h2>
                <p className="text-sm text-muted-foreground mt-1">Every donation helps us keep the playground, youth club and community services running.</p>
              </div>

              {status === "cancelled" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white rounded-xl p-3 mb-6">
                  <XCircleIcon className="w-4 h-4 shrink-0" /> No charge was made. Feel free to try again below.
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 mb-4">
                {PRESET_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    onClick={() => selectPreset(value)}
                    className={cn(
                      "py-3 rounded-xl text-sm font-semibold border transition-colors",
                      amount === value && !customAmount ? "bg-primary text-primary-foreground border-primary" : "bg-white text-foreground border-input hover:border-primary/40"
                    )}
                  >
                    £{value}
                  </button>
                ))}
              </div>

              <input
                placeholder="Or enter a custom amount (£)"
                type="number"
                min="1"
                step="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="input-wapm border-input mb-4"
              />

              <input placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-wapm border-input mb-4" />

              <label className="flex items-start gap-2.5 bg-white rounded-xl p-4 mb-4 cursor-pointer">
                <Checkbox checked={giftAid} onCheckedChange={(v) => setGiftAid(!!v)} className="mt-0.5" />
                <span className="text-sm text-foreground">
                  <span className="font-medium">Yes, I'd like to Gift Aid this donation.</span> I am a UK taxpayer and understand that if I pay less Income Tax/Capital Gains Tax in the current tax year than the amount of Gift Aid claimed on all my donations, it is my responsibility to pay any difference.
                </span>
              </label>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 rounded-xl p-3 mb-4">
                <InfoIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Ticking this lets us claim an extra 25p for every £1 you give, at no cost to you, straight from HMRC.{" "}
                  <a href="https://www.gov.uk/donating-to-charity/gift-aid" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-accent">
                    How Gift Aid works
                  </a>. Not a UK taxpayer, or would rather not say? Leave it unticked and donate anonymously below, no details needed.
                </span>
              </div>

              {giftAid && (
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-wapm border-input" />
                    <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-wapm border-input" />
                  </div>
                  <input placeholder="Home address" value={address} onChange={(e) => setAddress(e.target.value)} className="input-wapm border-input" />
                  <input placeholder="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-wapm border-input" />
                </div>
              )}

              <button onClick={handleDonate} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60 mt-2">
                {loading ? "Redirecting..." : `Donate £${selectedAmount || 0}`}
              </button>
              <p className="text-xs text-muted-foreground text-center mt-4">Payments are handled securely by Stripe. We never see or store your card details.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
