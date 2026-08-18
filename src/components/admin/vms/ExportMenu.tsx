import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DownloadSimpleIcon, CaretDownIcon } from "@phosphor-icons/react";

type ExportMenuOption = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

export default function ExportMenu({ options, disabled, className }: { options: ExportMenuOption[]; disabled?: boolean; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className={className ?? "rounded-full border-admin-border"}>
          <DownloadSimpleIcon className="w-4 h-4 mr-1" /> Export <CaretDownIcon className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {options.map((o, i) => (
          <DropdownMenuItem key={i} onClick={o.onClick} disabled={o.disabled} className="gap-2 cursor-pointer">
            {o.icon} {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
