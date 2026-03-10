import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Eye, Check, X, Handshake } from "lucide-react";
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
  "Volunteer Driver": "bg-wapm-cyan/10 text-wapm-cyan",
  "Kettle Club Helper": "bg-wapm-purple/10 text-wapm-purple",
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
        {newCount > 0 && <p className="text-sm text-amber-600 font-medium mb-4">⚠️ {newCount} new applications need your attention</p>}

        <div className="flex gap-2 flex-wrap mb-6">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border",
                tab === t ? "bg-wapm-purple text-white border-wapm-purple" : "bg-white text-wapm-purple border-wapm-purple/20"
              )}>
              {t.replace("-", " ")} ({t === "all" ? volunteers.length : volunteers.filter(v => v.status === t).length})
            </button>
          ))}
        </div>

        <Card className="rounded-2xl border-wapm-purple/[0.12] shadow-[0_2px_12px_rgba(45,27,78,0.08)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-wapm-deep-purple">No applications</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-wapm-purple/[0.08]">
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple">Name</th>
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple hidden md:table-cell">Position</th>
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple hidden lg:table-cell">Date</th>
                  <th className="text-left p-4 font-semibold text-wapm-deep-purple">Status</th>
                  <th className="text-right p-4 font-semibold text-wapm-deep-purple">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id} className="border-b border-wapm-purple/[0.05] hover:bg-wapm-lavender/50">
                      <td className="p-4 font-medium text-wapm-deep-purple">{v.first_name} {v.last_name}</td>
                      <td className="p-4 hidden md:table-cell">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium", positionColors[v.position] || "bg-gray-100 text-gray-600")}>{v.position}</span>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">
                        {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-4"><span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusColors[v.status])}>{v.status}</span></td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setSelected(v)} className="h-8 w-8 text-wapm-purple"><Eye className="w-4 h-4" /></Button>
                          {v.status === "new" && <>
                            <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "accepted", `${v.first_name} ${v.last_name}`)} className="h-8 w-8 text-green-600"><Check className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => updateStatus(v.id, "declined", `${v.first_name} ${v.last_name}`)} className="h-8 w-8 text-red-500"><X className="w-4 h-4" /></Button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Detail drawer */}
        <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
          <SheetContent className="w-full sm:w-[480px] overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-wapm-deep-purple">{selected.first_name} {selected.last_name}</SheetTitle>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium inline-block w-fit", statusColors[selected.status])}>{selected.status}</span>
                </SheetHeader>
                <div className="space-y-4 mt-6 text-sm">
                  <div><strong>Email:</strong> <a href={`mailto:${selected.email}`} className="text-wapm-purple">{selected.email}</a></div>
                  <div><strong>Phone:</strong> <a href={`tel:${selected.phone}`} className="text-wapm-purple">{selected.phone}</a></div>
                  <div><strong>Position:</strong> {selected.position}</div>
                  {selected.start_date && <div><strong>Start date:</strong> {selected.start_date}</div>}
                  {selected.cv_link && <div><strong>CV:</strong> <a href={selected.cv_link} target="_blank" className="text-wapm-purple">View</a></div>}
                  {selected.message && <div><strong>Message:</strong><p className="mt-1 text-muted-foreground">{selected.message}</p></div>}
                  <div className="border-t pt-4">
                    <strong>Internal Notes</strong>
                    <Textarea value={selected.internal_notes || ""} onChange={e => setSelected({ ...selected, internal_notes: e.target.value })}
                      onBlur={saveNotes} placeholder="Add notes..." className="mt-2 rounded-xl" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    {selected.status !== "accepted" && <Button onClick={() => updateStatus(selected.id, "accepted", `${selected.first_name} ${selected.last_name}`)} className="rounded-full bg-green-600 text-white flex-1">Accept</Button>}
                    {selected.status !== "declined" && <Button variant="outline" onClick={() => updateStatus(selected.id, "declined", `${selected.first_name} ${selected.last_name}`)} className="rounded-full border-red-300 text-red-500 flex-1">Decline</Button>}
                    {selected.status === "new" && <Button variant="outline" onClick={() => updateStatus(selected.id, "in-progress", `${selected.first_name} ${selected.last_name}`)} className="rounded-full border-wapm-purple/20 text-wapm-purple flex-1">In Progress</Button>}
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
