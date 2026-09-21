import { useSearchParams } from "react-router-dom";
import { PLAYGROUNDS } from "@/lib/vms";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** The selected playground from the URL, or "all" for the combined view (the default). */
export function usePlaygroundFilter(): string {
  const [searchParams] = useSearchParams();
  return searchParams.get("playground") || "all";
}

export default function PlaygroundFilter({ compact }: { compact?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("playground") || "all";

  const select = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("playground");
    else next.set("playground", value);
    setSearchParams(next, { replace: true });
  };

  const options = [{ value: "all", label: "All Playgrounds" }, ...PLAYGROUNDS];

  if (compact) {
    return (
      <div className="flex-1 min-w-[160px]">
        <Label className="text-xs text-muted-foreground">Playground</Label>
        <Select value={selected} onValueChange={select}>
          <SelectTrigger className="rounded-[10px] mt-1 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => select(o.value)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
            selected === o.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
