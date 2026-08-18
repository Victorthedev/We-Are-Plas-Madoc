import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/superbase/client";
import {
  SquaresFourIcon, NewspaperIcon, CalendarBlankIcon, ImageIcon, UsersIcon, ChatCircleIcon,
  BriefcaseIcon, UserGearIcon, GearIcon, SignOutIcon, CaretLeftIcon, CaretRightIcon, HandshakeIcon, ClipboardTextIcon, ChartBarIcon,
  BabyIcon, UserListIcon, CheckSquareIcon, StudentIcon, ChartLineIcon, FirstAidKitIcon, IdentificationBadgeIcon,
  GaugeIcon, BellIcon, ListChecksIcon, ClockCounterClockwiseIcon, KanbanIcon, ClipboardIcon
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: SquaresFourIcon, label: "Overview", path: "/admin", roles: ["super_admin", "editor", "contributor", "gallery_only"] },
  { icon: NewspaperIcon, label: "News", path: "/admin/news", roles: ["super_admin", "editor", "contributor"] },
  { icon: CalendarBlankIcon, label: "Events", path: "/admin/events", roles: ["super_admin", "editor", "contributor"] },
  { icon: ImageIcon, label: "Gallery", path: "/admin/gallery", roles: ["super_admin", "editor", "contributor", "gallery_only"] },
  { icon: HandshakeIcon, label: "Volunteers", path: "/admin/volunteers", roles: ["super_admin", "editor"] },
  { icon: ClipboardTextIcon, label: "Vol. Positions", path: "/admin/volunteer-positions", roles: ["super_admin", "editor"] },
  { icon: ChatCircleIcon, label: "Messages", path: "/admin/messages", roles: ["super_admin", "editor"] },
  { icon: ChartBarIcon, label: "Analytics", path: "/admin/analytics", roles: ["super_admin", "editor"] },
  { icon: BriefcaseIcon, label: "Services", path: "/admin/services", roles: ["super_admin", "editor"] },
  { icon: UsersIcon, label: "Team", path: "/admin/team", roles: ["super_admin", "editor"] },
];

const vmsNavItems = [
  { icon: GaugeIcon, label: "Overview", path: "/admin/vms", roles: ["super_admin", "playground_worker"] },
  { icon: BabyIcon, label: "Children", path: "/admin/vms/children", roles: ["super_admin", "playground_worker"] },
  { icon: StudentIcon, label: "Youth Club", path: "/admin/vms/youth", roles: ["super_admin", "playground_worker"] },
  { icon: UserListIcon, label: "Parents", path: "/admin/vms/parents", roles: ["super_admin", "playground_worker"] },
  { icon: HandshakeIcon, label: "Volunteers", path: "/admin/vms/volunteers", roles: ["super_admin", "playground_worker"] },
  { icon: CheckSquareIcon, label: "Attendance", path: "/admin/vms/attendance", roles: ["super_admin", "playground_worker"] },
  { icon: FirstAidKitIcon, label: "Incidents", path: "/admin/vms/incidents", roles: ["super_admin", "playground_worker"] },
  { icon: IdentificationBadgeIcon, label: "Visitor Log", path: "/admin/vms/visitors", roles: ["super_admin", "playground_worker"] },
  { icon: ChartLineIcon, label: "Reports", path: "/admin/vms/reports", roles: ["super_admin", "playground_worker"] },
  { icon: BellIcon, label: "Notifications", path: "/admin/vms/notifications", roles: ["super_admin", "playground_worker"] },
];

const checksNavItems = [
  { icon: ListChecksIcon, label: "Today's Log", path: "/admin/checks", roles: ["super_admin", "playground_worker"] },
  { icon: ClockCounterClockwiseIcon, label: "History", path: "/admin/checks/history", roles: ["super_admin", "playground_worker"] },
  { icon: KanbanIcon, label: "Tasks", path: "/admin/checks/tasks", roles: ["super_admin", "playground_worker"] },
  { icon: ClipboardIcon, label: "Checklist Items", path: "/admin/checks/items", roles: ["super_admin"] },
];

