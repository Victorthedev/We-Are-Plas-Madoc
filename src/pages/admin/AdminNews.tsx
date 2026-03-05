import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Eye, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tabs = ["all", "published", "draft", "archived"] as const;
const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-500",
};
const categoryColors: Record<string, string> = {
  "food-van": "bg-wapm-cyan/10 text-wapm-cyan",
  sustainable: "bg-green-100 text-green-700",
  resident: "bg-wapm-pink/10 text-wapm-pink",
  community: "bg-wapm-purple/10 text-wapm-purple",
};

export default function AdminNews() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<typeof tabs[number]>("all");

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase.from("news_posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const filtered = posts.filter(p => {
    if (tab !== "all" && p.status !== tab) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await supabase.from("news_posts").delete().eq("id", id);
    toast.success("Post deleted");
    fetchPosts();
  };

  return (
    <AdminShell title="News Posts" breadcrumb="Dashboard > News">
      <PermissionGuard roles={["super_admin", "editor", "contributor"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border",
                  tab === t ? "bg-wapm-purple text-white border-wapm-purple" : "bg-white text-wapm-purple border-wapm-purple/20 hover:bg-wapm-lavender"
                )}
              >
                {t} ({posts.filter(p => t === "all" ? true : p.status === t).length})
              </button>
            ))}
          </div>
          <Button onClick={() => navigate("/admin/news/new")} className="rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white">
            <Plus className="w-4 h-4 mr-1" /> New Post
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search posts by title..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <Card className="rounded-2xl border-wapm-purple/[0.12] shadow-[0_2px_12px_rgba(45,27,78,0.08)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-wapm-deep-purple">No posts yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start by creating your first news post</p>
                <Button onClick={() => navigate("/admin/news/new")} className="mt-4 rounded-full bg-wapm-purple text-white">
                  <Plus className="w-4 h-4 mr-1" /> Create First Post
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-wapm-purple/[0.08]">
                      <th className="text-left p-4 font-semibold text-wapm-deep-purple">Title</th>
                      <th className="text-left p-4 font-semibold text-wapm-deep-purple hidden md:table-cell">Category</th>
                      <th className="text-left p-4 font-semibold text-wapm-deep-purple">Status</th>
                      <th className="text-left p-4 font-semibold text-wapm-deep-purple hidden lg:table-cell">Date</th>
                      <th className="text-right p-4 font-semibold text-wapm-deep-purple">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(post => (
                      <tr key={post.id} className="border-b border-wapm-purple/[0.05] hover:bg-wapm-lavender/50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-wapm-deep-purple">{post.title}</div>
                          <div className="text-xs text-muted-foreground">/news/{post.slug}</div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          {post.category && (
                            <span className={cn("px-3 py-1 rounded-full text-xs font-medium", categoryColors[post.category] || "bg-gray-100 text-gray-600")}>
                              {post.category}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusColors[post.status] || "bg-gray-100")}>
                            {post.status}
                          </span>
                        </td>
                        <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">
                          {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/news/${post.id}/edit`)} className="h-8 w-8 text-wapm-purple"><Pencil className="w-4 h-4" /></Button>
                            {post.status === "published" && (
                              <Button size="icon" variant="ghost" asChild className="h-8 w-8 text-wapm-cyan"><a href={`/news/${post.slug}`} target="_blank"><Eye className="w-4 h-4" /></a></Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(post.id, post.title)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </AdminShell>
  );
}
