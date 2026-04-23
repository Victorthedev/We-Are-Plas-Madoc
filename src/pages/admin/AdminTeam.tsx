import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import { toast } from "sonner";

export default function AdminTeam() {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMember, setEditMember] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", bio: "", photo_url: "", social_link: "", is_trustee: false });

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("team_members").select("*").order("display_order");
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => {
    setEditMember(null);
    setForm({ name: "", role: "", bio: "", photo_url: "", social_link: "", is_trustee: false });
    setShowModal(true);
  };

  const openEdit = (m: any) => {
    setEditMember(m);
    setForm({ name: m.name, role: m.role, bio: m.bio || "", photo_url: m.photo_url || "", social_link: m.social_link || "", is_trustee: m.is_trustee || false });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.role) { toast.error("Name and role required"); return; }
    if (editMember) {
      await supabase.from("team_members").update(form).eq("id", editMember.id);
    } else {
      await supabase.from("team_members").insert(form);
    }
    await supabase.from("activity_log").insert({
      user_id: user?.id, user_name: profile?.full_name,
      action_type: editMember ? "updated" : "created",
      content_type: "team", content_title: form.name,
    });
    toast.success("Saved!");
    setShowModal(false);
    fetch();
  };

  const staff = members.filter(m => !m.is_trustee);
  const trustees = members.filter(m => m.is_trustee);

  return (
    <AdminShell title="Team Members" breadcrumb="Dashboard > Team">
      <PermissionGuard roles={["super_admin", "editor"]}>
        <div className="flex justify-between items-center mb-6">
          <div />
          <Button onClick={openNew} className="rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Member
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-wapm-deep-purple">No team members yet</p>
          </div>
        ) : (
          <>
            {staff.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-wapm-deep-purple mb-4">Team Members</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map(m => (
                    <Card key={m.id} className="rounded-2xl border-wapm-purple/[0.12]">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-wapm-purple/10 flex items-center justify-center text-wapm-purple font-bold text-lg shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-wapm-deep-purple truncate">{m.name}</h4>
                          <p className="text-xs text-wapm-purple">{m.role}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)} className="h-8 w-8 text-wapm-purple"><Pencil className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" onClick={async () => {
                            if (!confirm(`Remove ${m.name}?`)) return;
                            await supabase.from("team_members").delete().eq("id", m.id);
                            toast.success("Removed"); fetch();
                          }} className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {trustees.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-wapm-deep-purple mb-4">Trustees</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {trustees.map(m => (
                    <Card key={m.id} className="rounded-2xl border-wapm-purple/[0.12]">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-wapm-purple/10 mx-auto flex items-center justify-center text-wapm-purple font-bold mb-2">{m.name.charAt(0)}</div>
                        <h4 className="font-semibold text-wapm-deep-purple text-sm">{m.name}</h4>
                        <p className="text-xs text-muted-foreground">{m.role}</p>
                        <div className="flex justify-center gap-1 mt-2">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)} className="h-7 w-7"><Pencil className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" onClick={async () => {
                            if (!confirm(`Remove ${m.name}?`)) return;
                            await supabase.from("team_members").delete().eq("id", m.id);
                            toast.success("Removed"); fetch();
                          }} className="h-7 w-7 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>{editMember ? "Edit" : "Add"} Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-[10px] mt-1" /></div>
              <div><Label>Role/Title *</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="rounded-[10px] mt-1" /></div>
              <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="rounded-xl mt-1" rows={3} maxLength={200} /><p className="text-xs text-muted-foreground mt-1">{form.bio.length}/200</p></div>
              <div>
                <Label className="mb-1 block">Photo</Label>
                <ImageUpload value={form.photo_url} onChange={v => setForm({ ...form, photo_url: v })} folder="team" />
              </div>
              <div><Label>Social/Email Link</Label><Input value={form.social_link} onChange={e => setForm({ ...form, social_link: e.target.value })} className="rounded-[10px] mt-1" /></div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_trustee} onCheckedChange={v => setForm({ ...form, is_trustee: !!v })} />
                <Label>This person is a Trustee</Label>
              </div>
              <Button onClick={handleSave} className="w-full rounded-full bg-wapm-purple text-white">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
