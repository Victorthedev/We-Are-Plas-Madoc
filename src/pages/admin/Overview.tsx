import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "../../integrations/superbase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, CalendarDays, Image, MessageSquare, ArrowRight } from "lucide-react";

export default function AdminOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ news: 0, newsDrafts: 0, events: 0, eventDrafts: 0, gallery: 0, galleryCategories: 0, unreadMessages: 0, totalMessages: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const fetchStats = async () => {
      const [news, newsDrafts, events, eventDrafts, gallery, unread, total, activity] = await Promise.all([
        supabase.from("news_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("news_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("gallery_items").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("read", false),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      setStats({
        news: news.count || 0, newsDrafts: newsDrafts.count || 0,
        events: events.count || 0, eventDrafts: eventDrafts.count || 0,
        gallery: gallery.count || 0, galleryCategories: 0,
        unreadMessages: unread.count || 0, totalMessages: total.count || 0,
      });
      setActivities(activity.data || []);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { icon: Newspaper, iconBg: "bg-wapm-purple/10 text-wapm-purple", value: stats.news, label: "Published Posts", sub: `${stats.newsDrafts} drafts pending`, link: "/admin/news", linkText: "Manage News →" },
    { icon: CalendarDays, iconBg: "bg-wapm-cyan/10 text-wapm-cyan", value: stats.events, label: "Upcoming Events", sub: `${stats.eventDrafts} drafts`, link: "/admin/events", linkText: "Manage Events →" },
    { icon: Image, iconBg: "bg-wapm-pink/10 text-wapm-pink", value: stats.gallery, label: "Gallery Photos", sub: "All categories", link: "/admin/gallery", linkText: "Manage Gallery →" },
    { icon: MessageSquare, iconBg: "bg-wapm-deep-purple/10 text-wapm-deep-purple", value: stats.unreadMessages, label: "Unread Messages", sub: `${stats.totalMessages} total`, link: "/admin/messages", linkText: "View Messages →", highlight: stats.unreadMessages > 0 },
  ];

  const formatTimeAgo = (date: string) => {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <AdminShell title={`${getGreeting()}, ${profile?.full_name?.split(" ")[0] || "there"} 👋`} breadcrumb={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <Card key={i} className={`rounded-2xl shadow-[0_2px_12px_rgba(45,27,78,0.08)] hover:-translate-y-0.5 transition-transform border ${s.highlight ? "border-l-[3px] border-l-wapm-pink" : "border-wapm-purple/[0.12]"}`}>
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-3xl font-extrabold text-wapm-deep-purple">{loading ? "—" : s.value}</div>
              <div className="text-sm text-wapm-deep-purple font-medium">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
              <Link to={s.link} className="text-xs text-wapm-purple hover:text-wapm-cyan mt-3 inline-flex items-center gap-1">
                {s.linkText} <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity feed */}
      <Card className="rounded-2xl shadow-[0_2px_12px_rgba(45,27,78,0.08)] border-wapm-purple/[0.12]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-wapm-deep-purple mb-4">Recent Activity</h3>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-wapm-purple mt-2 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-wapm-deep-purple">{a.user_name || "System"}</span>{" "}
                    <span className="text-muted-foreground">{a.action_type} {a.content_type}</span>{" "}
                    {a.content_title && <span className="text-wapm-deep-purple font-medium">"{a.content_title}"</span>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
