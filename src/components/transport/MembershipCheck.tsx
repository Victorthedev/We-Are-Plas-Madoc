import { useState } from "react";
import { CheckCircleIcon, IdentificationCardIcon } from "@phosphor-icons/react";
import { invokeTransport, formatPostcode } from "@/lib/transport";

export interface VerifiedMember {
  number: string;
  postcode: string;
  discount_pct: number;
  member: { name: string; phone: string | null; address: string; plan: "monthly" | "yearly"; renews: string };
}

export default function MembershipCheck({ verified, onChange, initialNumber, initialPostcode }: {
  verified: VerifiedMember | null;
  onChange: (m: VerifiedMember | null) => void;
  initialNumber?: string;
  initialPostcode?: string;
}) {
  const [number, setNumber] = useState(initialNumber ?? "");
  const [postcode, setPostcode] = useState(initialPostcode ? formatPostcode(initialPostcode) : "");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const [showRemind, setShowRemind] = useState(false);
  const [remindEmail, setRemindEmail] = useState("");
  const [remindState, setRemindState] = useState<"idle" | "sending" | "sent">("idle");
  const [remindError, setRemindError] = useState("");

  const verify = async () => {
    setChecking(true);
    setMessage("");
    try {
      const res = await invokeTransport<{ valid: boolean; message?: string; discount_pct?: number; member?: VerifiedMember["member"] }>(
        "transport-member", { action: "verify", member_number: number, postcode },
      );
      if (res.valid && res.member) onChange({ number: number.replace(/\D/g, ""), postcode, discount_pct: res.discount_pct || 0, member: res.member });
      else setMessage(res.message || "We couldn't verify that membership.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not check membership");
    }
    setChecking(false);
  };

  const remind = async () => {
    setRemindState("sending");
    setRemindError("");
    try {
      await invokeTransport("transport-member", { action: "remind", email: remindEmail });
      setRemindState("sent");
    } catch (e) {
      setRemindError(e instanceof Error ? e.message : "Could not send");
      setRemindState("idle");
    }
  };

  if (verified) {
    return (
      <div className="bg-wapm-green/10 border border-wapm-green/30 rounded-xl p-4">
        <p className="flex items-center gap-2 font-semibold text-foreground mb-2">
          <CheckCircleIcon className="w-5 h-5 text-wapm-green" weight="fill" />
          {verified.member.plan === "yearly" ? "Yearly" : "Monthly"} member: {verified.discount_pct}% off
        </p>
        <dl className="text-sm text-muted-foreground space-y-0.5">
          <div><dt className="inline font-medium text-foreground">Name: </dt><dd className="inline">{verified.member.name}</dd></div>
          {verified.member.phone && <div><dt className="inline font-medium text-foreground">Phone: </dt><dd className="inline">{verified.member.phone}</dd></div>}
          <div><dt className="inline font-medium text-foreground">Address: </dt><dd className="inline">{verified.member.address}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground mt-2">Details are partly hidden for privacy. Not you? <button type="button" onClick={() => onChange(null)} className="text-primary underline">Remove membership</button></p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="member-number" className="block text-sm font-medium text-foreground mb-1.5">Membership number</label>
          <input id="member-number" inputMode="numeric" placeholder="8 digits" value={number} onChange={(e) => setNumber(e.target.value)} className="input-wapm border-input w-full" />
        </div>
        <div>
          <label htmlFor="member-postcode" className="block text-sm font-medium text-foreground mb-1.5">Postcode on your membership</label>
          <input id="member-postcode" placeholder="e.g. LL14 3US" value={postcode} onChange={(e) => setPostcode(e.target.value)} onBlur={() => postcode && setPostcode(formatPostcode(postcode))} className="input-wapm border-input w-full uppercase" />
        </div>
      </div>
      <button type="button" onClick={verify} disabled={checking || !number.trim() || !postcode.trim()} className="btn-outline-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50">
        <IdentificationCardIcon className="w-4 h-4 inline mr-1" />
        {checking ? "Checking..." : "Check membership"}
      </button>
      {message && <p className="text-sm text-destructive">{message}</p>}

      <div>
        <button type="button" onClick={() => setShowRemind((s) => !s)} className="text-xs text-primary underline">Forgotten your membership number?</button>
        {showRemind && (
          remindState === "sent" ? (
            <p className="text-sm text-muted-foreground mt-2">If that email belongs to a member, we've sent the membership number to it.</p>
          ) : (
            <div className="flex gap-2 mt-2">
              <input type="email" placeholder="The email on your membership" value={remindEmail} onChange={(e) => setRemindEmail(e.target.value)} className="input-wapm border-input flex-1" />
              <button type="button" onClick={remind} disabled={remindState === "sending" || !remindEmail.trim()} className="btn-outline-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50 shrink-0">
                {remindState === "sending" ? "Sending..." : "Email it to me"}
              </button>
            </div>
          )
        )}
        {remindError && <p className="text-sm text-destructive mt-1">{remindError}</p>}
      </div>
    </div>
  );
}
