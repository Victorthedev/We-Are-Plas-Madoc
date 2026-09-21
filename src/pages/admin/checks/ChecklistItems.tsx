import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, CaretUpIcon, CaretDownIcon, ArchiveIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { ChecklistItemRow, ChecklistSection } from "@/lib/dailyLog";

function ItemList({ section, items, onChange }: { section: ChecklistSection; items: ChecklistItemRow[]; onChange: () => void }) {
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active = items.filter((i) => i.active).sort((a, b) => a.sort_order - b.sort_order);
  const archived = items.filter((i) => !i.active);
  const visible = showArchived ? [...active, ...archived] : active;

  const addItem = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    const nextOrder = active.length > 0 ? Math.max(...active.map((i) => i.sort_order)) + 1 : 1;
    const { error } = await supabase.from("checklist_items").insert({ section, label: newLabel.trim(), sort_order: nextOrder });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setNewLabel("");
    onChange();
  };

  const move = async (item: ChecklistItemRow, direction: -1 | 1) => {
    const idx = active.findIndex((i) => i.id === item.id);
    const swapWith = active[idx + direction];
    if (!swapWith) return;
    await Promise.all([
      supabase.from("checklist_items").update({ sort_order: swapWith.sort_order }).eq("id", item.id),
      supabase.from("checklist_items").update({ sort_order: item.sort_order }).eq("id", swapWith.id),
    ]);
    onChange();
  };

  const toggleActive = async (item: ChecklistItemRow) => {
    await supabase.from("checklist_items").update({ active: !item.active }).eq("id", item.id);
    onChange();
  };

  return (
    <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)] mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground capitalize">{section} Checks</h3>
          {archived.length > 0 && (
            <button onClick={() => setShowArchived((s) => !s)} className="text-xs text-primary hover:text-accent">
              {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
            </button>
          )}
        </div>
        <div className="space-y-2 mb-4">
          {visible.map((item) => (
            <div key={item.id} className={`flex items-center gap-2 p-3 rounded-xl border border-admin-border ${!item.active ? "opacity-50" : ""}`}>
              {item.active && (
                <div className="flex flex-col shrink-0">
                  <button onClick={() => move(item, -1)} className="text-muted-foreground hover:text-primary" aria-label="Move up"><CaretUpIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(item, 1)} className="text-muted-foreground hover:text-primary" aria-label="Move down"><CaretDownIcon className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <p className="text-sm text-foreground flex-1">{item.label}</p>
              <Button size="icon" variant="ghost" onClick={() => toggleActive(item)} className="h-8 w-8 shrink-0" aria-label={item.active ? "Archive item" : "Restore item"}>
                {item.active ? <ArchiveIcon className="w-4 h-4 text-destructive" /> : <ArrowCounterClockwiseIcon className="w-4 h-4 text-primary" />}
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="New checklist item..." value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="rounded-xl flex-1 min-w-[200px]" />
          <Button onClick={addItem} disabled={adding || !newLabel.trim()} className="rounded-full bg-primary text-primary-foreground">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChecklistItems() {
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("checklist_items").select("*").order("section").order("sort_order");
    setItems((data || []) as ChecklistItemRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <AdminShell title="Checklist Items" breadcrumb="Dashboard > Daily Log > Checklist Items">
      <PermissionGuard roles={["super_admin"]}>
        <p className="text-sm text-muted-foreground mb-6">
          These items appear on every Opening and Closing check going forward. Archiving an item hides it from new logs but keeps it on past logs it was already used on.
        </p>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <>
            <ItemList section="opening" items={items.filter((i) => i.section === "opening")} onChange={load} />
            <ItemList section="closing" items={items.filter((i) => i.section === "closing")} onChange={load} />
          </>
        )}
      </PermissionGuard>
    </AdminShell>
  );
}
