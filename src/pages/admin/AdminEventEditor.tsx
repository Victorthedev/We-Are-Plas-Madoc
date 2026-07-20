import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "../../integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeftIcon, FloppyDiskIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import ImageUpload from "@/components/ui/ImageUpload";

const MAX_RECURRENCE_INSTANCES = 104; // 2 years of weekly events, a sane upper bound

export default function AdminEventEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user, profile, hasPermission } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [externalLink, setExternalLink] = useState("");
  const [status, setStatus] = useState("draft");
  const [recurrenceRule, setRecurrenceRule] = useState("none");
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [saving, setSaving] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingRecurrence, setPendingRecurrence] = useState<{ count: number; newStatus?: string } | null>(null);

  const snapshot = () => JSON.stringify({
    title, description, startDate, startTime, endDate, endTime, location, eventType,
    posterUrl, isFree, externalLink, status, recurrenceRule, recurrenceUntil,
  });
  const isDirty = initialSnapshot !== "" && snapshot() !== initialSnapshot;

  useEffect(() => {
    if (!isNew && id) {
      supabase.from("events").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setDescription(data.description || "");
          const s = new Date(data.start_datetime);
          setStartDate(s.toISOString().split("T")[0]);
          setStartTime(s.toTimeString().slice(0, 5));
          if (data.end_datetime) {
            const e = new Date(data.end_datetime);
            setEndDate(e.toISOString().split("T")[0]);
            setEndTime(e.toTimeString().slice(0, 5));
          }
          setLocation(data.location || "");
          setEventType(data.event_type || "");
          setPosterUrl(data.poster_image_url || "");
          setIsFree(data.is_free ?? true);
          setExternalLink(data.external_link || "");
          setStatus(data.status);
          setRecurrenceRule(data.recurrence_rule || "none");
          setRecurrenceUntil(data.recurrence_until || "");
          // Snapshot taken after next render, once state above has committed
          requestAnimationFrame(() => setInitialSnapshot(JSON.stringify({
            title: data.title, description: data.description || "",
            startDate: s.toISOString().split("T")[0], startTime: s.toTimeString().slice(0, 5),
            endDate: data.end_datetime ? new Date(data.end_datetime).toISOString().split("T")[0] : "",
            endTime: data.end_datetime ? new Date(data.end_datetime).toTimeString().slice(0, 5) : "",
            location: data.location || "", eventType: data.event_type || "",
            posterUrl: data.poster_image_url || "", isFree: data.is_free ?? true,
            externalLink: data.external_link || "", status: data.status,
            recurrenceRule: data.recurrence_rule || "none", recurrenceUntil: data.recurrence_until || "",
          })));
        }
      });
    } else {
      setInitialSnapshot(snapshot());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Warn on tab close / refresh / external navigation if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const goBack = () => {
    if (isDirty) setShowDiscardConfirm(true);
    else navigate("/admin/events");
  };

  const countRecurrenceInstances = () => {
    if (recurrenceRule === "none" || !recurrenceUntil || !startDate) return 0;
    const untilDate = new Date(recurrenceUntil);
    const stepDays = recurrenceRule === "weekly" ? 7 : recurrenceRule === "fortnightly" ? 14 : 30;
    let count = 0;
    let cursor = new Date(`${startDate}T${startTime || "00:00"}`);
    cursor.setDate(cursor.getDate() + stepDays);
    while (cursor <= untilDate && count < MAX_RECURRENCE_INSTANCES + 1) {
      count++;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + stepDays);
    }
    return count;
  };

  const save = async (newStatus?: string) => {
    if (!title.trim() || !startDate) { toast.error("Title and start date required"); return; }

    // Recurring + new event: confirm the number of instances before committing
    if (isNew && recurrenceRule !== "none" && recurrenceUntil && !pendingRecurrence) {
      const count = countRecurrenceInstances();
      if (count > 0) {
        setPendingRecurrence({ count, newStatus });
        return;
      }
    }

    setSaving(true);
    const finalStatus = newStatus || status;
    const startDatetime = new Date(`${startDate}T${startTime || "00:00"}`).toISOString();
    const endDatetime = endDate ? new Date(`${endDate}T${endTime || "23:59"}`).toISOString() : null;
    const durationMs = endDatetime ? new Date(endDatetime).getTime() - new Date(startDatetime).getTime() : null;

    const basePayload = {
      title, description, start_datetime: startDatetime, end_datetime: endDatetime,
      location: location || null, event_type: eventType || null,
      poster_image_url: posterUrl || null, is_free: isFree,
      external_link: externalLink || null, status: finalStatus,
      recurrence_rule: recurrenceRule,
      recurrence_until: recurrenceRule !== "none" && recurrenceUntil ? recurrenceUntil : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isNew) {
      const { data: inserted, error: insertErr } = await supabase.from("events").insert(basePayload).select("id").single();
      error = insertErr;

      if (!insertErr && inserted && recurrenceRule !== "none" && recurrenceUntil) {
        const untilDate = new Date(recurrenceUntil);
        const stepDays = recurrenceRule === "weekly" ? 7 : recurrenceRule === "fortnightly" ? 14 : 30;
        const instances = [];
        let cursor = new Date(startDatetime);
        cursor.setDate(cursor.getDate() + stepDays);
        while (cursor <= untilDate && instances.length < MAX_RECURRENCE_INSTANCES) {
          const instanceStart = cursor.toISOString();
          const instanceEnd = durationMs ? new Date(cursor.getTime() + durationMs).toISOString() : null;
          instances.push({
            ...basePayload,
            start_datetime: instanceStart,
            end_datetime: instanceEnd,
            recurrence_parent_id: inserted.id,
          });
          cursor = new Date(cursor);
          cursor.setDate(cursor.getDate() + stepDays);
        }
        if (instances.length > 0) {
          await supabase.from("events").insert(instances);
        }
      }
    } else {
      ({ error } = await supabase.from("events").update(basePayload).eq("id", id));
    }

    if (error) toast.error(error.message);
    else {
      await supabase.from("activity_log").insert({
        user_id: user?.id, user_name: profile?.full_name,
        action_type: finalStatus === "published" ? "published" : isNew ? "created" : "updated",
        content_type: "event", content_title: title,
      });
      toast.success("Saved!");
      setInitialSnapshot(snapshot());
      navigate("/admin/events");
    }
    setSaving(false);
    setPendingRecurrence(null);
  };

  return (
    <AdminShell title={isNew ? "New Event" : "Edit Event"} breadcrumb={`Dashboard > Events > ${isNew ? "New" : "Edit"}`}>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
        <Button variant="ghost" onClick={goBack} className="text-primary"><ArrowLeftIcon className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => save("draft")} disabled={saving} className="rounded-full border-primary/20 text-primary"><FloppyDiskIcon className="w-4 h-4 mr-1" /> Save Draft</Button>
        {hasPermission(["super_admin", "editor"]) && (
          <Button onClick={() => save("published")} disabled={saving} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"><PaperPlaneTiltIcon className="w-4 h-4 mr-1" /> Publish</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Event Name *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="rounded-[10px] mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl mt-1 min-h-[200px]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Start Date *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>Start Time</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>End Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>End Time</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="rounded-[10px] mt-1" /></div>
              </div>
              <div><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="The Opportunities Centre, Plas Madoc" className="rounded-[10px] mt-1" /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">Community Event</SelectItem>
                    <SelectItem value="fundraiser">Fundraiser</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="regular">Regular Session</SelectItem>
                    <SelectItem value="special">Special Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Free Entry</Label>
                <Switch checked={isFree} onCheckedChange={setIsFree} />
              </div>
              <div>
                <Label>Poster / Event Photo</Label>
                <ImageUpload value={posterUrl} onChange={setPosterUrl} folder="events" className="mt-1" />
              </div>
              <div><Label>External Link</Label><Input value={externalLink} onChange={e => setExternalLink(e.target.value)} className="rounded-[10px] mt-1" /></div>
              <div>
                <Label>Recurrence</Label>
                <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrenceRule !== "none" && (
                <div>
                  <Label>Repeat until</Label>
                  <Input type="date" value={recurrenceUntil} onChange={e => setRecurrenceUntil(e.target.value)} className="rounded-[10px] mt-1" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discard changes confirmation */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Discard unsaved changes?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">You have unsaved changes to this event. Leaving now will lose them.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDiscardConfirm(false)} className="rounded-full">Keep Editing</Button>
            <Button onClick={() => navigate("/admin/events")} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">Discard & Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurrence confirmation */}
      <Dialog open={!!pendingRecurrence} onOpenChange={(o) => !o && setPendingRecurrence(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm recurring event</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This will create <strong>{pendingRecurrence?.count} additional event{pendingRecurrence?.count === 1 ? "" : "s"}</strong>, repeating {recurrenceRule} until {recurrenceUntil && new Date(recurrenceUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
            {pendingRecurrence && pendingRecurrence.count >= MAX_RECURRENCE_INSTANCES && (
              <> Capped at {MAX_RECURRENCE_INSTANCES} events (about 2 years) to prevent runaway creation.</>
            )}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPendingRecurrence(null)} className="rounded-full">Go Back</Button>
            <Button onClick={() => save(pendingRecurrence?.newStatus)} disabled={saving} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? "Creating..." : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
