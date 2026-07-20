import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import RsvpDrawer from "@/components/admin/events/RsvpDrawer";
import { supabase } from "../../integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, PencilSimpleIcon, TrashIcon, CalendarBlankIcon, UsersIcon, MagnifyingGlassIcon, MapPinIcon, ClockIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tabs = ["all", "published", "draft", "cancelled"] as const;
const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-500",
};

export default function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<typeof tabs[number]>("all");
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [drawerEvent, setDrawerEvent] = useState<any>(null);
  const [cancelModal, setCancelModal] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from("events").select("*").order("start_datetime", { ascending: false });
    setEvents(data || []);

    if (data?.length) {
      const { data: rsvps } = await supabase.from("event_rsvps").select("event_id");
      const counts: Record<string, number> = {};
      (rsvps || []).forEach(r => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
      setRsvpCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const filtered = events.filter(e => {
    if (tab !== "all" && e.status !== tab) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCancelEvent = async () => {
    if (!cancelModal) return;
    setCancelling(true);

    await supabase.from("events").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", cancelModal.id);

    try {
      const { data } = await supabase.functions.invoke("notify-event-cancellation", {
        body: { event_id: cancelModal.id },
      });
      const count = data?.notified || 0;
      toast.success(`Event cancelled. ${count} attendee${count !== 1 ? "s" : ""} have been notified.`);
    } catch {
      toast.success("Event cancelled.");
    }

    await supabase.from("activity_log").insert({
      action_type: "cancelled",
      content_type: "event",
      content_title: cancelModal.title,
    });

    setCancelModal(null);
    setCancelling(false);
    fetchEvents();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <AdminShell title="Events" breadcrumb="Dashboard > Events">
      <PermissionGuard roles={["super_admin", "editor", "contributor"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border",
                  tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
                )}
              >
                {t} ({events.filter(e => t === "all" ? true : e.status === t).length})
              </button>
            ))}
          </div>
          <Button onClick={() => navigate("/admin/events/new")} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> New Event
          </Button>
        </div>

        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search events by title..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarBlankIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No events found</p>
                {events.length === 0 && (
                  <Button onClick={() => navigate("/admin/events/new")} className="mt-4 rounded-full bg-primary text-primary-foreground">
                    <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Create First Event
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table, md and up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-admin-border">
                        <th className="text-left p-4 font-semibold text-foreground">Title</th>
                        <th className="text-left p-4 font-semibold text-foreground">Date & Time</th>
                        <th className="text-left p-4 font-semibold text-foreground">Location</th>
                        <th className="text-left p-4 font-semibold text-foreground">Status</th>
                        <th className="text-left p-4 font-semibold text-foreground">RSVPs</th>
                        <th className="text-right p-4 font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(ev => (
                        <tr key={ev.id} className="border-b border-admin-border/60 hover:bg-muted/50">
                          <td className="p-4 font-medium text-foreground">{ev.title}</td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {formatDate(ev.start_datetime)} at {formatTime(ev.start_datetime)}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{ev.location || "TBC"}</td>
                          <td className="p-4">
                            <span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusColors[ev.status] || "bg-gray-100")}>{ev.status}</span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setDrawerEvent(ev)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              <UsersIcon className="w-3.5 h-3.5" /> {rsvpCounts[ev.id] || 0} RSVPs
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/events/${ev.id}/edit`)} className="h-9 w-9 text-primary" aria-label="Edit event"><PencilSimpleIcon className="w-4 h-4" /></Button>
                              {ev.status !== "cancelled" && (
                                <Button size="icon" variant="ghost" onClick={() => setCancelModal(ev)} className="h-9 w-9 text-destructive" aria-label="Cancel event"><TrashIcon className="w-4 h-4" /></Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list, below md */}
                <div className="md:hidden divide-y divide-admin-border/60">
                  {filtered.map(ev => (
                    <div key={ev.id} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-foreground">{ev.title}</h3>
                        <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-xs font-medium", statusColors[ev.status] || "bg-gray-100")}>{ev.status}</span>
                      </div>
                      <div className="space-y-1 mb-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 shrink-0" /> {formatDate(ev.start_datetime)} at {formatTime(ev.start_datetime)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {ev.location || "TBC"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setDrawerEvent(ev)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary h-9 px-3 rounded-full border border-primary/20"
                        >
                          <UsersIcon className="w-3.5 h-3.5" /> {rsvpCounts[ev.id] || 0} RSVPs
                        </button>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/events/${ev.id}/edit`)} className="h-10 w-10 text-primary" aria-label="Edit event"><PencilSimpleIcon className="w-4 h-4" /></Button>
                          {ev.status !== "cancelled" && (
                            <Button size="icon" variant="ghost" onClick={() => setCancelModal(ev)} className="h-10 w-10 text-destructive" aria-label="Cancel event"><TrashIcon className="w-4 h-4" /></Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* RSVP Drawer */}
        <RsvpDrawer open={!!drawerEvent} onOpenChange={(o) => !o && setDrawerEvent(null)} event={drawerEvent} />

        {/* Cancel Event Modal */}
        <Dialog open={!!cancelModal} onOpenChange={(o) => !o && setCancelModal(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Cancel Event</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Are you sure you want to cancel <strong>{cancelModal?.title}</strong>?
            </p>
            {(rsvpCounts[cancelModal?.id] || 0) > 0 && (
              <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4" weight="duotone" /> {rsvpCounts[cancelModal?.id]} people have RSVP'd and will be notified by email.
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setCancelModal(null)} className="rounded-full">Go Back</Button>
              <Button onClick={handleCancelEvent} disabled={cancelling} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {cancelling ? "Cancelling..." : "Cancel Event & Notify Attendees"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
