import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Position = {
  id: string;
  title: string;
  commitment: string;
  involved: string;
  requirements: string;
  is_active: boolean;
  display_order: number;
};

const empty = { title: "", commitment: "", involved: "", requirements: "", is_active: true, display_order: 0 };

export default function AdminVolunteerPositions() {
  const { user, profile } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("volunteer_positions")
      .select("*")
      .order("display_order");
    setPositions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, display_order: positions.length + 1 });
    setShowModal(true);
  };

  const openEdit = (p: Position) => {
    setEditing(p);
    setForm({ title: p.title, commitment: p.commitment, involved: p.involved, requirements: p.requirements, is_active: p.is_active, display_order: p.display_order });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.commitment.trim()) {
      toast.error("Title and commitment are required");
      return;
    }
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };

    let error;
    if (editing) {
      ({ error } = await supabase.from("volunteer_positions").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("volunteer_positions").insert(payload));
    }

    if (error) {
      toast.error(error.message);
    } else {
      await supabase.from("activity_log").insert({
        user_id: user?.id, user_name: profile?.full_name,
        action_type: editing ? "updated" : "created",
        content_type: "volunteer_position", content_title: form.title,
      });
      toast.success(editing ? "Position updated" : "Position created");
      setShowModal(false);
      fetch();
    }
    setSaving(false);
  };

  const toggleActive = async (p: Position) => {
    await supabase.from("volunteer_positions").update({ is_active: !p.is_active }).eq("id", p.id);
    toast.success(p.is_active ? `"${p.title}" hidden from website` : `"${p.title}" now live on website`);
    fetch();
  };

  const handleDelete = async (p: Position) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    await supabase.from("volunteer_positions").delete().eq("id", p.id);
    toast.success("Position deleted");
    fetch();
  };

  return (
    <AdminShell title="Volunteer Positions" breadcrumb="Dashboard > Volunteer Positions">
      <PermissionGuard roles={["super_admin", "editor"]}>
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-muted-foreground">Manage the volunteer roles shown on the Get Involved page. Toggle a position off to hide it without deleting it.</p>
          <Button onClick={openNew} className="rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white shrink-0 ml-4">
            <Plus className="w-4 h-4 mr-1" /> New Position
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-wapm-deep-purple">No positions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first volunteer role to get started.</p>
            <Button onClick={openNew} className="mt-4 rounded-full bg-wapm-purple text-white"><Plus className="w-4 h-4 mr-1" /> Add Position</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map(p => (
              <Card key={p.id} className={cn("rounded-2xl border-wapm-purple/[0.12] shadow-[0_2px_12px_rgba(45,27,78,0.08)] transition-opacity", !p.is_active && "opacity-50")}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-wapm-deep-purple">{p.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-wapm-purple/10 text-wapm-purple">{p.commitment}</span>
                      {!p.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Hidden</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {p.involved.split("\n").filter(Boolean)[0]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{p.is_active ? "Live" : "Hidden"}</span>
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="h-8 w-8 text-wapm-purple"><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="rounded-2xl max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Position" : "New Volunteer Position"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="rounded-[10px] mt-1" placeholder="e.g. Volunteer Driver" />
                </div>
                <div>
                  <Label>Commitment *</Label>
                  <Input value={form.commitment} onChange={e => setForm({ ...form, commitment: e.target.value })} className="rounded-[10px] mt-1" placeholder="e.g. Flexible Hours" />
                </div>
              </div>
              <div>
                <Label>What's involved</Label>
                <p className="text-xs text-muted-foreground mb-1">One bullet point per line</p>
                <Textarea
                  value={form.involved}
                  onChange={e => setForm({ ...form, involved: e.target.value })}
                  className="rounded-xl mt-1 min-h-[110px]"
                  placeholder={"Driving residents to appointments\nWelcoming people at the door"}
                />
              </div>
              <div>
                <Label>Requirements</Label>
                <p className="text-xs text-muted-foreground mb-1">One bullet point per line</p>
                <Textarea
                  value={form.requirements}
                  onChange={e => setForm({ ...form, requirements: e.target.value })}
                  className="rounded-xl mt-1 min-h-[90px]"
                  placeholder={"Full clean UK driving licence\nDBS check (we'll arrange this)"}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Display order</Label>
                  <Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="rounded-[10px] mt-1 w-20" />
                </div>
                {editing && (
                  <div className="flex items-center gap-2">
                    <Label>Show on website</Label>
                    <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  </div>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full rounded-full bg-wapm-purple text-white">
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Position"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
