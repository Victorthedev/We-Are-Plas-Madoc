import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusIcon, MagnifyingGlassIcon, PencilSimpleIcon, HandshakeIcon, ShieldIcon, LinkIcon, XIcon, DownloadSimpleIcon, FileXlsIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calculateAge } from "@/lib/vms";
import { generateRosterPdf } from "@/lib/pdf";
import { downloadExcelWorkbook } from "@/lib/excel";
import ExportMenu from "@/components/admin/vms/ExportMenu";

const dbsBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "DBS Pending", className: "bg-wapm-cyan/20 text-wapm-cyan" },
  checked: { label: "DBS Checked", className: "bg-green-100 text-green-700" },
  not_required: { label: "DBS Not Required", className: "bg-gray-100 text-gray-500" },
};

const ROSTER_COLUMNS = ["Name", "Role", "Type", "Email", "Phone", "DBS Status", "DBS Number", "Linked Child Record"];

const emptyForm = {
  first_name: "", last_name: "", email: "", phone: "", position: "Playground Volunteer",
  volunteer_type: "adult", dbs_number: "", dbs_checked_status: "pending", internal_notes: "",
  child_id: null as string | null,
};

export default function VmsVolunteers() {
  const location = useLocation();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [linkChild, setLinkChild] = useState(false);
  const [childSearch, setChildSearch] = useState("");
  const [childResults, setChildResults] = useState<any[]>([]);
  const [linkedChild, setLinkedChild] = useState<any>(null);
  const [exportingRoster, setExportingRoster] = useState(false);

  const fetchVolunteers = async () => {
    setLoading(true);
    // status = accepted regardless of whether they came through the public application
    // pipeline (Get Involved -> Volunteer Applications) or were added directly here.
    const { data } = await supabase.from("volunteers").select("*").eq("status", "accepted").order("first_name").order("last_name");
    setVolunteers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVolunteers(); }, []);

  useEffect(() => {
    if (!linkChild || linkedChild || childSearch.trim().length < 2) { setChildResults([]); return; }
    const t = setTimeout(async () => {
      // Deliberately searches all children, including archived/aged-out ones:
      // an archived adult should be re-engageable as a volunteer.
      const { data } = await supabase
        .from("children")
        .select("id, first_name, last_name, date_of_birth, archived_at")
        .or(`first_name.ilike.%${childSearch}%,last_name.ilike.%${childSearch}%`)
        .limit(6);
      setChildResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [childSearch, linkChild, linkedChild]);

  const filtered = volunteers.filter((v) =>
    !search || `${v.first_name} ${v.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const rosterRows = () => filtered.map((v) => [
    `${v.first_name} ${v.last_name}`, v.position, v.volunteer_type || "",
    v.email, v.phone, (dbsBadge[v.dbs_checked_status] || dbsBadge.pending).label, v.dbs_number || "",
    v.child_id ? "Yes" : "No",
  ]);
  const handleExportRosterPdf = async () => {
    setExportingRoster(true);
    try {
      await generateRosterPdf("Volunteers_Roster", "Volunteers Roster", `${filtered.length} volunteer${filtered.length === 1 ? "" : "s"}`, ROSTER_COLUMNS, rosterRows());
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExportingRoster(false);
  };
  const handleExportRosterExcel = () => {
    downloadExcelWorkbook("WAPM_Volunteers_Roster.xlsx", [{ name: "Volunteers", headers: ROSTER_COLUMNS, rows: rosterRows() }]);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setLinkChild(false);
    setChildSearch("");
    setChildResults([]);
    setLinkedChild(null);
    setShowForm(true);
  };

  const openEdit = async (v: any) => {
    setEditing(v);
    setForm({
      first_name: v.first_name, last_name: v.last_name, email: v.email, phone: v.phone,
      position: v.position, volunteer_type: v.volunteer_type || "adult",
      dbs_number: v.dbs_number || "", dbs_checked_status: v.dbs_checked_status || "pending",
      internal_notes: v.internal_notes || "", child_id: v.child_id || null,
    });
    setLinkChild(!!v.child_id);
    setChildSearch("");
    setChildResults([]);
    setLinkedChild(null);
    setShowForm(true);
    if (v.child_id) {
      const { data } = await supabase.from("children").select("id, first_name, last_name, date_of_birth, archived_at").eq("id", v.child_id).maybeSingle();
      setLinkedChild(data);
    }
  };

  // Arriving from a volunteer's profile page "Edit" button.
  useEffect(() => {
    const openEditId = (location.state as any)?.openEditId;
    if (openEditId && volunteers.length > 0) {
      const target = volunteers.find((v) => v.id === openEditId);
      if (target) openEdit(target);
      window.history.replaceState({}, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volunteers]);

  const selectChild = (child: any) => {
    setLinkedChild(child);
    setForm((f: any) => ({
      ...f,
      child_id: child.id,
      first_name: f.first_name || child.first_name,
      last_name: f.last_name || child.last_name,
    }));
    setChildResults([]);
  };

  const clearLinkedChild = () => {
    setLinkedChild(null);
    setChildSearch("");
    setForm((f: any) => ({ ...f, child_id: null }));
  };

  const save = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("First name, last name, email and phone are required");
      return;
    }
    setSaving(true);
    const payload = {
      first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim(), phone: form.phone.trim(), position: form.position.trim() || "Playground Volunteer",
      volunteer_type: form.volunteer_type, dbs_number: form.dbs_number || null,
      dbs_checked_status: form.dbs_checked_status, internal_notes: form.internal_notes || null,
      child_id: linkChild ? form.child_id : null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("volunteers").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("volunteers").insert({ ...payload, status: "accepted" }));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Volunteer updated" : "Volunteer added");
    setShowForm(false);
    fetchVolunteers();
  };

  return (
    <AdminShell title="Volunteers" breadcrumb="Dashboard > Visitor Management > Volunteers">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <p className="text-sm text-muted-foreground mb-2">
          Anyone accepted through Volunteer Applications appears here automatically. You can also register a volunteer directly.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 text-sm">
          <div><span className="font-bold text-foreground text-lg">{volunteers.length}</span> <span className="text-muted-foreground">total</span></div>
          <div><span className="font-bold text-foreground text-lg">{volunteers.filter((v) => v.dbs_checked_status === "checked").length}</span> <span className="text-muted-foreground">DBS checked</span></div>
          <div><span className="font-bold text-foreground text-lg">{volunteers.filter((v) => v.dbs_checked_status === "pending").length}</span> <span className="text-muted-foreground">DBS pending</span></div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end mb-6">
          <ExportMenu
            disabled={filtered.length === 0 || exportingRoster}
            options={[
              { label: "Export Excel", icon: <FileXlsIcon className="w-4 h-4" />, onClick: handleExportRosterExcel },
              { label: exportingRoster ? "Generating..." : "Export PDF", icon: <DownloadSimpleIcon className="w-4 h-4" />, onClick: handleExportRosterPdf },
            ]}
          />
          <Button onClick={openNew} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> New Volunteer
          </Button>
        </div>

        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <HandshakeIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No volunteers yet</p>
                <Button onClick={openNew} className="mt-4 rounded-full bg-primary text-primary-foreground">
                  <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Add First Volunteer
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table, md and up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-admin-border">
                        <th className="text-left p-4 font-semibold text-foreground">Name</th>
                        <th className="text-left p-4 font-semibold text-foreground">Role</th>
                        <th className="text-left p-4 font-semibold text-foreground">Type</th>
                        <th className="text-left p-4 font-semibold text-foreground">DBS</th>
                        <th className="text-right p-4 font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(v => {
                        const badge = dbsBadge[v.dbs_checked_status] || dbsBadge.pending;
                        return (
                          <tr key={v.id} className="border-b border-admin-border/60 hover:bg-muted/50">
                            <td className="p-4 font-medium text-foreground">
                              <Link to={`/admin/vms/volunteers/${v.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                {v.first_name} {v.last_name}
                                {v.child_id && <LinkIcon className="w-3.5 h-3.5 text-wapm-cyan" weight="bold" aria-label="Linked to a child record" />}
                              </Link>
                            </td>
                            <td className="p-4 text-muted-foreground text-xs">{v.position}</td>
                            <td className="p-4 text-muted-foreground text-xs capitalize">{v.volunteer_type || "-"}</td>
                            <td className="p-4">
                              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", badge.className)}>
                                <ShieldIcon className="w-3 h-3" weight="fill" /> {badge.label}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end">
                                <Button size="icon" variant="ghost" onClick={() => openEdit(v)} className="h-9 w-9 text-primary" aria-label="Edit volunteer"><PencilSimpleIcon className="w-4 h-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list, below md */}
                <div className="md:hidden divide-y divide-admin-border/60">
                  {filtered.map(v => {
                    const badge = dbsBadge[v.dbs_checked_status] || dbsBadge.pending;
                    return (
                      <div key={v.id} className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Link to={`/admin/vms/volunteers/${v.id}`} className="font-medium text-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
                            {v.first_name} {v.last_name}
                            {v.child_id && <LinkIcon className="w-3.5 h-3.5 text-wapm-cyan" weight="bold" aria-label="Linked to a child record" />}
                          </Link>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(v)} className="h-9 w-9 text-primary shrink-0" aria-label="Edit volunteer"><PencilSimpleIcon className="w-4 h-4" /></Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{v.position} &middot; <span className="capitalize">{v.volunteer_type || "type not set"}</span></p>
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", badge.className)}>
                          <ShieldIcon className="w-3 h-3" weight="fill" /> {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit Volunteer" : "New Volunteer"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkChild}
                  onChange={(e) => { setLinkChild(e.target.checked); if (!e.target.checked) clearLinkedChild(); }}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">This person is also in the Children/Youth register</span>
              </label>

              {linkChild && (
                <div>
                  <Label>{linkedChild ? "Linked Record" : "Search by name"}</Label>
                  {linkedChild ? (
                    <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 rounded-[10px] border border-wapm-cyan/40 bg-wapm-cyan/5">
                      <span className="text-sm text-foreground">
                        {linkedChild.first_name} {linkedChild.last_name} &middot; {calculateAge(linkedChild.date_of_birth)} yrs
                        {linkedChild.archived_at && <span className="text-muted-foreground"> (archived)</span>}
                      </span>
                      <button onClick={clearLinkedChild} className="text-muted-foreground hover:text-destructive" aria-label="Clear linked record">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={childSearch}
                        onChange={(e) => setChildSearch(e.target.value)}
                        className="rounded-[10px] mt-1 pl-9"
                        placeholder="Start typing to search Children/Youth..."
                      />
                    </div>
                  )}
                  {childResults.length > 0 && !linkedChild && (
                    <ul className="border border-admin-border rounded-xl overflow-hidden mt-1 max-h-40 overflow-y-auto">
                      {childResults.map((c) => (
                        <li key={c.id}>
                          <button onClick={() => selectChild(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex justify-between">
                            <span>{c.first_name} {c.last_name}</span>
                            <span className="text-muted-foreground">{calculateAge(c.date_of_birth)} yrs{c.archived_at ? " · archived" : ""}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="rounded-[10px] mt-1" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-[10px] mt-1" /></div>
              </div>
              <div><Label>Role</Label><Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="rounded-[10px] mt-1" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Volunteer Type</Label>
                  <Select value={form.volunteer_type} onValueChange={(v) => setForm({ ...form, volunteer_type: v })}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adult">Adult volunteer</SelectItem>
                      <SelectItem value="child">Child volunteer (under 18)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>DBS Checked Status</Label>
                  <Select value={form.dbs_checked_status} onValueChange={(v) => setForm({ ...form, dbs_checked_status: v })}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="checked">Checked</SelectItem>
                      <SelectItem value="not_required">Not required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>DBS Certificate Number</Label><Input value={form.dbs_number} onChange={e => setForm({ ...form, dbs_number: e.target.value })} className="rounded-[10px] mt-1" /></div>
              <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} className="rounded-xl mt-1" rows={2} /></div>
              <Button onClick={save} disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Volunteer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
