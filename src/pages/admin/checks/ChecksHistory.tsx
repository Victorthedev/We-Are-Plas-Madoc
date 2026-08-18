import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, subMonths } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardTextIcon, WarningIcon } from "@phosphor-icons/react";
import { formatPlayground } from "@/lib/vms";
import { todayKey } from "@/lib/dailyLog";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";

export default function ChecksHistory() {
  const playgroundFilter = usePlaygroundFilter();
  const [from, setFrom] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [to, setTo] = useState(todayKey());
  const [logs, setLogs] = useState<any[]>([]);
  const [flaggedCounts, setFlaggedCounts] = useState<Record<string, number>>({});
  const [filedBy, setFiledBy] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase.from("daily_logs").select("*").gte("log_date", from).lte("log_date", to).order("log_date", { ascending: false });
      if (playgroundFilter !== "all") query = query.eq("playground", playgroundFilter);
      const { data } = await query;
      setLogs(data || []);

      if (data && data.length > 0) {
        const { data: flaggedChecks } = await supabase
          .from("daily_log_checks")
          .select("daily_log_id, comment")
          .in("daily_log_id", data.map((l) => l.id))
          .not("comment", "is", null);
        const counts: Record<string, number> = {};
        (flaggedChecks || []).forEach((c: any) => {
          if (c.comment?.trim()) counts[c.daily_log_id] = (counts[c.daily_log_id] || 0) + 1;
        });
        setFlaggedCounts(counts);

        const creatorIds = [...new Set(data.map((l) => l.created_by).filter(Boolean))];
        if (creatorIds.length > 0) {
          const { data: creators } = await supabase.from("profiles").select("id, full_name").in("id", creatorIds);
          const names: Record<string, string> = {};
          (creators || []).forEach((c) => { names[c.id] = c.full_name; });
          setFiledBy(names);
        } else {
          setFiledBy({});
        }
      }
      setLoading(false);
    };
    load();
  }, [from, to, playgroundFilter]);

  return (
    <AdminShell title="Daily Log History" breadcrumb="Dashboard > Daily Log > History">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex flex-col gap-3 mb-6">
          <PlaygroundFilter />
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[10px] mt-1 h-9" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[10px] mt-1 h-9" />
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No logs in this range</p>
              </div>
            ) : (
              <div className="divide-y divide-admin-border/60">
                {logs.map((log) => (
                  <Link key={log.id} to={`/admin/checks/log/${log.id}`} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/50 block">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{format(new Date(log.log_date), "EEEE d MMMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPlayground(log.playground)}
                        {filedBy[log.created_by] ? ` · Filed by ${filedBy[log.created_by]}` : ""}
                        {log.staff_team ? ` · ${log.staff_team}` : ""}
                      </p>
                    </div>
                    {flaggedCounts[log.id] > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <WarningIcon className="w-3 h-3" weight="fill" /> {flaggedCounts[log.id]} noted
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </AdminShell>
  );
}
