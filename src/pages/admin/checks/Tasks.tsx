import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, KanbanIcon, CheckCircleIcon, UserCircleIcon, ClipboardTextIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PLAYGROUNDS, formatPlayground } from "@/lib/vms";
import { fetchTasks, createTask, updateTaskStatus, fetchStaffOptions, type TaskRow, type StaffOption } from "@/lib/dailyLog";

const emptyForm = { title: "", description: "", playground: "", assigned_to: "" };

export default function Tasks() {
  const { user } = useAuth();
  const location = useLocation();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "open" | "resolved">("mine");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<TaskRow | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [prefillLogCheckId, setPrefillLogCheckId] = useState<string | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    const [t, s] = await Promise.all([fetchTasks(), fetchStaffOptions()]);
    setTasks(t);
    setStaff(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (prefill) {
      setForm({
        title: prefill.title || "",
        description: prefill.description || "",
        playground: prefill.playground || "",
        assigned_to: "",
      });
      setPrefillLogCheckId(prefill.daily_log_check_id);
      setShowForm(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const filtered = tasks.filter((t) => {
    if (tab === "mine") return t.assigned_to === user?.id && t.status !== "resolved";
    if (tab === "open") return t.status !== "resolved";
    return t.status === "resolved";
  });

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.full_name || "Unassigned";

  const openNew = () => {
    setForm(emptyForm);
    setPrefillLogCheckId(undefined);
    setShowForm(true);
  };

  const saveTask = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    try {
      await createTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        playground: form.playground || null,
        assigned_to: form.assigned_to || null,
        created_by: user.id,
        daily_log_check_id: prefillLogCheckId,
      });
      toast.success("Task created");
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not create the task");
    }
    setSaving(false);
  };

  const setStatus = async (task: TaskRow, status: TaskRow["status"]) => {
    if (status === "resolved") {
      setResolveTarget(task);
      setResolveNotes("");
      return;
    }
    await updateTaskStatus(task.id, status);
    load();
  };

  const confirmResolve = async () => {
    if (!resolveTarget) return;
    await updateTaskStatus(resolveTarget.id, "resolved", resolveNotes.trim() || undefined);
    setResolveTarget(null);
    load();
  };

  return (
    <AdminShell title="Tasks" breadcrumb="Dashboard > Daily Log > Tasks">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setTab("mine")}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                tab === "mine" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              Assigned to Me
            </button>
            <button onClick={() => setTab("open")}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                tab === "open" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              All Open
            </button>
            <button onClick={() => setTab("resolved")}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                tab === "resolved" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              Resolved
            </button>
          </div>
          <Button onClick={openNew} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> New Task
          </Button>
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <KanbanIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No tasks here</p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {filtered.map((t) => (
                  <div key={t.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="font-medium text-foreground">{t.title}</p>
                      <span className={cn("shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                        t.status === "resolved" ? "bg-green-100 text-green-700" : t.status === "in_progress" ? "bg-wapm-cyan/20 text-wapm-cyan" : "bg-amber-100 text-amber-700")}>
                        {t.status === "resolved" ? "Resolved" : t.status === "in_progress" ? "In Progress" : "Open"}
                      </span>
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <UserCircleIcon className="w-3.5 h-3.5" /> {staffName(t.assigned_to)}
                      {t.playground && ` · ${formatPlayground(t.playground)}`}
                      {" · "}{format(new Date(t.created_at), "d MMM yyyy")}
                    </p>
                    {t.status === "resolved" && t.resolved_notes && (
                      <p className="text-xs text-green-700 mb-2">Resolved: {t.resolved_notes}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {t.sourceLog && (
                        <Link
                          to={`/admin/checks/log/${t.sourceLog.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 h-8 rounded-full text-xs font-medium border border-admin-border text-primary hover:bg-primary/5 transition-colors"
                        >
                          <ClipboardTextIcon className="w-3.5 h-3.5" /> View Full Log ({format(new Date(t.sourceLog.log_date), "d MMM")})
                        </Link>
                      )}
                      {t.status !== "resolved" && (
                        <>
                          {t.status === "open" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(t, "in_progress")} className="h-8 rounded-full border-primary/20 text-primary">
                              Mark In Progress
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setStatus(t, "resolved")} className="h-8 rounded-full border-wapm-green/30 text-wapm-green">
                            <CheckCircleIcon className="w-3.5 h-3.5 mr-1" weight="fill" /> Resolve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-[10px] mt-1" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Playground</Label>
                  <Select value={form.playground} onValueChange={(v) => setForm({ ...form, playground: v })}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Not site-specific" /></SelectTrigger>
                    <SelectContent>
                      {PLAYGROUNDS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Assign To</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-full">Cancel</Button>
              <Button onClick={saveTask} disabled={saving || !form.title.trim()} className="rounded-full bg-primary text-primary-foreground">
                {saving ? "Saving..." : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Resolve {resolveTarget?.title}</DialogTitle></DialogHeader>
            <div>
              <Label className="text-xs">What was done? (optional)</Label>
              <Textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} className="rounded-xl mt-1" rows={3} placeholder="e.g. Electrician booked and fixed" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setResolveTarget(null)} className="rounded-full">Cancel</Button>
              <Button onClick={confirmResolve} className="rounded-full bg-wapm-green hover:bg-wapm-green/90 text-white">Mark Resolved</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
