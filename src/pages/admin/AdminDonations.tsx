import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, startOfQuarter, startOfYear, endOfYear, subMonths, subYears, format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartStraightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formatAmount = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const statusStyle: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-600",
};

const PERIODS = [
  { key: "all", label: "All Time" },
  { key: "month", label: "Last Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "6months", label: "6 Months" },
  { key: "year", label: "Last Year" },
] as const;

const GIFT_AID_FILTERS = [
  { key: "all", label: "All" },
  { key: "gift_aid", label: "Gift Aided" },
  { key: "not_gift_aid", label: "Not Gift Aided" },
] as const;

export default function AdminDonations() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [giftAidFilter, setGiftAidFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("donations").select("*").order("created_at", { ascending: false });
    setDonations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const periodRange = useMemo(() => {
    const now = new Date();
    if (period === "month") { const d = subMonths(now, 1); return { start: startOfMonth(d), end: endOfMonth(d) }; }
    if (period === "quarter") return { start: startOfQuarter(now), end: now };
    if (period === "6months") return { start: subMonths(now, 6), end: now };
    if (period === "year") { const d = subYears(now, 1); return { start: startOfYear(d), end: endOfYear(d) }; }
    if (period === "custom") return {
      start: customFrom ? new Date(customFrom) : null,
      end: customTo ? new Date(`${customTo}T23:59:59`) : null,
    };
    return { start: null, end: null };
  }, [period, customFrom, customTo]);

  const filtered = useMemo(() => {
    return donations.filter((d) => {
      const created = new Date(d.created_at);
      if (periodRange.start && created < periodRange.start) return false;
      if (periodRange.end && created > periodRange.end) return false;
      if (giftAidFilter === "gift_aid") return d.gift_aid;
      if (giftAidFilter === "not_gift_aid") return !d.gift_aid;
      return true;
    });
  }, [donations, periodRange, giftAidFilter]);

  const handleMarkClaimed = async (id: string, claim: boolean) => {
    const { error } = await supabase.from("donations").update({ gift_aid_claimed_at: claim ? new Date().toISOString() : null }).eq("id", id);
    if (error) { toast.error("Couldn't update Gift Aid claim status"); return; }
    setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, gift_aid_claimed_at: claim ? new Date().toISOString() : null } : d)));
    toast.success(claim ? "Marked as claimed" : "Marked as not claimed");
  };

  const paid = filtered.filter((d) => d.status === "paid");
  const totalRaised = paid.reduce((sum, d) => sum + d.amount_pence, 0);
  const giftAidedPaid = paid.filter((d) => d.gift_aid);
  const unclaimedGiftAidedPaid = giftAidedPaid.filter((d) => !d.gift_aid_claimed_at);
  const claimedGiftAidedPaid = giftAidedPaid.filter((d) => d.gift_aid_claimed_at);
  const giftAidReclaimable = Math.round(unclaimedGiftAidedPaid.reduce((sum, d) => sum + d.amount_pence, 0) * 0.25);
  const giftAidClaimed = Math.round(claimedGiftAidedPaid.reduce((sum, d) => sum + d.amount_pence, 0) * 0.25);

  return (
    <AdminShell title="Donations" breadcrumb="Dashboard > Donations">
      <PermissionGuard roles={["super_admin"]}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  period === p.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPeriod("custom"); }} className="rounded-[10px] mt-1 h-9" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPeriod("custom"); }} className="rounded-[10px] mt-1 h-9" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {GIFT_AID_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setGiftAidFilter(f.key)}
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                giftAidFilter === f.key ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-admin-border hover:bg-muted/50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 text-sm">
          <div><span className="font-bold text-foreground text-lg">{formatAmount(totalRaised)}</span> <span className="text-muted-foreground">total raised</span></div>
          <div><span className="font-bold text-foreground text-lg">{paid.length}</span> <span className="text-muted-foreground">successful</span></div>
          <div><span className="font-bold text-foreground text-lg">{giftAidedPaid.length}</span> <span className="text-muted-foreground">Gift Aided</span></div>
          {giftAidReclaimable > 0 && (
            <div><span className="font-bold text-wapm-green text-lg">{formatAmount(giftAidReclaimable)}</span> <span className="text-muted-foreground">reclaimable from HMRC</span></div>
          )}
          {giftAidClaimed > 0 && (
            <div><span className="font-bold text-foreground text-lg">{formatAmount(giftAidClaimed)}</span> <span className="text-muted-foreground">already claimed</span></div>
          )}
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <HeartStraightIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No donations found</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-admin-border">
                        <th className="text-left p-4 font-semibold text-foreground">Donor</th>
                        <th className="text-left p-4 font-semibold text-foreground">Amount</th>
                        <th className="text-left p-4 font-semibold text-foreground">Gift Aid</th>
                        <th className="text-left p-4 font-semibold text-foreground">Status</th>
                        <th className="text-left p-4 font-semibold text-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((d) => (
                        <tr key={d.id} className="border-b border-admin-border/60">
                          <td className="p-4 text-foreground">
                            {d.donor_name || "Anonymous"}
                            {d.donor_email && <div className="text-xs text-muted-foreground">{d.donor_email}</div>}
                            {d.gift_aid && d.donor_address && <div className="text-xs text-muted-foreground">{d.donor_address}</div>}
                          </td>
                          <td className="p-4 text-foreground font-medium tabular-nums">{formatAmount(d.amount_pence)}</td>
                          <td className="p-4">
                            {d.gift_aid && (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Gift Aided</span>
                                {d.status === "paid" && (
                                  d.gift_aid_claimed_at ? (
                                    <button onClick={() => handleMarkClaimed(d.id, false)} className="text-[11px] text-muted-foreground underline hover:text-foreground">
                                      Claimed {formatDate(d.gift_aid_claimed_at)} · undo
                                    </button>
                                  ) : (
                                    <button onClick={() => handleMarkClaimed(d.id, true)} className="text-[11px] text-wapm-green underline hover:text-wapm-green/80">
                                      Mark as claimed
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize", statusStyle[d.status])}>{d.status}</span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{formatDate(d.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-admin-border/60">
                  {filtered.map((d) => (
                    <div key={d.id} className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-foreground">{d.donor_name || "Anonymous"}</span>
                        <span className="font-medium text-foreground tabular-nums">{formatAmount(d.amount_pence)}</span>
                      </div>
                      {d.donor_email && <p className="text-xs text-muted-foreground mb-1">{d.donor_email}</p>}
                      {d.gift_aid && d.donor_address && <p className="text-xs text-muted-foreground mb-1">{d.donor_address}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium capitalize", statusStyle[d.status])}>{d.status}</span>
                        {d.gift_aid && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">Gift Aided</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{formatDate(d.created_at)}</span>
                      </div>
                      {d.gift_aid && d.status === "paid" && (
                        d.gift_aid_claimed_at ? (
                          <button onClick={() => handleMarkClaimed(d.id, false)} className="text-[11px] text-muted-foreground underline hover:text-foreground mt-1">
                            Claimed {formatDate(d.gift_aid_claimed_at)} · undo
                          </button>
                        ) : (
                          <button onClick={() => handleMarkClaimed(d.id, true)} className="text-[11px] text-wapm-green underline hover:text-wapm-green/80 mt-1">
                            Mark as claimed
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </AdminShell>
  );
}