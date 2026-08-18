import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: string;
}

export default function AdminShell({ children, title, breadcrumb }: AdminShellProps) {
  const { user, roles, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (roles.length === 0) {
    return (
      <div className="font-admin min-h-screen bg-admin-surface flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">No Access</h2>
          <p className="text-muted-foreground">You don't have permission to access this area. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-admin min-h-screen bg-admin-surface">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div className={cn("hidden lg:block", mobileOpen && "!block")}>
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Main content */}
      <div className={cn("transition-all duration-300", collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]")}>
        <AdminTopBar title={title} breadcrumb={breadcrumb} onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
