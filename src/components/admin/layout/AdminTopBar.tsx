import { useAuth } from "@/hooks/useAuth";
import { ListIcon } from "@phosphor-icons/react";

interface AdminTopBarProps {
  title: string;
  breadcrumb?: string;
  onMenuClick?: () => void;
}

export default function AdminTopBar({ title, breadcrumb, onMenuClick }: AdminTopBarProps) {
  const { profile } = useAuth();

  return (
    <header className="font-admin h-16 bg-card border-b border-admin-border shadow-[0_1px_2px_rgba(20,20,30,0.04)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {onMenuClick && (
          <button onClick={onMenuClick} className="lg:hidden text-foreground shrink-0" aria-label="Open menu">
            <ListIcon className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h1>
          {breadcrumb && <p className="text-xs text-muted-foreground truncate">{breadcrumb}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
          {profile?.full_name?.charAt(0) || "?"}
        </div>
      </div>
    </header>
  );
}
