import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Newspaper, CalendarDays, Image, Users, MessageSquare,
  Briefcase, UserCog, Settings, LogOut, ChevronLeft, ChevronRight, Handshake
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin", roles: ["super_admin", "editor", "contributor", "gallery_only"] },
  { icon: Newspaper, label: "News", path: "/admin/news", roles: ["super_admin", "editor", "contributor"] },
  { icon: CalendarDays, label: "Events", path: "/admin/events", roles: ["super_admin", "editor", "contributor"] },
  { icon: Image, label: "Gallery", path: "/admin/gallery", roles: ["super_admin", "editor", "contributor", "gallery_only"] },
  { icon: Handshake, label: "Volunteers", path: "/admin/volunteers", roles: ["super_admin", "editor"] },
  { icon: MessageSquare, label: "Messages", path: "/admin/messages", roles: ["super_admin", "editor"] },
  { icon: Briefcase, label: "Services", path: "/admin/services", roles: ["super_admin", "editor"] },
  { icon: Users, label: "Team", path: "/admin/team", roles: ["super_admin", "editor"] },
];

const bottomItems = [
  { icon: UserCog, label: "Staff Accounts", path: "/admin/staff", roles: ["super_admin"] },
  { icon: Settings, label: "Settings", path: "/admin/settings", roles: ["super_admin", "editor", "contributor", "gallery_only"] },
];

const roleBadge: Record<string, { label: string; className: string }> = {
  super_admin: { label: "Super Admin", className: "bg-wapm-deep-purple text-white" },
  editor: { label: "Editor", className: "bg-wapm-purple text-white" },
  contributor: { label: "Contributor", className: "bg-wapm-cyan text-white" },
  gallery_only: { label: "Gallery", className: "bg-wapm-pink text-white" },
};

export default function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const { profile, role, signOut, hasPermission } = useAuth();
  const badge = role ? roleBadge[role] : null;

  const isActive = (path: string) => path === "/admin" ? pathname === "/admin" : pathname.startsWith(path);

  const renderItem = (item: typeof navItems[0]) => {
    if (!hasPermission(item.roles as any)) return null;
    const active = isActive(item.path);
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            active
            ? "bg-wapm-purple text-white border-l-[3px] border-wapm-cyan"
            : "text-white/70 hover:text-white hover:bg-white/10",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-wapm-deep-purple flex flex-col z-50 transition-all duration-300 shadow-[4px_0_20px_rgba(0,0,0,0.15)]",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-wapm-purple flex items-center justify-center text-white font-bold text-sm">W</div>
          {!collapsed && <span className="text-white font-semibold text-sm">WAPM Admin</span>}
        </Link>
        <button onClick={onToggle} className="text-white/50 hover:text-white transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">{navItems.map(renderItem)}</ul>
        <div className="border-t border-white/10 my-4 mx-4" />
        <ul className="space-y-1 px-2">{bottomItems.map(renderItem)}</ul>
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-full bg-wapm-purple/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.full_name?.charAt(0) || "?"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
              {badge && (
                <span className={cn("inline-block text-[10px] px-2 py-0.5 rounded-full mt-0.5", badge.className)}>
                  {badge.label}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-2 mt-3 text-[#E8E0F0]/50 hover:text-white transition-colors text-sm w-full",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
