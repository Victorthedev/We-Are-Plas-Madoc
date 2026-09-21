import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BellIcon, CakeIcon, StudentIcon, WarningIcon, UserPlusIcon, CheckIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: any; className: string }> = {
  birthday: { icon: CakeIcon, className: "bg-wapm-pink/10 text-wapm-pink" },
  youth_transition: { icon: StudentIcon, className: "bg-wapm-cyan/10 text-wapm-cyan" },
  absence_3mo: { icon: WarningIcon, className: "bg-amber-100 text-amber-700" },
  absence_1yr: { icon: WarningIcon, className: "bg-destructive/10 text-destructive" },
  new_registration: { icon: UserPlusIcon, className: "bg-primary/10 text-primary" },
};

export default function VmsNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRead, setShowRead] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const filtered = notifications.filter((n) => showRead || !n.is_read);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <AdminShell title="Notifications" breadcrumb="Dashboard > Visitor Management > Notifications">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setShowRead(false)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                !showRead ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setShowRead(true)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                showRead ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5")}
            >
              All
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead} className="rounded-full border-admin-border w-full sm:w-auto">
              <CheckIcon className="w-4 h-4 mr-1" weight="bold" /> Mark all as read
            </Button>
          )}
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <BellIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">
                  {showRead ? "No notifications yet" : "You're all caught up"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {filtered.map((n) => {
                  const meta = TYPE_META[n.notification_type] || { icon: BellIcon, className: "bg-muted text-muted-foreground" };
                  return (
                    <div key={n.id} className={cn("p-4 flex items-start gap-3", !n.is_read && "bg-primary/5")}>
                      <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.className)}>
                        <meta.icon className="w-5 h-5" weight="duotone" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <Button size="icon" variant="ghost" onClick={() => markRead(n.id)} className="h-9 w-9 text-primary shrink-0" aria-label="Mark as read">
                          <CheckCircleIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </AdminShell>
  );
}
