import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PencilSimpleIcon, EyeIcon, BriefcaseIcon, ClipboardTextIcon } from "@phosphor-icons/react";
import { serviceIcons } from "@/lib/serviceIcons";

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
            <BriefcaseIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">No services configured yet</p>
            <p className="text-sm text-muted-foreground mt-1">Services will appear here once added to the database.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(s => {
              const ServiceIcon = serviceIcons[s.slug] || ClipboardTextIcon;
              return (
              <Card key={s.id} className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <ServiceIcon className="w-5 h-5" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">Last updated: {new Date(s.updated_at).toLocaleDateString("en-GB")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/services/${s.id}/edit`)} className="rounded-full border-primary/20 text-primary flex-1 sm:flex-none">
                      <PencilSimpleIcon className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="text-accent flex-1 sm:flex-none">
                      <a href={`/services/${s.slug}`} target="_blank" rel="noopener noreferrer"><EyeIcon className="w-3.5 h-3.5 mr-1" /> Preview</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </PermissionGuard>
    </AdminShell>
  );
}
