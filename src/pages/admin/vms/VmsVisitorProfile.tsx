import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftIcon, BuildingsIcon, ClockCounterClockwiseIcon, IdentificationBadgeIcon } from "@phosphor-icons/react";
import { formatPlayground } from "@/lib/vms";

export default function VmsVisitorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const [{ data: visitorData }, { data: visitsData }] = await Promise.all([
        supabase.from("external_visitors").select("*").eq("id", id).maybeSingle(),
        supabase.from("adult_visitors").select("*").eq("visitor_id", id).order("visit_date", { ascending: false }),
      ]);
      setVisitor(visitorData);
      setVisits(visitsData || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const formatTime = (t: string | null) => (t ? t.slice(0, 5) : "");

  if (loading || !visitor) {
    return (
      <AdminShell title="Visitor Profile" breadcrumb="Dashboard > Visitor Management > Visitor Log">
        <PermissionGuard roles={["super_admin", "playground_worker"]}>
          <div className="p-8 text-center text-muted-foreground">{loading ? "Loading..." : "Record not found."}</div>
        </PermissionGuard>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={visitor.name} breadcrumb="Dashboard > Visitor Management > Visitor Log">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <Button variant="ghost" onClick={() => navigate("/admin/vms/visitors")} className="text-primary mb-6"><ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Visitor Log</Button>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {visitor.organisation && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <BuildingsIcon className="w-3.5 h-3.5" /> {visitor.organisation}
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {visits.length} visit{visits.length === 1 ? "" : "s"} on record
          </span>
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClockCounterClockwiseIcon className="w-4 h-4 text-primary" /> Visit History
            </h3>
            {visits.length === 0 ? (
              <div className="text-center py-8">
                <IdentificationBadgeIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60 -mx-6">
                {visits.map((v) => (
                  <div key={v.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{v.reason}</p>
                      <p className="text-xs text-muted-foreground">{formatPlayground(v.playground)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-foreground">{new Date(v.visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {(v.time_from || v.time_to) && <p className="text-xs text-muted-foreground">{formatTime(v.time_from)}{v.time_to ? ` - ${formatTime(v.time_to)}` : ""}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </AdminShell>
  );
}
