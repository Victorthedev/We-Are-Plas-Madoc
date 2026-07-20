import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon, EyeIcon, NewspaperIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tabs = ["all", "published", "draft", "archived"] as const;
const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-500",
};
const categoryColors: Record<string, string> = {
  "food-van": "bg-accent/10 text-accent",
  sustainable: "bg-green-100 text-green-700",
  resident: "bg-wapm-pink/10 text-wapm-pink",
  community: "bg-primary/10 text-primary",
};

export default function AdminNews() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<typeof tabs[number]>("all");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("news_posts").delete().eq("id", deleteTarget.id);
    toast.success("Post deleted");
    setDeleteTarget(null);
    setDeleting(false);
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
                  tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
                )}
              >
                {t} ({posts.filter(p => t === "all" ? true : p.status === t).length})
              </button>
            ))}
          </div>
          <Button onClick={() => navigate("/admin/news/new")} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> New Post
          </Button>
        </div>

        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search posts by title..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <NewspaperIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No posts found</p>
                {posts.length === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground mt-1">Start by creating your first news post</p>
                    <Button onClick={() => navigate("/admin/news/new")} className="mt-4 rounded-full bg-primary text-primary-foreground">
                      <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Create First Post
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table, md and up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-admin-border">
                        <th className="text-left p-4 font-semibold text-foreground">Title</th>
                        <th className="text-left p-4 font-semibold text-foreground">Category</th>
                        <th className="text-left p-4 font-semibold text-foreground">Status</th>
                        <th className="text-left p-4 font-semibold text-foreground">Date</th>
                        <th className="text-right p-4 font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(post => (
                        <tr key={post.id} className="border-b border-admin-border/60 hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="font-medium text-foreground">{post.title}</div>
                            <div className="text-xs text-muted-foreground">/news/{post.slug}</div>
                          </td>
                          <td className="p-4">
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
                          <td className="p-4 text-muted-foreground text-xs">
                            {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/news/${post.id}/edit`)} className="h-9 w-9 text-primary" aria-label="Edit post"><PencilSimpleIcon className="w-4 h-4" /></Button>
                              {post.status === "published" && (
                                <Button size="icon" variant="ghost" asChild className="h-9 w-9 text-accent" aria-label="Preview post"><a href={`/news/${post.slug}`} target="_blank"><EyeIcon className="w-4 h-4" /></a></Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(post)} className="h-9 w-9 text-destructive" aria-label="Delete post"><TrashIcon className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list, below md */}
                <div className="md:hidden divide-y divide-admin-border/60">
                  {filtered.map(post => (
                    <div key={post.id} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{post.title}</h3>
                        <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-xs font-medium", statusColors[post.status] || "bg-gray-100")}>{post.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">/news/{post.slug}</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {post.category && (
                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", categoryColors[post.category] || "bg-gray-100 text-gray-600")}>
                              {post.category}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {post.status === "published" && (
                            <Button size="icon" variant="ghost" asChild className="h-10 w-10 text-accent" aria-label="Preview post"><a href={`/news/${post.slug}`} target="_blank"><EyeIcon className="w-4 h-4" /></a></Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/news/${post.id}/edit`)} className="h-10 w-10 text-primary" aria-label="Edit post"><PencilSimpleIcon className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(post)} className="h-10 w-10 text-destructive" aria-label="Delete post"><TrashIcon className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-foreground">Delete post?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground text-sm">
              Delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">Go Back</Button>
              <Button onClick={handleDelete} disabled={deleting} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleting ? "Deleting..." : "Delete Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
