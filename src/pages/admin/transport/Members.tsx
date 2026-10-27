import { useEffect, useState } from "react";
import { addMonths, addYears, format, parseISO } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, IdentificationCardIcon, MagnifyingGlassIcon, EnvelopeSimpleIcon, PencilSimpleIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPostcode, invokeTransport, toDateKey } from "@/lib/transport";

type Plan = "monthly" | "yearly";
type Status = "pending" | "active" | "lapsed" | "cancelled";

interface MemberRow {
  id: string;
  member_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postcode: string;
  plan: Plan;
  status: Status;
  current_period_end: string;
  cancel_at_period_end: boolean;
  source: "online" | "manual";
  notes: string | null;
  created_at: string;
}

const emptyForm = { full_name: "", email: "", phone: "", address: "", postcode: "", plan: "yearly" as Plan, current_period_end: "", notes: "" };

const nextPeriodEnd = (plan: Plan, from = new Date()) => toDateKey(plan === "yearly" ? addYears(from, 1) : addMonths(from, 1));

export default function TransportMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"current" | "ended" | "pending">("current");

  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const today = toDateKey(new Date());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setMembers((data || []) as MemberRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isCurrent = (m: MemberRow) => m.status === "active" && m.current_period_end >= today;
  const q = search.trim().toLowerCase().replace(/\s/g, "");
  const visible = members
    .filter((m) => filter === "pending" ? m.status === "pending" : filter === "current" ? isCurrent(m) : m.status !== "pending" && !isCurrent(m))
    .filter((m) => !q || [m.full_name, m.email, m.member_number, m.postcode, m.phone || ""].some((v) => v.toLowerCase().replace(/\s/g, "").includes(q)));

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, current_period_end: nextPeriodEnd("yearly") });
    setShowForm(true);
  };

  const openEdit = (m: MemberRow) => {
    setEditing(m);
    setForm({
      full_name: m.full_name, email: m.email, phone: m.phone || "", address: m.address || "", postcode: formatPostcode(m.postcode),
      plan: m.plan, current_period_end: m.current_period_end, notes: m.notes || "",
    });
    setShowForm(true);
  };

  const sendWelcome = async (memberId: string) => {
    try {
      await invokeTransport("membership", { action: "admin-welcome", member_id: memberId });
      toast.success("Welcome email sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send email");
    }
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.postcode.trim()) { toast.error("Name, email and postcode are required"); return; }
    setSaving(true);
    const contact = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      postcode: form.postcode.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    // Plan and dates of online members are owned by Stripe; only manual ones are editable here.
    const manualFields = { plan: form.plan, current_period_end: form.current_period_end, status: "active" as Status };

    if (editing) {
      const { error } = await supabase.from("members")
        .update(editing.source === "manual" ? { ...contact, ...manualFields } : contact).eq("id", editing.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Member updated");
    } else {
      const { data, error } = await supabase.from("members")
        .insert({ ...contact, ...manualFields, source: "manual", created_by: user?.id }).select("id").single();
      setSaving(false);
      if (error || !data) { toast.error(error?.message || "Could not add member"); return; }
      toast.success("Member added");
      sendWelcome(data.id);
    }
    setShowForm(false);
    load();
  };

  const renew = async (m: MemberRow) => {
    // Extend from the current end date if still valid, otherwise from today.
    const base = m.current_period_end >= today ? parseISO(m.current_period_end) : new Date();
    const { error } = await supabase.from("members")
      .update({ current_period_end: nextPeriodEnd(m.plan, base), status: "active", updated_at: new Date().toISOString() }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Renewed ${m.plan === "yearly" ? "1 year" : "1 month"}`);
    load();
  };

  const endManual = async (m: MemberRow) => {
    const { error } = await supabase.from("members").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Membership ended");
    setShowForm(false);
    load();
  };

  const statusBadge = (m: MemberRow) => {
    if (m.status === "pending") return { label: "Unpaid signup", className: "bg-muted text-muted-foreground" };
    if (m.status === "cancelled") return { label: "Ended", className: "bg-red-100 text-red-700" };
    if (m.status === "lapsed") return { label: "Payment failed", className: "bg-amber-100 text-amber-700" };
    if (!isCurrent(m)) return { label: "Expired", className: "bg-amber-100 text-amber-700" };
    if (m.cancel_at_period_end) return { label: "Ending", className: "bg-amber-100 text-amber-700" };
    return { label: "Active", className: "bg-green-100 text-green-700" };
  };

  return (
    <AdminShell title="Members" breadcrumb="Dashboard > Transport > Members">
      <PermissionGuard roles={["super_admin"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {([["current", "Current"], ["ended", "Ended / expired"], ["pending", "Unpaid signups"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  filter === v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
              >
                {label}
              </button>
            ))}
          </div>
          <Button onClick={openNew} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Add Member
          </Button>
        </div>

        <div className="relative mb-4 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, email, number, postcode" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-full pl-9" />
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : visible.length === 0 ? (
              <div className="p-12 text-center">
                <IdentificationCardIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No members here</p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {visible.map((m) => {
                  const badge = statusBadge(m);
                  return (
                    <div key={m.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <p className="font-medium text-foreground">{m.full_name} <span className="ml-1 text-xs font-mono text-muted-foreground">{m.member_number}</span></p>
                          <p className="text-xs text-muted-foreground">
                            {m.email}{m.phone && ` · ${m.phone}`} · {formatPostcode(m.postcode)}
                          </p>
                        </div>
                        <span className={cn("shrink-0 text-xs font-medium px-2 py-0.5 rounded-full", badge.className)}>{badge.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="capitalize">{m.plan}</span> · {m.source === "manual" ? "Paid in person" : "Paid online"} ·{" "}
                        {m.source === "manual" || m.cancel_at_period_end || m.status !== "active" ? "Until" : "Renews"} {format(parseISO(m.current_period_end), "d MMM yyyy")}
                      </p>
                      {m.notes && <p className="text-xs text-foreground bg-secondary/40 rounded-lg px-3 py-1.5 mb-2">{m.notes}</p>}
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openEdit(m)} className="h-8 rounded-full border-primary/20 text-primary">
                          <PencilSimpleIcon className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        {m.source === "manual" && m.status !== "pending" && (
                          <Button size="sm" variant="outline" onClick={() => renew(m)} className="h-8 rounded-full border-wapm-green/30 text-wapm-green">
                            <ArrowClockwiseIcon className="w-3.5 h-3.5 mr-1" /> Renew {m.plan === "yearly" ? "1 year" : "1 month"}
                          </Button>
                        )}
                        {m.status !== "pending" && (
                          <Button size="sm" variant="ghost" onClick={() => sendWelcome(m.id)} className="h-8 rounded-full">
                            <EnvelopeSimpleIcon className="w-3.5 h-3.5 mr-1" /> Email number
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? `Edit ${editing.member_number}` : "Add Member (paid in person)"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Full name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-[10px] mt-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-[10px] mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-[10px] mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-[10px] mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Postcode</Label>
                  <Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} className="rounded-[10px] mt-1 uppercase" />
                </div>
              </div>
              {(!editing || editing.source === "manual") ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Plan</Label>
                    <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as Plan, current_period_end: editing ? form.current_period_end : nextPeriodEnd(v as Plan) })}>
                      <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Paid until</Label>
                    <Input type="date" value={form.current_period_end} onChange={(e) => setForm({ ...form, current_period_end: e.target.value })} className="rounded-[10px] mt-1" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3">This member pays online, so their plan and renewal are managed by Stripe. They can change or cancel from the link in their emails.</p>
              )}
              <div>
                <Label className="text-xs">Notes (staff only)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl mt-1" rows={2} placeholder="e.g. Paid £100 cash at reception, receipt 0412" />
              </div>
              {!editing && <p className="text-xs text-muted-foreground">They'll be emailed their membership number straight away.</p>}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              {editing?.source === "manual" && editing.status !== "cancelled" && (
                <Button variant="ghost" onClick={() => endManual(editing)} className="rounded-full text-destructive sm:mr-auto">End membership</Button>
              )}
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-full">Cancel</Button>
              <Button onClick={save} disabled={saving} className="rounded-full bg-primary text-primary-foreground">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
