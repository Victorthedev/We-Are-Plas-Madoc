import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Briefcase } from "lucide-react";

export default function AdminServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("services").select("*").order("display_order").then(({ data }) => {
      setServices(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <AdminShell title="Services" breadcrumb="Dashboard > Services">
      <PermissionGuard roles={["super_admin", "editor"]}>
        <p className="text-muted-foreground mb-6">Manage the content for each service page on the website.</p>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-wapm-deep-purple">No services configured yet</p>
            <p className="text-sm text-muted-foreground mt-1">Services will appear here once added to the database.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(s => (
              <Card key={s.id} className="rounded-2xl border-wapm-purple/[0.12] shadow-[0_2px_12px_rgba(45,27,78,0.08)]">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.icon || "📋"}</span>
                    <div>
                      <h3 className="font-semibold text-wapm-deep-purple">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">Last updated: {new Date(s.updated_at).toLocaleDateString("en-GB")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/services/${s.id}/edit`)} className="rounded-full border-wapm-purple/20 text-wapm-purple">
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="text-wapm-cyan">
                      <a href={`/services/${s.slug}`} target="_blank"><Eye className="w-3 h-3 mr-1" /> Preview</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PermissionGuard>
    </AdminShell>
  );
}
