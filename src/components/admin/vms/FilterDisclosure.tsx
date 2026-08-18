import { useState } from "react";
import { FunnelIcon, CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export default function FilterDisclosure({ children, label = "Filters" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="sm:hidden flex items-center gap-1.5 px-4 py-1.5 mb-3 rounded-full text-sm font-medium border border-primary/20 text-primary bg-card hover:bg-primary/5 transition-colors"
      >
        <FunnelIcon className="w-4 h-4" /> {label}
        <CaretDownIcon className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("space-y-3", !open && "hidden sm:block")}>{children}</div>
    </div>
  );
}
