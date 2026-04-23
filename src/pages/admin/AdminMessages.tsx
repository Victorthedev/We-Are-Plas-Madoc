import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Trash2, CheckCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminMessages() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await supabase.from("messages").delete().eq("id", id);
    toast.success("Deleted");
    if (selected?.id === id) setSelected(null);
    fetch();
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    const { error } = await supabase.functions.invoke("send-reply", {
      body: {
        to_email: selected.email,
        to_name: selected.name,
        original_subject: selected.subject,
        reply_body: replyText.trim(),
        staff_name: profile?.full_name || "The WAPM Team",
      },
    });
    setReplying(false);
    if (error) {
      toast.error("Failed to send reply. Please try again.");
    } else {
      toast.success(`Reply sent to ${selected.name}`);
      setReplyText("");
    }
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
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(["all", "unread", "read"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize border transition-colors",
                  filter === f ? "bg-wapm-purple text-white border-wapm-purple" : "bg-white text-wapm-purple border-wapm-purple/20"
                )}>{f}</button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-muted-foreground ml-auto">
            <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
          {/* Message list */}
          <Card className="lg:col-span-1 rounded-2xl border-wapm-purple/[0.12] overflow-hidden">
            <div className="divide-y divide-wapm-purple/[0.08]">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No messages</p>
                </div>
              ) : (
                filtered.map(m => (
                  <button key={m.id} onClick={() => { setSelected(m); setReplyText(""); if (!m.read) markRead(m.id, true); }}
                    className={cn("w-full text-left p-4 hover:bg-wapm-lavender/50 transition-colors",
                      !m.read && "bg-wapm-purple/[0.03] border-l-2 border-l-wapm-purple",
                      selected?.id === m.id && "bg-wapm-lavender"
                    )}>
                    <div className="flex justify-between items-start">
                      <span className={cn("text-sm", !m.read ? "font-bold text-wapm-deep-purple" : "text-wapm-deep-purple")}>{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                    </div>
                    <p className={cn("text-xs mt-0.5 truncate", !m.read ? "font-semibold text-wapm-deep-purple" : "text-muted-foreground")}>{m.subject || "No subject"}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{m.message.slice(0, 60)}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Message detail */}
          <Card className="lg:col-span-2 rounded-2xl border-wapm-purple/[0.12] p-6">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Mail className="w-8 h-8 mx-auto mb-2" />
                  <p>Select a message to read it</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-wapm-deep-purple">{selected.subject || "No subject"}</h2>
                    <p className="text-sm mt-1">From: <strong>{selected.name}</strong></p>
                    <p className="text-sm text-muted-foreground">{selected.email}{selected.phone && ` • ${selected.phone}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => markRead(selected.id, !selected.read)} className="h-8 w-8">
                      <CheckCheck className={cn("w-4 h-4", selected.read ? "text-green-600" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(selected.id)} className="h-8 w-8 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="border-t border-wapm-purple/[0.08] pt-4">
                  <div className="bg-wapm-lavender rounded-xl p-6 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{selected.message}</div>
                </div>

                {/* Reply form */}
                <div className="border-t border-wapm-purple/[0.08] pt-4 mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reply to {selected.name}</p>
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Write your reply to ${selected.email}...`}
                    className="rounded-xl text-sm min-h-[120px] resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={sendReply}
                      disabled={replying || !replyText.trim()}
                      className="rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white text-sm"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {replying ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </PermissionGuard>
    </AdminShell>
  );
}
