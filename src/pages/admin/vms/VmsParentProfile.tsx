import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PencilSimpleIcon, PhoneIcon, FirstAidKitIcon, CheckCircleIcon, ClockCounterClockwiseIcon,
  BabyIcon, ChartLineIcon,
} from "@phosphor-icons/react";
import { calculateAge } from "@/lib/vms";

export default function VmsParentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parent, setParent] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const [{ data: parentData }, { data: links }, { data: attendanceData }, { data: incidentData }] = await Promise.all([
        supabase.from("parents").select("*").eq("id", id).maybeSingle(),
        supabase.from("child_parent_links").select("relationship, is_primary_contact, children(id, first_name, last_name, date_of_birth, archived_at)").eq("parent_id", id),
        supabase.from("attendance").select("id, attended_on").eq("parent_id", id).order("attended_on", { ascending: false }).limit(15),
        supabase.from("incidents").select("*").eq("parent_id", id).order("occurred_on", { ascending: false }).limit(10),
      ]);
      setParent(parentData);
      setChildren(links || []);
      setAttendance(attendanceData || []);
      setIncidents(incidentData || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const logIncident = () => {
    navigate("/admin/vms/incidents", {
      state: { prefill: { person_type: "parent", person_name: `${parent.first_name} ${parent.last_name}`, parent_id: parent.id } },
    });
  };

  if (loading || !parent) {
    return (
      <AdminShell title="Parent Profile" breadcrumb="Dashboard > Visitor Management > Parents">
        <PermissionGuard roles={["super_admin", "playground_worker"]}>
          <div className="p-8 text-center text-muted-foreground">{loading ? "Loading..." : "Record not found."}</div>
        </PermissionGuard>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={`${parent.first_name} ${parent.last_name}`} breadcrumb="Dashboard > Visitor Management > Parents">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PhoneIcon className="w-4 h-4" /> {parent.phone}
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate(`/admin/vms/report/parent/${id}`)} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <ChartLineIcon className="w-4 h-4 mr-1" /> Generate Report
            </Button>
            <Button variant="outline" onClick={logIncident} className="rounded-full border-admin-border flex-1 sm:flex-none">
              <FirstAidKitIcon className="w-4 h-4 mr-1" /> Log Incident
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/vms/parents/${id}/edit`)} className="rounded-full border-admin-border flex-1 sm:flex-none">
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
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Date of Birth</dt><dd className="text-foreground">{parent.date_of_birth ? new Date(parent.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-"}</dd></div>
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Language</dt><dd className="text-foreground">{parent.language || "-"}</dd></div>
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Cultural Background</dt><dd className="text-foreground">{parent.cultural_background || "-"}</dd></div>
                  <div><dt className="text-muted-foreground text-xs mb-0.5">Religion</dt><dd className="text-foreground">{parent.religion || "-"}</dd></div>
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
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${i.incident_type === "accident" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
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
                  <BabyIcon className="w-4 h-4 text-primary" /> Children
                </h3>
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked children.</p>
                ) : (
                  <div className="space-y-3">
                    {children.map((c, i) => {
                      const child = (c as any).children;
                      if (!child) return null;
                      return (
                        <Link key={i} to={`/admin/vms/children/${child.id}`} className="block p-3 rounded-xl border border-admin-border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{child.first_name} {child.last_name}</span>
                            {c.is_primary_contact && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Primary contact</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{calculateAge(child.date_of_birth)} years &middot; {c.relationship || "Relationship not set"}</p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    </AdminShell>
  );
}
