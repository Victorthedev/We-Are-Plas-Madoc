import { useAuth } from "@/hooks/useAuth";
import { Menu } from "lucide-react";

interface AdminTopBarProps {
  title: string;
  breadcrumb?: string;
  onMenuClick?: () => void;
}

export default function AdminTopBar({ title, breadcrumb, onMenuClick }: AdminTopBarProps) {
  const { profile } = useAuth();

  return (
    <header className="h-16 bg-wapm-lavender border-b border-wapm-purple/[0.12] shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button onClick={onMenuClick} className="lg:hidden text-wapm-deep">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-wapm-deep">{title}</h1>
          {breadcrumb && <p className="text-xs text-muted-foreground">{breadcrumb}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-wapm-purple/10 flex items-center justify-center text-wapm-purple text-xs font-bold">
          {profile?.full_name?.charAt(0) || "?"}
        </div>
      </div>
    </header>
  );
}
