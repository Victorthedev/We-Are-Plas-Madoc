import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PencilSimpleIcon, PhoneIcon, EnvelopeSimpleIcon, FirstAidKitIcon, CheckCircleIcon,
  ClockCounterClockwiseIcon, ShieldIcon, LinkIcon, ChartLineIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { calculateAge } from "@/lib/vms";

const dbsBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "DBS Pending", className: "bg-wapm-cyan/20 text-wapm-cyan" },
  checked: { label: "DBS Checked", className: "bg-green-100 text-green-700" },
  not_required: { label: "DBS Not Required", className: "bg-gray-100 text-gray-500" },
};

export default function VmsVolunteerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState<any>(null);
  const [linkedChild, setLinkedChild] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data: volunteerData } = await supabase.from("volunteers").select("*").eq("id", id).maybeSingle();
      const [{ data: shiftData }, { data: incidentData }, childRes] = await Promise.all([
        supabase.from("attendance").select("id, attended_on, check_in_time, check_out_time, activity_notes").eq("volunteer_id", id).order("attended_on", { ascending: false }).limit(15),
        supabase.from("incidents").select("*").eq("volunteer_id", id).order("occurred_on", { ascending: false }).limit(10),
        volunteerData?.child_id
          ? supabase.from("children").select("id, first_name, last_name, date_of_birth, archived_at").eq("id", volunteerData.child_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setVolunteer(volunteerData);
      setShifts(shiftData || []);
      setIncidents(incidentData || []);
      setLinkedChild(childRes.data);
      setLoading(false);
    };
    load();
  }, [id]);

  const logIncident = () => {
    navigate("/admin/vms/incidents", {
      state: { prefill: { person_type: "volunteer", person_name: `${volunteer.first_name} ${volunteer.last_name}`, volunteer_id: volunteer.id } },
    });
  };

  if (loading || !volunteer) {
    return (
      <AdminShell title="Volunteer Profile" breadcrumb="Dashboard > Visitor Management > Volunteers">
        <PermissionGuard roles={["super_admin", "playground_worker"]}>
          <div className="p-8 text-center text-muted-foreground">{loading ? "Loading..." : "Record not found."}</div>
        </PermissionGuard>
      </AdminShell>
    );
  }

  const badge = dbsBadge[volunteer.dbs_checked_status] || dbsBadge.pending;

  return (
    <AdminShell title={`${volunteer.first_name} ${volunteer.last_name}`} breadcrumb="Dashboard > Visitor Management > Volunteers">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{volunteer.position}</span>
            <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium", badge.className)}>
              <ShieldIcon className="w-3 h-3" weight="fill" /> {badge.label}
            </span>
            {volunteer.child_id && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-wapm-cyan/10 text-wapm-cyan">
                <LinkIcon className="w-3 h-3" weight="bold" /> Also in Children/Youth register
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate(`/admin/vms/report/volunteer/${id}`)} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <ChartLineIcon className="w-4 h-4 mr-1" /> Generate Report
            </Button>
            <Button variant="outline" onClick={logIncident} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <FirstAidKitIcon className="w-4 h-4 mr-1" /> Log Incident
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/vms/volunteers", { state: { openEditId: id } })} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <PencilSimpleIcon className="w-4 h-4 mr-1" /> Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Details</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Email</dt><dd className="text-foreground flex items-center gap-1"><EnvelopeSimpleIcon className="w-3.5 h-3.5" /> {volunteer.email}</dd></div>
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Phone</dt><dd className="text-foreground flex items-center gap-1"><PhoneIcon className="w-3.5 h-3.5" /> {volunteer.phone}</dd></div>
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Volunteer Type</dt><dd className="text-foreground capitalize">{volunteer.volunteer_type || "-"}</dd></div>
                  <div><dt className="text-muted-foreground text-xs mb-0.5">DBS Certificate Number</dt><dd className="text-foreground">{volunteer.dbs_number || "-"}</dd></div>
                  {volunteer.internal_notes && (
                    <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs mb-0.5">Internal Notes</dt><dd className="text-foreground whitespace-pre-wrap">{volunteer.internal_notes}</dd></div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ClockCounterClockwiseIcon className="w-4 h-4 text-primary" /> Recent Shifts
                </h3>
                {shifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shifts logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {shifts.map((s) => (
                      <div key={s.id} className="flex items-start gap-3 text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" weight="fill" />
                        <div>
                          <p className="text-foreground">
                            {new Date(s.attended_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            {(s.check_in_time || s.check_out_time) && ` · ${s.check_in_time?.slice(0, 5) || "?"} - ${s.check_out_time?.slice(0, 5) || "?"}`}
                          </p>
                          {s.activity_notes && <p className="text-xs text-muted-foreground mt-0.5">{s.activity_notes}</p>}
                        </div>
                      </div>
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
            {linkedChild && (
              <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-primary" weight="bold" /> Linked Child Record
                  </h3>
                  <Link to={`/admin/vms/children/${linkedChild.id}`} className="block p-3 rounded-xl border border-admin-border hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium text-foreground">{linkedChild.first_name} {linkedChild.last_name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{calculateAge(linkedChild.date_of_birth)} years{linkedChild.archived_at ? " · archived" : ""}</p>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PermissionGuard>
    </AdminShell>
  );
}
