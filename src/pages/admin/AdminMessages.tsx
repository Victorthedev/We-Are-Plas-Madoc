import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EnvelopeIcon, TrashIcon, ChecksIcon, ArrowSquareOutIcon, CaretLeftIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [replyText, setReplyText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = filter === "all" ? messages : messages.filter(m => filter === "unread" ? !m.read : m.read);

  const markRead = async (id: string, read: boolean) => {
    await supabase.from("messages").update({ read }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read } : m));
    if (selected?.id === id) setSelected({ ...selected, read });
  };

  const markAllRead = async () => {
    await supabase.from("messages").update({ read: true }).eq("read", false);
    toast.success("All marked as read");
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("messages").delete().eq("id", deleteTarget.id);
    toast.success("Deleted");
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    setDeleting(false);
    fetch();
  };

  const openMailto = () => {
    if (!selected || !replyText.trim()) return;
    const subject = encodeURIComponent(`Re: ${selected.subject || "Your message to WAPM"}`);
    const body = encodeURIComponent(replyText.trim());
    window.location.href = `mailto:${selected.email}?subject=${subject}&body=${body}`;
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <AdminShell title="Messages" breadcrumb="Dashboard > Messages">
      <PermissionGuard roles={["super_admin", "editor"]}>
        <div className={cn("items-center gap-4 mb-6", selected ? "hidden lg:flex" : "flex")}>
          <div className="flex gap-2">
            {(["all", "unread", "read"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize border transition-colors",
                  filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20"
                )}>{f}</button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-muted-foreground ml-auto">
            <ChecksIcon className="w-3.5 h-3.5 mr-1" /> Mark all read
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:min-h-[500px]">
          {/* Message list */}
          <Card className={cn("lg:col-span-1 rounded-2xl border-admin-border overflow-hidden", selected ? "hidden lg:block" : "block")}>
            <div className="divide-y divide-admin-border">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <EnvelopeIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No messages</p>
                </div>
              ) : (
                filtered.map(m => (
                  <button key={m.id} onClick={() => { setSelected(m); setReplyText(""); if (!m.read) markRead(m.id, true); }}
                    className={cn("w-full text-left p-4 hover:bg-muted/50 transition-colors",
                      !m.read && "bg-primary/[0.03] border-l-2 border-l-primary",
                      selected?.id === m.id && "bg-muted"
                    )}>
                    <div className="flex justify-between items-start">
                      <span className={cn("text-sm", !m.read ? "font-bold text-foreground" : "text-foreground")}>{m.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(m.created_at)}</span>
                    </div>
                    <p className={cn("text-xs mt-0.5 truncate", !m.read ? "font-semibold text-foreground" : "text-muted-foreground")}>{m.subject || "No subject"}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{m.message.slice(0, 60)}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Message detail */}
          <Card className={cn("lg:col-span-2 rounded-2xl border-admin-border p-6", selected ? "block" : "hidden lg:block")}>
            {!selected ? (
              <div className="hidden lg:flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <EnvelopeIcon className="w-8 h-8 mx-auto mb-2" />
                  <p>Select a message to read it</p>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => setSelected(null)} className="lg:hidden inline-flex items-center gap-1.5 text-sm text-primary mb-4">
                  <CaretLeftIcon className="w-4 h-4" /> Back to messages
                </button>
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-foreground">{selected.subject || "No subject"}</h2>
                    <p className="text-sm mt-1">From: <strong>{selected.name}</strong></p>
                    <p className="text-sm text-muted-foreground break-words">{selected.email}{selected.phone && ` · ${selected.phone}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => markRead(selected.id, !selected.read)} className="h-9 w-9" aria-label="Toggle read">
                      <ChecksIcon className={cn("w-4 h-4", selected.read ? "text-green-600" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(selected)} className="h-9 w-9 text-destructive" aria-label="Delete message">
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="border-t border-admin-border pt-4">
                  <div className="bg-admin-surface rounded-xl p-6 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{selected.message}</div>
                </div>

                {/* Reply form */}
                <div className="border-t border-admin-border pt-4 mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reply to {selected.name}</p>
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Write your reply to ${selected.email}...`}
                    className="rounded-xl text-sm min-h-[120px] resize-none"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                    <p className="text-[11px] text-muted-foreground">Opens your email client with the reply pre-filled</p>
                    <Button
                      onClick={openMailto}
                      disabled={!replyText.trim()}
                      className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm w-full sm:w-auto"
                    >
                      <ArrowSquareOutIcon className="w-3.5 h-3.5 mr-1.5" />
                      Open in Email
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-foreground">Delete message?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground text-sm">This cannot be undone.</p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">Go Back</Button>
              <Button onClick={handleDelete} disabled={deleting} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleting ? "Deleting..." : "Delete Message"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
