import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, UserGearIcon, TrashIcon, ShieldIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/superbase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ALL_ROLES = ["editor", "contributor", "gallery_only", "playground_worker"] as const satisfies readonly AppRole[];

const roleDescriptions: Record<string, string> = {
  editor: "Can publish and manage all content",
  contributor: "Can create content but cannot publish",
  gallery_only: "Can only manage gallery photos",
  playground_worker: "Access to the Visitor Management System (children, parents, attendance)",
};

const roleBadge: Record<string, { label: string; className: string }> = {
  super_admin: { label: "Super Admin", className: "bg-admin-chrome text-white" },
  editor: { label: "Editor", className: "bg-primary text-primary-foreground" },
  contributor: { label: "Contributor", className: "bg-accent text-accent-foreground" },
  gallery_only: { label: "Gallery", className: "bg-wapm-pink text-white" },
  playground_worker: { label: "Playground Worker", className: "bg-wapm-cyan text-white" },
};

export default function AdminStaff() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoles, setInviteRoles] = useState<AppRole[]>(["contributor"]);
  const [inviting, setInviting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [manageTarget, setManageTarget] = useState<{ id: string; name: string } | null>(null);
  const [manageRoles, setManageRoles] = useState<AppRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const [{ data: profs }, { data: rls }, { data: { user } }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("*"),
      supabase.auth.getUser(),
    ]);
    setProfiles(profs || []);
    setCurrentUserId(user?.id || null);
    const map: Record<string, AppRole[]> = {};
    (rls || []).forEach((r: any) => { (map[r.user_id] ||= []).push(r.role); });
    setRoleMap(map);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-staff", {
      body: { user_id: deleteTarget.id },
    });
    if (error) {
      toast.error(error.message || "Failed to delete account");
    } else {
      toast.success(`${deleteTarget.name}'s account has been deleted`);
      fetch();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const openManageRoles = (id: string, name: string) => {
    setManageTarget({ id, name });
    setManageRoles(roleMap[id] || []);
  };

  const toggleManageRole = (role: AppRole, checked: boolean) => {
    setManageRoles((prev) => checked ? [...prev, role] : prev.filter((r) => r !== role));
  };

  const saveRoles = async () => {
    if (!manageTarget) return;
    setSavingRoles(true);
    const current = roleMap[manageTarget.id] || [];
    const toAdd = manageRoles.filter((r) => !current.includes(r));
    const toRemove = current.filter((r) => !manageRoles.includes(r));

    if (toAdd.length > 0) {
      await supabase.from("user_roles").insert(toAdd.map((role) => ({ user_id: manageTarget.id, role })));
    }
    if (toRemove.length > 0) {
      await supabase.from("user_roles").delete().eq("user_id", manageTarget.id).in("role", toRemove);
    }
    toast.success(`Roles updated for ${manageTarget.name}`);
    setSavingRoles(false);
    setManageTarget(null);
    fetch();
  };

  useEffect(() => { fetch(); }, []);

  const formatTimeAgo = (d: string | null) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    return `${days}d ago`;
  };

  const renderBadges = (userId: string) => {
    const userRoles = roleMap[userId] || [];
    if (userRoles.length === 0) return <span className="text-xs text-muted-foreground">No role</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {userRoles.map((r) => {
          const badge = roleBadge[r];
          if (!badge) return null;
          return <span key={r} className={cn("px-2.5 py-1 rounded-full text-xs font-medium", badge.className)}>{badge.label}</span>;
        })}
      </div>
    );
  };

  return (
    <AdminShell title="Staff Accounts" breadcrumb="Dashboard > Staff">
      <PermissionGuard roles={["super_admin"]}>
        <div className="flex justify-end mb-6">
          <Button onClick={() => setShowInvite(true)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Invite Staff
          </Button>
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : profiles.length === 0 ? (
              <div className="p-12 text-center">
                <UserGearIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No staff accounts</p>
              </div>
            ) : (
              <>
                {/* Desktop table, md and up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-admin-border">
                      <th className="text-left p-4 font-semibold text-foreground">Name</th>
                      <th className="text-left p-4 font-semibold text-foreground">Email</th>
                      <th className="text-left p-4 font-semibold text-foreground">Roles</th>
                      <th className="text-left p-4 font-semibold text-foreground hidden lg:table-cell">Last Active</th>
                      <th className="p-4" />
                    </tr></thead>
                    <tbody>
                      {profiles.map(p => {
                        const isSelf = p.id === currentUserId;
                        return (
                          <tr key={p.id} className="border-b border-admin-border/60 hover:bg-muted/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">{p.full_name.charAt(0)}</div>
                                <span className="font-medium text-foreground">{p.full_name}</span>
                                {isSelf && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">You</span>}
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">{p.email}</td>
                            <td className="p-4">{renderBadges(p.id)}</td>
                            <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">{formatTimeAgo(p.last_sign_in)}</td>
                            <td className="p-4">
                              {!isSelf && (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openManageRoles(p.id, p.full_name)}
                                    className="h-9 w-9 text-primary"
                                    aria-label="Manage roles"
                                  >
                                    <ShieldIcon className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeleteTarget({ id: p.id, name: p.full_name })}
                                    className="h-9 w-9 text-destructive hover:text-destructive"
                                    aria-label="Delete account"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list, below md */}
                <div className="md:hidden divide-y divide-admin-border/60">
                  {profiles.map(p => {
                    const isSelf = p.id === currentUserId;
                    return (
                      <div key={p.id} className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{p.full_name.charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground truncate">{p.full_name}</p>
                            {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">You</span>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {renderBadges(p.id)}
                            <span className="text-[10px] text-muted-foreground">{formatTimeAgo(p.last_sign_in)}</span>
                          </div>
                        </div>
                        {!isSelf && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openManageRoles(p.id, p.full_name)}
                              className="h-10 w-10 text-primary"
                              aria-label="Manage roles"
                            >
                              <ShieldIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTarget({ id: p.id, name: p.full_name })}
                              className="h-10 w-10 text-destructive"
                              aria-label="Delete account"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
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
                <Label>Roles (select one or more)</Label>
                <div className="space-y-2 mt-2">
                  {ALL_ROLES.map(r => (
                    <label key={r} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                      inviteRoles.includes(r) ? "border-primary bg-primary/5" : "border-admin-border"
                    )}>
                      <Checkbox
                        checked={inviteRoles.includes(r)}
                        onCheckedChange={(checked) => setInviteRoles((prev) => checked ? [...prev, r] : prev.filter((x) => x !== r))}
                      />
                      <div>
                        <p className="font-medium text-sm capitalize">{r.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{roleDescriptions[r]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                disabled={inviting || !inviteEmail.trim() || !inviteName.trim() || inviteRoles.length === 0}
                onClick={async () => {
                  setInviting(true);
                  const { error } = await supabase.functions.invoke("invite-staff", {
                    body: { email: inviteEmail.trim(), full_name: inviteName.trim(), roles: inviteRoles },
                  });
                  setInviting(false);
                  if (error) {
                    toast.error(error.message || "Failed to send invitation");
                  } else {
                    toast.success(`Invitation sent to ${inviteEmail}`);
                    setShowInvite(false);
                    setInviteEmail("");
                    setInviteName("");
                    setInviteRoles(["contributor"]);
                    fetch();
                  }
                }}
                className="w-full rounded-full bg-primary text-primary-foreground"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage roles */}
        <Dialog open={!!manageTarget} onOpenChange={(o) => !o && setManageTarget(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Manage Roles — {manageTarget?.name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {ALL_ROLES.map(r => (
                <label key={r} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                  manageRoles.includes(r) ? "border-primary bg-primary/5" : "border-admin-border"
                )}>
                  <Checkbox checked={manageRoles.includes(r)} onCheckedChange={(checked) => toggleManageRole(r, !!checked)} />
                  <div>
                    <p className="font-medium text-sm capitalize">{r.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{roleDescriptions[r]}</p>
                  </div>
                </label>
              ))}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setManageTarget(null)} className="rounded-full">Cancel</Button>
              <Button onClick={saveRoles} disabled={savingRoles} className="rounded-full bg-primary text-primary-foreground">
                {savingRoles ? "Saving..." : "Save Roles"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-foreground">Delete staff account?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground text-sm">
              Permanently delete <strong>{deleteTarget?.name}</strong>'s account? This cannot be undone.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">Go Back</Button>
              <Button onClick={handleDelete} disabled={deleting} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleting ? "Deleting..." : "Delete Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
