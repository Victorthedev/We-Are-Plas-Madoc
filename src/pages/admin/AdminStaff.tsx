import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, UserCog, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleBadge: Record<string, { label: string; className: string }> = {
  super_admin: { label: "Super Admin", className: "bg-wapm-deep-purple text-white" },
  editor: { label: "Editor", className: "bg-wapm-purple text-white" },
  contributor: { label: "Contributor", className: "bg-wapm-cyan text-white" },
  gallery_only: { label: "Gallery", className: "bg-wapm-pink text-white" },
};

export default function AdminStaff() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("contributor");
  const [inviting, setInviting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const [{ data: profs }, { data: rls }, { data: { user } }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("*"),
      supabase.auth.getUser(),
    ]);
    setProfiles(profs || []);
    setCurrentUserId(user?.id || null);
    const roleMap: Record<string, string> = {};
    (rls || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);
    setLoading(false);
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Permanently delete ${name}'s account? This cannot be undone.`)) return;
    const { error } = await supabase.functions.invoke("delete-staff", {
      body: { user_id: userId },
    });
    if (error) {
      toast.error(error.message || "Failed to delete account");
    } else {
      toast.success(`${name}'s account has been deleted`);
      fetch();
    }
  };

  useEffect(() => { fetch(); }, []);

  const formatTimeAgo = (d: string | null) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    return `${days}d ago`;
  };

  return (
    <AdminShell title="Staff Accounts" breadcrumb="Dashboard > Staff">
      <PermissionGuard roles={["super_admin"]}>
        <div className="flex justify-between items-center mb-6">
          <div />
          <Button onClick={() => setShowInvite(true)} className="rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white">
            <Plus className="w-4 h-4 mr-1" /> Invite Staff
          </Button>
        </div>

        <Card className="rounded-2xl border-wapm-purple/[0.12] shadow-[0_2px_12px_rgba(45,27,78,0.08)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : profiles.length === 0 ? (
              <div className="p-12 text-center">
                <UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-wapm-deep-purple">No staff accounts</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-wapm-purple/[0.08]">
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple">Name</th>
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple hidden md:table-cell">Email</th>
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple">Role</th>
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple hidden lg:table-cell">Last Active</th>
                  <th className="p-4" />
                </tr></thead>
                <tbody>
                  {profiles.map(p => {
                    const r = roles[p.id];
                    const badge = r ? roleBadge[r] : null;
                    const isSelf = p.id === currentUserId;
                    return (
                      <tr key={p.id} className="border-b border-wapm-purple/[0.05] hover:bg-wapm-lavender/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-wapm-purple/10 flex items-center justify-center text-wapm-purple font-bold text-xs">{p.full_name.charAt(0)}</div>
                            <span className="font-medium text-wapm-deep-purple">{p.full_name}</span>
                            {isSelf && <span className="text-[10px] px-2 py-0.5 rounded-full bg-wapm-lavender text-muted-foreground">You</span>}
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground">{p.email}</td>
                        <td className="p-4">
                          {badge ? (
                            <span className={cn("px-3 py-1 rounded-full text-xs font-medium", badge.className)}>{badge.label}</span>
                          ) : <span className="text-xs text-muted-foreground">No role</span>}
                        </td>
                        <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">{formatTimeAgo(p.last_sign_in)}</td>
                        <td className="p-4 text-right">
                          {!isSelf && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(p.id, p.full_name)}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Invite Staff Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Email *</Label><Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="rounded-[10px] mt-1" /></div>
              <div><Label>Full Name *</Label><Input value={inviteName} onChange={e => setInviteName(e.target.value)} className="rounded-[10px] mt-1" /></div>
              <div>
                <Label>Role</Label>
                <div className="space-y-2 mt-2">
                  {(["editor", "contributor", "gallery_only"] as const).map(r => (
                    <label key={r} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                      inviteRole === r ? "border-wapm-purple bg-wapm-purple/5" : "border-wapm-purple/10"
                    )}>
                      <input type="radio" name="role" checked={inviteRole === r} onChange={() => setInviteRole(r)} className="text-wapm-purple" />
                      <div>
                        <p className="font-medium text-sm capitalize">{r.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {r === "editor" && "Can publish and manage all content"}
                          {r === "contributor" && "Can create content but cannot publish"}
                          {r === "gallery_only" && "Can only manage gallery photos"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
                onClick={async () => {
                  setInviting(true);
                  const { error } = await supabase.functions.invoke("invite-staff", {
                    body: { email: inviteEmail.trim(), full_name: inviteName.trim(), role: inviteRole },
                  });
                  setInviting(false);
                  if (error) {
                    toast.error(error.message || "Failed to send invitation");
                  } else {
                    toast.success(`Invitation sent to ${inviteEmail}`);
                    setShowInvite(false);
                    setInviteEmail("");
                    setInviteName("");
                    setInviteRole("contributor");
                    fetch();
                  }
                }}
                className="w-full rounded-full bg-wapm-purple text-white"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
