import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "../../../integrations/superbase/client";
import { DownloadIcon, XIcon, MagnifyingGlassIcon, UsersIcon, UserIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

interface RsvpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: { id: string; title: string; start_datetime: string } | null;
}

export default function RsvpDrawer({ open, onOpenChange, event }: RsvpDrawerProps) {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [removeTarget, setRemoveTarget] = useState<any>(null);
  const [removing, setRemoving] = useState(false);

  const fetchRsvps = async () => {
    if (!event) return;
    setLoading(true);
    const { data } = await supabase.from("event_rsvps").select("*").eq("event_id", event.id).order("created_at", { ascending: false });
    setRsvps(data || []);
    setLoading(false);
  };

  useEffect(() => { if (open && event) fetchRsvps(); }, [open, event?.id]);

  const totalPeople = rsvps.reduce((sum, r) => sum + (r.party_size || 1), 0);

  const filtered = rsvps.filter(r => {
    const q = search.toLowerCase();
    return !q || `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const exportCsv = () => {
    const header = "First Name,Last Name,Email,Phone,Party Size,Registration Date\n";
    const rows = rsvps.map(r =>
      `"${r.first_name}","${r.last_name}","${r.email}","${r.phone || ""}",${r.party_size},"${new Date(r.created_at).toLocaleDateString("en-GB")}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rsvps-${event?.title?.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeAttendee = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    await supabase.from("event_rsvps").delete().eq("id", removeTarget.id);

    try {
      await supabase.functions.invoke("handle-rsvp", {
        body: { action: "cancel", token: removeTarget.cancellation_token },
      });
    } catch { /* email is best-effort */ }

    toast.success("Attendee removed");
    setRemoving(false);
    setRemoveTarget(null);
    fetchRsvps();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-foreground">{event?.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">{event?.start_datetime && formatDate(event.start_datetime)}</p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1 text-primary font-medium"><UsersIcon className="w-4 h-4" /> {rsvps.length} Registered</span>
            <span className="flex items-center gap-1 text-muted-foreground"><UserIcon className="w-4 h-4" /> {totalPeople} Attending</span>
          </div>
        </SheetHeader>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9 rounded-xl" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-full border-primary/20 text-primary">
            <DownloadIcon className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No RSVPs yet</p>
        ) : (
          <>
            {/* Table, sm and up */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-foreground">Name</th>
                    <th className="text-left p-2 font-semibold text-foreground">Email</th>
                    <th className="text-left p-2 font-semibold text-foreground">Phone</th>
                    <th className="text-center p-2 font-semibold text-foreground">Size</th>
                    <th className="text-left p-2 font-semibold text-foreground">Date</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="p-2 text-foreground">{r.first_name} {r.last_name}</td>
                      <td className="p-2"><a href={`mailto:${r.email}`} className="text-primary hover:underline text-xs">{r.email}</a></td>
                      <td className="p-2">{r.phone ? <a href={`tel:${r.phone}`} className="text-primary hover:underline text-xs">{r.phone}</a> : "-"}</td>
                      <td className="p-2 text-center text-foreground">{r.party_size}</td>
                      <td className="p-2 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                      <td className="p-2">
                        <button onClick={() => setRemoveTarget(r)} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center text-destructive/60 hover:text-destructive transition-colors" title="Remove attendee" aria-label="Remove attendee">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card list, below sm */}
            <div className="sm:hidden divide-y divide-border/50">
              {filtered.map(r => (
                <div key={r.id} className="py-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium">{r.first_name} {r.last_name}</p>
                    <a href={`mailto:${r.email}`} className="text-primary hover:underline text-xs block truncate">{r.email}</a>
                    {r.phone && <a href={`tel:${r.phone}`} className="text-primary hover:underline text-xs block">{r.phone}</a>}
                    <p className="text-xs text-muted-foreground mt-1">{r.party_size} attending &middot; {formatDate(r.created_at)}</p>
                  </div>
                  <button onClick={() => setRemoveTarget(r)} className="shrink-0 w-10 h-10 rounded-full hover:bg-destructive/10 flex items-center justify-center text-destructive/60 hover:text-destructive transition-colors" aria-label="Remove attendee">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Remove attendee confirmation */}
        <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Remove attendee</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Remove <strong>{removeTarget?.first_name} {removeTarget?.last_name}</strong> from this event? They'll receive a cancellation email.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRemoveTarget(null)} className="rounded-full">Go Back</Button>
              <Button onClick={removeAttendee} disabled={removing} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {removing ? "Removing..." : "Remove Attendee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
