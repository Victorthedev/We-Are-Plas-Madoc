import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function PermissionGuard({
  roles,
  children,
  fallback,
}: {
  roles: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(roles)) {
    return fallback ? <>{fallback}</> : (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-wapm-deep-purple">Access Denied</h3>
        <p className="text-muted-foreground mt-1">You don't have permission to view this content.</p>
      </div>
    );
  }
  return <>{children}</>;
}
