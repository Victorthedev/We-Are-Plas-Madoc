import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import { supabase } from "../../integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowSquareOutIcon, EyeIcon, TrendUpIcon, FileTextIcon, WarningCircleIcon, CircleNotchIcon } from "@phosphor-icons/react";

type AnalyticsData = {
  configured: boolean;
  views?: {
    total?: { value: number };
    data?: { key: string; total: number }[];
  } | null;
  pages?: {
    data?: { path: string; total: number }[];
  } | null;
  days?: number;
  error?: string;
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = async (d: number) => {
    setLoading(true);
    const { data: result } = await supabase.functions.invoke("get-analytics", {
      body: { days: d },
    });
    setData(result);
    setLoading(false);
  };

  useEffect(() => { load(days); }, [days]);

  const totalViews = data?.views?.total?.value ?? null;
  const topPages = data?.pages?.data?.slice(0, 10) ?? [];
  const dailyData = data?.views?.data ?? [];

  return (
    <AdminShell title="Site Analytics" breadcrumb="Dashboard > Analytics">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-primary/20 text-primary w-full sm:w-auto"
          onClick={() => window.open("https://vercel.com/dashboard", "_blank")}
        >
          <ArrowSquareOutIcon className="w-4 h-4 mr-1" /> Vercel Dashboard
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <CircleNotchIcon className="w-6 h-6 animate-spin mr-2" /> Loading analytics...
        </div>
      ) : !data?.configured ? (
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex gap-4 items-start">
            <WarningCircleIcon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="font-semibold text-amber-800 mb-1">Vercel Analytics not configured</p>
              <p className="text-sm text-amber-700 mb-3">
                Add these secrets to your Supabase project to enable embedded analytics:
              </p>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal ml-4">
                <li>Generate a token at <strong>vercel.com/account/tokens</strong></li>
                <li>Find your Project ID in <strong>Vercel &gt; Project &gt; Settings &gt; General</strong></li>
                <li>Add <code className="bg-amber-100 px-1 rounded">VERCEL_TOKEN</code> and <code className="bg-amber-100 px-1 rounded">VERCEL_PROJECT_ID</code> as Supabase Edge Function secrets</li>
                <li>Deploy: <code className="bg-amber-100 px-1 rounded">supabase functions deploy get-analytics --no-verify-jwt</code></li>
              </ol>
              <p className="text-xs text-amber-600 mt-3">
                Until then, view your analytics directly on the Vercel dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : data?.error ? (
        <Card className="rounded-2xl border-red-200 bg-red-50">
          <CardContent className="p-6 text-red-700 text-sm">
            Failed to load analytics: {data.error}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-admin-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <EyeIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Page Views</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalViews !== null ? totalViews.toLocaleString() : "..."}
                  </p>
                  <p className="text-xs text-muted-foreground">Last {days} days</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-admin-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <TrendUpIcon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Average</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalViews !== null ? Math.round(totalViews / days).toLocaleString() : "..."}
                  </p>
                  <p className="text-xs text-muted-foreground">Views per day</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-admin-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-wapm-pink/20 flex items-center justify-center">
                  <FileTextIcon className="w-6 h-6 text-wapm-pink" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pages Tracked</p>
                  <p className="text-2xl font-bold text-foreground">{topPages.length}</p>
                  <p className="text-xs text-muted-foreground">Unique pages visited</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily trend */}
          {dailyData.length > 0 && (
            <Card className="rounded-2xl border-admin-border">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Daily Traffic</h3>
                <div className="flex items-end gap-1 h-24">
                  {dailyData.map((d) => {
                    const max = Math.max(...dailyData.map(x => x.total), 1);
                    const pct = (d.total / max) * 100;
                    return (
                      <div key={d.key} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full rounded-t bg-primary/30 group-hover:bg-primary transition-colors"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                          title={`${d.key}: ${d.total} views`}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top pages */}
          {topPages.length > 0 && (
            <Card className="rounded-2xl border-admin-border">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Top Pages</h3>
                <div className="space-y-2">
                  {topPages.map((p, i) => {
                    const max = topPages[0]?.total || 1;
                    return (
                      <div key={p.path} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.path}</p>
                          <div className="mt-1 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(p.total / max) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground tabular-nums">{p.total.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AdminShell>
  );
}
