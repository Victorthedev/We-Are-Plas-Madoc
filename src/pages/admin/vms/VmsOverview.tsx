import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  BabyIcon, StudentIcon, UserListIcon, HandshakeIcon, ClockIcon, BellIcon,
  ArrowRightIcon, QuotesIcon, CloudSunIcon, ShareIcon, CopyIcon, CheckIcon, PencilSimpleIcon, ListChecksIcon, WarningIcon,
} from "@phosphor-icons/react";
import { getQuoteOfDay, fetchCustomQuote, setCustomQuote, clearCustomQuote, fetchWeatherNow, isYouthClubAge, formatPlayground, PLAYGROUNDS, type WeatherNow } from "@/lib/vms";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";

const todayKey = () => format(new Date(), "yyyy-MM-dd");

export default function VmsOverview() {
  const { user } = useAuth();
  const playgroundFilter = usePlaygroundFilter();
  const [stats, setStats] = useState({ children: 0, youth: 0, parents: 0, volunteers: 0, pending: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [customQuote, setCustomQuoteState] = useState<string | null>(null);
  const [quoteEditOpen, setQuoteEditOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [missingLogPlaygrounds, setMissingLogPlaygrounds] = useState<string[]>([]);
  const [myOpenTaskCount, setMyOpenTaskCount] = useState(0);

  const registrationUrl = `${window.location.origin}/register`;
  const copyRegistrationLink = async () => {
    await navigator.clipboard.writeText(registrationUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const quote = customQuote || getQuoteOfDay();

  useEffect(() => {
    fetchCustomQuote(todayKey()).then(setCustomQuoteState);
  }, []);

  const openQuoteEdit = () => {
    setQuoteDraft(customQuote || "");
    setQuoteEditOpen(true);
  };

  const saveQuote = async () => {
    if (!user || !quoteDraft.trim()) return;
    setSavingQuote(true);
    await setCustomQuote(todayKey(), quoteDraft.trim(), user.id);
    setCustomQuoteState(quoteDraft.trim());
    setSavingQuote(false);
    setQuoteEditOpen(false);
  };

  const resetQuote = async () => {
    setSavingQuote(true);
    await clearCustomQuote(todayKey());
    setCustomQuoteState(null);
    setQuoteDraft("");
    setSavingQuote(false);
    setQuoteEditOpen(false);
  };

  useEffect(() => {
    const load = async () => {
      let parentsQuery = supabase.from("parents").select("id", { count: "exact", head: true }).eq("approval_status", "approved");
      let childrenQuery = supabase.from("children").select("date_of_birth, archived_at, approval_status, playground");
      if (playgroundFilter !== "all") {
        parentsQuery = parentsQuery.eq("playground", playgroundFilter);
        childrenQuery = childrenQuery.eq("playground", playgroundFilter);
      }
      const [childrenRes, parentsRes, volunteersRes, unreadRes] = await Promise.all([
        childrenQuery,
        parentsQuery,
        supabase.from("volunteers").select("id", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("notifications").select("*").eq("is_read", false).order("created_at", { ascending: false }).limit(6),
      ]);

      const children = childrenRes.data || [];
      const activeChildren = children.filter((c) => !c.archived_at && c.approval_status === "approved" && !isYouthClubAge(c.date_of_birth));
      const youth = children.filter((c) => !c.archived_at && c.approval_status === "approved" && isYouthClubAge(c.date_of_birth));
      const pending = children.filter((c) => c.approval_status === "pending").length;

      setStats({
        children: activeChildren.length,
        youth: youth.length,
        parents: parentsRes.count || 0,
        volunteers: volunteersRes.count || 0,
        pending,
      });
      setNotifications(unreadRes.data || []);
      setLoading(false);
    };
    load();
  }, [playgroundFilter]);

  useEffect(() => {
    fetchWeatherNow().then(setWeather);
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkTodayStatus = async () => {
      const sitesToCheck = playgroundFilter !== "all" ? [playgroundFilter] : PLAYGROUNDS.map((p) => p.value);
      const { data: logs } = await supabase.from("daily_logs").select("playground").eq("log_date", todayKey()).in("playground", sitesToCheck);
      const started = new Set((logs || []).map((l) => l.playground));
      setMissingLogPlaygrounds(sitesToCheck.filter((s) => !started.has(s)));

      const { count } = await supabase.from("vms_tasks").select("id", { count: "exact", head: true }).eq("assigned_to", user.id).neq("status", "resolved");
      setMyOpenTaskCount(count || 0);
    };
    checkTodayStatus();
  }, [playgroundFilter, user]);

  const statCards = [
    { icon: BabyIcon, iconBg: "bg-primary/10 text-primary", value: stats.children, label: "Children (0-9)", link: "/admin/vms/children" },
    { icon: StudentIcon, iconBg: "bg-wapm-cyan/10 text-wapm-cyan", value: stats.youth, label: "Youth Club (10-17)", link: "/admin/vms/youth" },
    { icon: UserListIcon, iconBg: "bg-accent/10 text-accent", value: stats.parents, label: "Parents", link: "/admin/vms/parents" },
    { icon: HandshakeIcon, iconBg: "bg-wapm-pink/10 text-wapm-pink", value: stats.volunteers, label: "Volunteers", link: "/admin/vms/volunteers" },
  ];

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <AdminShell title="Visitor Management" breadcrumb="Dashboard > Visitor Management">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="mb-6"><PlaygroundFilter /></div>

        {(missingLogPlaygrounds.length > 0 || myOpenTaskCount > 0) && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50/50 mb-6">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <ListChecksIcon className="w-4 h-4 text-amber-700" weight="bold" /> Today's Status
              </h3>
              <div className="space-y-2">
                {missingLogPlaygrounds.map((pg) => (
                  <Link
                    key={pg}
                    to={`/admin/checks?playground=${pg}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/60 hover:bg-white transition-colors"
                  >
                    <span className="text-sm text-foreground flex items-center gap-2">
                      <WarningIcon className="w-4 h-4 text-amber-700 shrink-0" weight="fill" />
                      {formatPlayground(pg)} hasn't started today's log
                    </span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-amber-700 shrink-0" weight="bold" />
                  </Link>
                ))}
                {myOpenTaskCount > 0 && (
                  <Link
                    to="/admin/checks/tasks"
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/60 hover:bg-white transition-colors"
                  >
                    <span className="text-sm text-foreground flex items-center gap-2">
                      <WarningIcon className="w-4 h-4 text-amber-700 shrink-0" weight="fill" />
                      {myOpenTaskCount} task{myOpenTaskCount === 1 ? "" : "s"} assigned to you still open
                    </span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-amber-700 shrink-0" weight="bold" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote of the day + weather */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="md:col-span-2 rounded-2xl shadow-[0_2px_12px_rgba(20,20,30,0.06)] border-admin-border bg-primary/5">
            <CardContent className="p-6 flex items-start gap-4">
              <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <QuotesIcon className="w-5 h-5" weight="duotone" />
              </span>
              <p className="text-foreground font-medium leading-relaxed pt-1 flex-1">{quote}</p>
              <Button size="icon" variant="ghost" onClick={openQuoteEdit} className="h-8 w-8 text-primary shrink-0" aria-label="Set today's quote">
                <PencilSimpleIcon className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[0_2px_12px_rgba(20,20,30,0.06)] border-admin-border">
            <CardContent className="p-6 flex items-center gap-4">
              <span className="w-10 h-10 rounded-xl bg-wapm-cyan/10 text-wapm-cyan flex items-center justify-center shrink-0">
                <CloudSunIcon className="w-5 h-5" weight="duotone" />
              </span>
              {weather ? (
                <div>
                  <div className="text-2xl font-bold text-foreground">{weather.temperatureC}&deg;C</div>
                  <div className="text-xs text-muted-foreground">{weather.description}, Wrexham</div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Weather unavailable</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <Card key={i} className="rounded-2xl shadow-[0_2px_12px_rgba(20,20,30,0.06)] hover:-translate-y-0.5 transition-transform border border-admin-border">
              <CardContent className="p-6">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                  <s.icon className="w-5 h-5" weight="duotone" />
                </div>
                <div className="text-3xl font-extrabold text-foreground">{loading ? "..." : s.value}</div>
                <div className="text-sm text-foreground font-medium">{s.label}</div>
                <Link to={s.link} className="text-xs text-primary hover:text-accent mt-3 inline-flex items-center gap-1">
                  View <ArrowRightIcon className="w-3 h-3" weight="bold" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Share Registration Form */}
        <Card className="rounded-2xl shadow-[0_2px_12px_rgba(20,20,30,0.06)] border-admin-border mb-8">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShareIcon className="w-5 h-5" weight="duotone" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">Share Registration Form</p>
              <p className="text-xs text-muted-foreground truncate">{registrationUrl}</p>
            </div>
            <button
              onClick={copyRegistrationLink}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
            >
              {linkCopied ? <CheckIcon className="w-4 h-4" weight="bold" /> : <CopyIcon className="w-4 h-4" />}
              {linkCopied ? "Copied!" : "Copy Link"}
            </button>
          </CardContent>
        </Card>

        {stats.pending > 0 && (
          <Link to="/admin/vms/children" className="block mb-8">
            <Card className="rounded-2xl border border-l-[3px] border-l-amber-400 border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <ClockIcon className="w-5 h-5" weight="duotone" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{stats.pending} pending self-registration{stats.pending === 1 ? "" : "s"}</p>
                  <p className="text-xs text-muted-foreground">Waiting for review in the Children list</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-amber-700" weight="bold" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Notifications preview */}
        <Card className="rounded-2xl shadow-[0_2px_12px_rgba(20,20,30,0.06)] border-admin-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BellIcon className="w-5 h-5 text-primary" weight="duotone" /> Notifications
              </h3>
              <Link to="/admin/vms/notifications" className="text-xs text-primary hover:text-accent inline-flex items-center gap-1">
                View all <ArrowRightIcon className="w-3 h-3" weight="bold" />
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-sm">No unread notifications.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 text-foreground">{n.message}</div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(n.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={quoteEditOpen} onOpenChange={setQuoteEditOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Today's Quote</DialogTitle></DialogHeader>
            <div>
              <Textarea
                value={quoteDraft}
                onChange={(e) => setQuoteDraft(e.target.value)}
                placeholder="Write a quote to show everyone today..."
                className="rounded-xl"
                rows={4}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              {customQuote && (
                <Button variant="outline" onClick={resetQuote} disabled={savingQuote} className="rounded-full border-destructive/30 text-destructive">
                  Reset to Default
                </Button>
              )}
              <Button variant="outline" onClick={() => setQuoteEditOpen(false)} className="rounded-full">Cancel</Button>
              <Button onClick={saveQuote} disabled={savingQuote || !quoteDraft.trim()} className="rounded-full bg-primary text-primary-foreground">
                {savingQuote ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
