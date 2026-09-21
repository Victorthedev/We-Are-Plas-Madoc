import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Preset = { key: string; label: string };

export default function DateRangeFilter({
  presets, value, onSelectPreset, dateFrom, dateTo, onDateFromChange, onDateToChange, allLabel = "All Time",
}: {
  presets: readonly Preset[];
  value: string;
  onSelectPreset: (key: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  allLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[160px]">
        <Label className="text-xs text-muted-foreground">Date range</Label>
        <Select value={value} onValueChange={onSelectPreset}>
          <SelectTrigger className="rounded-[10px] mt-1 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{allLabel}</SelectItem>
            {presets.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value === "custom" && (
        <>
          <div className="flex-1 min-w-[130px]">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="rounded-[10px] mt-1 h-9" />
          </div>
          <div className="flex-1 min-w-[130px]">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="rounded-[10px] mt-1 h-9" />
          </div>
        </>
      )}
    </div>
  );
}