const bottomItems = [
  { icon: UserGearIcon, label: "Staff Accounts", path: "/admin/staff", roles: ["super_admin"] },
  { icon: GearIcon, label: "Settings", path: "/admin/settings", roles: ["super_admin", "editor", "contributor", "gallery_only"] },
];

const roleBadge: Record<string, { label: string; className: string }> = {
  super_admin: { label: "Super Admin", className: "bg-primary/20 text-white" },
  editor: { label: "Editor", className: "bg-accent/20 text-white" },
  contributor: { label: "Contributor", className: "bg-wapm-green/20 text-white" },
  gallery_only: { label: "Gallery", className: "bg-wapm-pink/20 text-white" },
  playground_worker: { label: "Playground Worker", className: "bg-wapm-cyan/20 text-white" },
};

// Every admin page mounts its own AdminSidebar (routes aren't nested under a
// persistent layout), so the nav's scroll position would reset to the top on
// every navigation without this — kept outside the component so it survives
// the remount.
let savedNavScrollTop = 0;

export default function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const { user, profile, roles, signOut, hasPermission } = useAuth();
  const badges = roles.map((r) => roleBadge[r]).filter(Boolean);
  const navRef = useRef<HTMLElement>(null);
  const [myOpenTasks, setMyOpenTasks] = useState(0);

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = savedNavScrollTop;
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("vms_tasks").select("id", { count: "exact", head: true }).eq("assigned_to", user.id).neq("status", "resolved")
      .then(({ count }) => setMyOpenTasks(count || 0));
  }, [user]);

  const isActive = (path: string) => ["/admin", "/admin/vms", "/admin/checks"].includes(path) ? pathname === path : pathname.startsWith(path);

  const renderItem = (item: typeof navItems[0], badge?: number) => {
    if (!hasPermission(item.roles as any)) return null;
    const active = isActive(item.path);
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border-l-[3px]",
            active
              ? "bg-white/[0.07] text-white border-primary"
              : "text-white/60 hover:text-white hover:bg-white/[0.04] border-transparent",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="flex-1">{item.label}</span>}
          {!collapsed && !!badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{badge}</span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={cn(
        "font-admin fixed left-0 top-0 h-screen bg-admin-chrome flex flex-col z-50 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-admin-chrome-border">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">W</div>
          {!collapsed && <span className="text-white font-semibold text-sm">WAPM Admin</span>}
        </Link>
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          {collapsed ? <CaretRightIcon className="w-4 h-4" /> : <CaretLeftIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav
        ref={navRef}
        onScroll={(e) => { savedNavScrollTop = e.currentTarget.scrollTop; }}
        className="flex-1 overflow-y-auto py-4"
      >
        <ul className="space-y-1 px-2">{navItems.map((item) => renderItem(item))}</ul>
        {hasPermission(["playground_worker"]) && (
          <>
            <div className="border-t border-admin-chrome-border my-4 mx-4" />
            {!collapsed && <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Visitor Management</p>}
            <ul className="space-y-1 px-2">{vmsNavItems.map((item) => renderItem(item))}</ul>
          </>
        )}
        {hasPermission(["playground_worker"]) && (
          <>
            <div className="border-t border-admin-chrome-border my-4 mx-4" />
            {!collapsed && <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Daily Log</p>}
            <ul className="space-y-1 px-2">{checksNavItems.map((item) => renderItem(item, item.label === "Tasks" ? myOpenTasks : undefined))}</ul>
          </>
        )}
        <div className="border-t border-admin-chrome-border my-4 mx-4" />
        <ul className="space-y-1 px-2">{bottomItems.map((item) => renderItem(item))}</ul>
      </nav>

      {/* User */}
      <div className="border-t border-admin-chrome-border p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.full_name?.charAt(0) || "?"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {badges.map((badge) => (
                  <span key={badge.label} className={cn("inline-block text-[10px] px-2 py-0.5 rounded-full", badge.className)}>
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-2 mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-destructive/20 transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <SignOutIcon className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
