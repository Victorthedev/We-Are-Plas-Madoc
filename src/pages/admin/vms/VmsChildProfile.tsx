import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  PencilSimpleIcon, ArchiveIcon, ArrowCounterClockwiseIcon, WarningIcon, PhoneIcon,
  FirstAidKitIcon, CheckCircleIcon, ClockCounterClockwiseIcon, UserListIcon, ChartLineIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calculateAge, formatPlayground, isEighteenOrOver, isYouthClubAge } from "@/lib/vms";

export default function VmsChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: childData }, { data: links }, { data: attendanceData }, { data: incidentData }] = await Promise.all([
      supabase.from("children").select("*").eq("id", id).maybeSingle(),
      supabase.from("child_parent_links").select("relationship, is_primary_contact, parents(id, first_name, last_name, phone)").eq("child_id", id),
      supabase.from("attendance").select("id, attended_on, service").eq("child_id", id).order("attended_on", { ascending: false }).limit(15),
      supabase.from("incidents").select("*").eq("child_id", id).order("occurred_on", { ascending: false }).limit(10),
    ]);
    setChild(childData);
    setContacts((links || []).sort((a, b) => (b.is_primary_contact ? 1 : 0) - (a.is_primary_contact ? 1 : 0)));
    setAttendance(attendanceData || []);
    setIncidents(incidentData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleArchive = async () => {
    setArchiving(true);
    await supabase.from("children").update({
      archived_at: new Date().toISOString(), archived_reason: archiveReason || null, updated_at: new Date().toISOString(),
    }).eq("id", id);
    await supabase.from("vms_activity_log").insert({ action_type: "archived", content_type: "child", content_id: id });
    toast.success(`${child.first_name} archived`);
    setArchiveOpen(false);
    setArchiveReason("");
    setArchiving(false);
    load();
  };

  const handleRestore = async () => {
    await supabase.from("children").update({ archived_at: null, archived_reason: null, updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("vms_activity_log").insert({ action_type: "restored", content_type: "child", content_id: id });
    toast.success(`${child.first_name} restored`);
    load();
  };

  const logIncident = () => {
    navigate("/admin/vms/incidents", {
      state: { prefill: { person_type: "child", person_name: `${child.first_name} ${child.last_name}`, child_id: child.id } },
    });
  };

  if (loading || !child) {
    return (
      <AdminShell title="Child Profile" breadcrumb="Dashboard > Visitor Management > Children">
        <PermissionGuard roles={["super_admin", "playground_worker"]}>
          <div className="p-8 text-center text-muted-foreground">{loading ? "Loading..." : "Record not found."}</div>
        </PermissionGuard>
      </AdminShell>
    );
  }

  const age = calculateAge(child.date_of_birth);
  const isYouth = isYouthClubAge(child.date_of_birth);
  const agedOut = isEighteenOrOver(child.date_of_birth);
  const isArchived = !!child.archived_at || agedOut;

  return (
    <AdminShell title={`${child.first_name} ${child.last_name}`} breadcrumb={`Dashboard > Visitor Management > ${isYouth ? "Youth Club" : "Children"}`}>
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{age} years old</span>
            {isYouth && <span className="px-3 py-1 rounded-full text-xs font-medium bg-wapm-cyan/10 text-wapm-cyan">Youth Club</span>}
            {child.playground && <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">{formatPlayground(child.playground)}</span>}
            {isArchived && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {agedOut && !child.archived_at ? "Archived (18+)" : "Archived"}
              </span>
            )}
            {(child.allergies || child.medical_conditions) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <WarningIcon className="w-3 h-3" weight="fill" /> Allergy/Medical
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate(`/admin/vms/report/child/${id}`)} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <ChartLineIcon className="w-4 h-4 mr-1" /> Generate Report
            </Button>
            <Button variant="outline" onClick={logIncident} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <FirstAidKitIcon className="w-4 h-4 mr-1" /> Log Incident
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/vms/children/${id}/edit`)} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <PencilSimpleIcon className="w-4 h-4 mr-1" /> Edit
            </Button>
            {child.archived_at ? (
              <Button variant="outline" onClick={handleRestore} className="rounded-full border-admin-border flex-1 sm:flex-none">
                <ArrowCounterClockwiseIcon className="w-4 h-4 mr-1" /> Restore
              </Button>
            ) : !agedOut ? (
              <Button variant="outline" onClick={() => setArchiveOpen(true)} className="rounded-full border-destructive/30 text-destructive flex-1 sm:flex-none">
                <ArchiveIcon className="w-4 h-4 mr-1" /> Archive
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Details</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Date of Birth</dt><dd className="text-foreground">{new Date(child.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Ethnicity</dt><dd className="text-foreground">{child.ethnicity || "-"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs mb-0.5">Medical Conditions</dt><dd className="text-foreground">{child.medical_conditions || "None recorded"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs mb-0.5">Allergies</dt><dd className="text-foreground">{child.allergies || "None recorded"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs mb-0.5">Additional Learning Needs</dt><dd className="text-foreground">{child.additional_learning_needs || "None recorded"}</dd></div>
                  {child.internal_notes && (
                    <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs mb-0.5">Internal Notes</dt><dd className="text-foreground whitespace-pre-wrap">{child.internal_notes}</dd></div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ClockCounterClockwiseIcon className="w-4 h-4 text-primary" /> Recent Attendance
                </h3>
                {attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {attendance.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 text-foreground text-xs font-medium">
                        <CheckCircleIcon className="w-3 h-3 text-primary" weight="fill" />
                        {new Date(a.attended_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {a.service === "youth_club" ? " (Youth Club)" : ""}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FirstAidKitIcon className="w-4 h-4 text-primary" /> Incidents
                </h3>
                {incidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No incidents logged.</p>
                ) : (
                  <div className="divide-y divide-admin-border/60 -mx-6">
                    {incidents.map((i) => (
                      <div key={i.id} className="px-6 py-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", i.incident_type === "accident" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600")}>
                            {i.incident_type === "accident" ? "Accident" : "Medical Emergency"}
                          </span>
                          <span className="text-xs text-muted-foreground">{new Date(i.occurred_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{i.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <UserListIcon className="w-4 h-4 text-primary" /> Parents / Guardians
                </h3>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked parent/guardian.</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((c, i) => {
                      const parent = (c as any).parents;
                      if (!parent) return null;
                      return (
                        <Link key={i} to={`/admin/vms/parents/${parent.id}`} className="block p-3 rounded-xl border border-admin-border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{parent.first_name} {parent.last_name}</span>
                            {c.is_primary_contact && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Primary</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.relationship || "Relationship not set"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><PhoneIcon className="w-3 h-3" /> {parent.phone}</p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="text-foreground">Archive {child.first_name}?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground text-sm">
              Archived children are hidden from active lists and attendance, but their history stays available in reports. This is not a delete.
            </p>
            <Textarea placeholder="Reason (optional), e.g. family moved away" value={archiveReason} onChange={e => setArchiveReason(e.target.value)} className="rounded-xl mt-1" rows={2} />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setArchiveOpen(false)} className="rounded-full">Go Back</Button>
              <Button onClick={handleArchive} disabled={archiving} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {archiving ? "Archiving..." : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
