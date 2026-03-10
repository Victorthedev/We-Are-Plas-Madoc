import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "../../../integrations/superbase/client";
import { Download, X, Search, Users, User } from "lucide-react";
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

  const removeAttendee = async (rsvp: any) => {
    if (!confirm(`Remove ${rsvp.first_name} ${rsvp.last_name} from this event?`)) return;
    await supabase.from("event_rsvps").delete().eq("id", rsvp.id);

    // Send cancellation email
    try {
      await supabase.functions.invoke("handle-rsvp", {
        body: { action: "cancel", token: rsvp.cancellation_token },
      });
    } catch { /* email is best-effort */ }

    toast.success("Attendee removed");
    fetchRsvps();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-wapm-deep-purple">{event?.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">{event?.start_datetime && formatDate(event.start_datetime)}</p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1 text-primary font-medium"><Users className="w-4 h-4" /> {rsvps.length} Registered</span>
            <span className="flex items-center gap-1 text-muted-foreground"><User className="w-4 h-4" /> {totalPeople} Attending</span>
          </div>
        </SheetHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9 rounded-xl" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-full border-primary/20 text-primary">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No RSVPs yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-foreground">Name</th>
                  <th className="text-left p-2 font-semibold text-foreground">Email</th>
                  <th className="text-left p-2 font-semibold text-foreground hidden sm:table-cell">Phone</th>
                  <th className="text-center p-2 font-semibold text-foreground">Size</th>
                  <th className="text-left p-2 font-semibold text-foreground hidden sm:table-cell">Date</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-2 text-foreground">{r.first_name} {r.last_name}</td>
                    <td className="p-2"><a href={`mailto:${r.email}`} className="text-primary hover:underline text-xs">{r.email}</a></td>
                    <td className="p-2 hidden sm:table-cell">{r.phone ? <a href={`tel:${r.phone}`} className="text-primary hover:underline text-xs">{r.phone}</a> : "—"}</td>
                    <td className="p-2 text-center text-foreground">{r.party_size}</td>
                    <td className="p-2 text-xs text-muted-foreground hidden sm:table-cell">{formatDate(r.created_at)}</td>
                    <td className="p-2">
                      <button onClick={() => removeAttendee(r)} className="w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center text-destructive/60 hover:text-destructive transition-colors" title="Remove attendee">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
