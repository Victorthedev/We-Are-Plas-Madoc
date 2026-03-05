import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import RsvpDrawer from "@/components/admin/events/RsvpDrawer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CalendarDays, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-500",
};

export default function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [drawerEvent, setDrawerEvent] = useState<any>(null);
  const [cancelModal, setCancelModal] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from("events").select("*").order("start_datetime", { ascending: false });
    setEvents(data || []);

    // Fetch RSVP counts for all events
    if (data?.length) {
      const { data: rsvps } = await supabase.from("event_rsvps").select("event_id");
      const counts: Record<string, number> = {};
      (rsvps || []).forEach(r => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
      setRsvpCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCancelEvent = async () => {
    if (!cancelModal) return;
    setCancelling(true);

    // Update status to cancelled
    await supabase.from("events").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", cancelModal.id);

    // Notify all attendees
    try {
      const { data } = await supabase.functions.invoke("notify-event-cancellation", {
        body: { event_id: cancelModal.id },
      });

      const count = data?.notified || 0;
      toast.success(`Event cancelled. ${count} attendee${count !== 1 ? "s" : ""} have been notified.`);
    } catch {
      toast.success("Event cancelled.");
    }

    // Log activity
    await supabase.from("activity_log").insert({
      action_type: "cancelled",
      content_type: "event",
      content_title: cancelModal.title,
    });

    setCancelModal(null);
    setCancelling(false);
    fetchEvents();
  };

  return (
    <AdminShell title="Events" breadcrumb="Dashboard > Events">
      <PermissionGuard roles={["super_admin", "editor", "contributor"]}>
        <div className="flex justify-between items-center mb-6">
          <div />
          <Button onClick={() => navigate("/admin/events/new")} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> New Event
          </Button>
        </div>

        <Card className="rounded-2xl border-primary/[0.12] shadow-[0_2px_12px_rgba(45,27,78,0.08)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No events yet</p>
                <Button onClick={() => navigate("/admin/events/new")} className="mt-4 rounded-full bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" /> Create First Event
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary/[0.08]">
                      <th className="text-left p-4 font-semibold text-foreground">Title</th>
                      <th className="text-left p-4 font-semibold text-foreground hidden md:table-cell">Date & Time</th>
                      <th className="text-left p-4 font-semibold text-foreground hidden md:table-cell">Location</th>
                      <th className="text-left p-4 font-semibold text-foreground">Status</th>
                      <th className="text-left p-4 font-semibold text-foreground">RSVPs</th>
                      <th className="text-right p-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => (
                      <tr key={ev.id} className="border-b border-primary/[0.05] hover:bg-muted/50">
                        <td className="p-4 font-medium text-foreground">{ev.title}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">
                          {new Date(ev.start_datetime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {" "}at{" "}
                          {new Date(ev.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">{ev.location || "—"}</td>
                        <td className="p-4">
                          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusColors[ev.status] || "bg-gray-100")}>{ev.status}</span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setDrawerEvent(ev)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Users className="w-3.5 h-3.5" /> {rsvpCounts[ev.id] || 0} RSVPs
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/events/${ev.id}/edit`)} className="h-8 w-8 text-primary"><Pencil className="w-4 h-4" /></Button>
                            {ev.status !== "cancelled" && (
                              <Button size="icon" variant="ghost" onClick={() => setCancelModal(ev)} className="h-8 w-8 text-destructive" title="Cancel event"><Trash2 className="w-4 h-4" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <p className="text-sm text-foreground font-medium">
                👥 {rsvpCounts[cancelModal?.id]} people have RSVP'd and will be notified by email.
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
