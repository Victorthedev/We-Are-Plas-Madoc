import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EyeIcon, CheckIcon, XIcon, HandshakeIcon, WarningIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tabs = ["new", "in-progress", "accepted", "declined", "all"] as const;
const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  "in-progress": "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-500",
};
const positionColors: Record<string, string> = {
  "Volunteer Driver": "bg-accent/10 text-accent",
  "Kettle Club Helper": "bg-primary/10 text-primary",
  "Food Van Assistant": "bg-wapm-pink/10 text-wapm-pink",
};

export default function AdminVolunteers() {
  const { user, profile } = useAuth();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof tabs[number]>("new");
  const [selected, setSelected] = useState<any>(null);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("volunteers").select("*").order("created_at", { ascending: false });
    setVolunteers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = tab === "all" ? volunteers : volunteers.filter(v => v.status === tab);
  const newCount = volunteers.filter(v => v.status === "new").length;

  const updateStatus = async (id: string, status: string, name: string) => {
    await supabase.from("volunteers").update({ status }).eq("id", id);
    await supabase.from("activity_log").insert({
      user_id: user?.id, user_name: profile?.full_name,
      action_type: status, content_type: "volunteer", content_title: name,
    });
    toast.success(`Application ${status}`);
    fetch();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const saveNotes = async () => {
    if (!selected) return;
    await supabase.from("volunteers").update({ internal_notes: selected.internal_notes }).eq("id", selected.id);
    toast.success("Notes saved");
  };

  return (
    <AdminShell title="Volunteer Applications" breadcrumb="Dashboard > Volunteers">
      <PermissionGuard roles={["super_admin", "editor"]}>
        {newCount > 0 && (
          <p className="text-sm text-amber-600 font-medium mb-4 flex items-center gap-1.5">
            <WarningIcon className="w-4 h-4 shrink-0" weight="fill" /> {newCount} new application{newCount === 1 ? "" : "s"} need your attention
          </p>
        )}

        <div className="flex gap-2 flex-wrap mb-6">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border",
                tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20"
              )}>
              {t.replace("-", " ")} ({t === "all" ? volunteers.length : volunteers.filter(v => v.status === t).length})
            </button>
          ))}
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <HandshakeIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No applications</p>
              </div>
            ) : (
              <>
                {/* Desktop table, md and up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-admin-border">
                      <th className="text-left p-4 font-semibold text-foreground">Name</th>
                      <th className="text-left p-4 font-semibold text-foreground">Position</th>
                      <th className="text-left p-4 font-semibold text-foreground hidden lg:table-cell">Date</th>
                      <th className="text-left p-4 font-semibold text-foreground">Status</th>
                      <th className="text-right p-4 font-semibold text-foreground">Actions</th>
                    </tr></thead>
                    <tbody>
                      {filtered.map(v => (
                        <tr key={v.id} className="border-b border-admin-border/60 hover:bg-muted/50">
                          <td className="p-4 font-medium text-foreground">{v.first_name} {v.last_name}</td>
                          <td className="p-4">
                            <span className={cn("px-3 py-1 rounded-full text-xs font-medium", positionColors[v.position] || "bg-gray-100 text-gray-600")}>{v.position}</span>
                          </td>
                          <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">
                            {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="p-4"><span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusColors[v.status])}>{v.status}</span></td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setSelected(v)} className="h-9 w-9 text-primary" aria-label="View application"><EyeIcon className="w-4 h-4" /></Button>
                              {v.status === "new" && <>
                                <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "accepted", `${v.first_name} ${v.last_name}`)} className="h-9 w-9 text-green-600" aria-label="Accept"><CheckIcon className="w-4 h-4" weight="bold" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "declined", `${v.first_name} ${v.last_name}`)} className="h-9 w-9 text-destructive" aria-label="Decline"><XIcon className="w-4 h-4" weight="bold" /></Button>
                              </>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list, below md */}
                <div className="md:hidden divide-y divide-admin-border/60">
                  {filtered.map(v => (
                    <div key={v.id} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-foreground">{v.first_name} {v.last_name}</h3>
                        <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-xs font-medium", statusColors[v.status])}>{v.status}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", positionColors[v.position] || "bg-gray-100 text-gray-600")}>{v.position}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelected(v)} className="h-9 rounded-full border-primary/20 text-primary flex-1"><EyeIcon className="w-3.5 h-3.5 mr-1" /> View</Button>
                        {v.status === "new" && <>
                          <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "accepted", `${v.first_name} ${v.last_name}`)} className="h-9 w-9 text-green-600 shrink-0" aria-label="Accept"><CheckIcon className="w-4 h-4" weight="bold" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "declined", `${v.first_name} ${v.last_name}`)} className="h-9 w-9 text-destructive shrink-0" aria-label="Decline"><XIcon className="w-4 h-4" weight="bold" /></Button>
                        </>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail drawer */}
        <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
          <SheetContent className="w-full sm:w-[480px] overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-foreground">{selected.first_name} {selected.last_name}</SheetTitle>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium inline-block w-fit", statusColors[selected.status])}>{selected.status}</span>
                </SheetHeader>
                <div className="space-y-4 mt-6 text-sm">
                  <div><strong>Email:</strong> <a href={`mailto:${selected.email}`} className="text-primary break-all">{selected.email}</a></div>
                  <div><strong>Phone:</strong> <a href={`tel:${selected.phone}`} className="text-primary">{selected.phone}</a></div>
                  <div><strong>Position:</strong> {selected.position}</div>
                  {selected.start_date && <div><strong>Start date:</strong> {selected.start_date}</div>}
                  {selected.cv_link && <div><strong>CV:</strong> <a href={selected.cv_link} target="_blank" rel="noopener noreferrer" className="text-primary">View</a></div>}
                  {selected.message && <div><strong>Message:</strong><p className="mt-1 text-muted-foreground">{selected.message}</p></div>}
                  <div className="border-t border-border pt-4">
                    <strong>Internal Notes</strong>
                    <Textarea value={selected.internal_notes || ""} onChange={e => setSelected({ ...selected, internal_notes: e.target.value })}
                      onBlur={saveNotes} placeholder="Add notes..." className="mt-2 rounded-xl" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    {selected.status !== "accepted" && <Button onClick={() => updateStatus(selected.id, "accepted", `${selected.first_name} ${selected.last_name}`)} className="rounded-full bg-green-600 hover:bg-green-700 text-white flex-1">Accept</Button>}
                    {selected.status !== "declined" && <Button variant="outline" onClick={() => updateStatus(selected.id, "declined", `${selected.first_name} ${selected.last_name}`)} className="rounded-full border-red-300 text-destructive flex-1">Decline</Button>}
                    {selected.status === "new" && <Button variant="outline" onClick={() => updateStatus(selected.id, "in-progress", `${selected.first_name} ${selected.last_name}`)} className="rounded-full border-primary/20 text-primary flex-1">In Progress</Button>}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </PermissionGuard>
    </AdminShell>
  );
}
