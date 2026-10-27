import { useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { invokeTransport, formatPostcode, emptyAddress, type AddressValue } from "@/lib/transport";

export default function AddressPicker({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: AddressValue;
  onChange: (v: AddressValue) => void;
}) {
  const [postcode, setPostcode] = useState(value.postcode);
  const [addresses, setAddresses] = useState<string[] | null>(value.address ? [value.address] : null);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const find = async () => {
    if (!postcode.trim()) return;
    setLoading(true);
    setError("");
    onChange(emptyAddress);
    try {
      const res = await invokeTransport<{ postcode: string; addresses: string[] }>("transport-address-lookup", { postcode });
      setPostcode(res.postcode);
      setAddresses(res.addresses);
      setManual(false);
    } catch (e) {
      setAddresses(null);
      setError(e instanceof Error ? e.message : "Lookup failed");
    }
    setLoading(false);
  };

  const confirmedPostcode = addresses ? formatPostcode(postcode) : "";

  return (
    <div>
      <label htmlFor={`${id}-postcode`} className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          id={`${id}-postcode`}
          placeholder="Postcode, e.g. LL14 3US"
          value={postcode}
          onChange={(e) => { setPostcode(e.target.value); setAddresses(null); setManual(false); onChange(emptyAddress); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }}
          autoComplete="postal-code"
          className="input-wapm border-input flex-1 uppercase"
        />
        <button type="button" onClick={find} disabled={loading || !postcode.trim()} className="btn-outline-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50 shrink-0">
          <MagnifyingGlassIcon className="w-4 h-4 inline mr-1" />
          {loading ? "Finding..." : "Find"}
        </button>
      </div>
      {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}

      {addresses && !manual && (
        <>
          <select
            aria-label={`${label}: choose address`}
            value={value.address}
            onChange={(e) => onChange({ postcode: confirmedPostcode, address: e.target.value })}
            className="input-wapm border-input mt-2 w-full"
          >
            <option value="">Choose your address…</option>
            {addresses.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="button" onClick={() => { setManual(true); onChange(emptyAddress); }} className="text-xs text-primary underline mt-1.5">
            My address isn't listed
          </button>
        </>
      )}

      {addresses && manual && (
        <>
          <input
            aria-label={`${label}: address`}
            placeholder="House number and street"
            value={value.address}
            onChange={(e) => onChange({ postcode: confirmedPostcode, address: e.target.value })}
            autoComplete="address-line1"
            className="input-wapm border-input mt-2 w-full"
          />
          <button type="button" onClick={() => { setManual(false); onChange(emptyAddress); }} className="text-xs text-primary underline mt-1.5">
            Choose from the list instead
          </button>
        </>
      )}
    </div>
  );
}
