import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "../../integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeftIcon, FloppyDiskIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import ImageUpload from "@/components/ui/ImageUpload";
import { toast } from "sonner";

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminNewsEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user, profile, hasPermission } = useAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const snapshot = () => JSON.stringify({ title, slug, excerpt, content, category, featuredImageUrl, status });
  const isDirty = initialSnapshot !== "" && snapshot() !== initialSnapshot;

  useEffect(() => {
    if (!isNew && id) {
      supabase.from("news_posts").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setSlug(data.slug);
          setExcerpt(data.excerpt || "");
          setContent(data.content || "");
          setCategory(data.category || "");
          setFeaturedImageUrl(data.featured_image_url || "");
          setStatus(data.status);
          setInitialSnapshot(JSON.stringify({
            title: data.title, slug: data.slug, excerpt: data.excerpt || "", content: data.content || "",
            category: data.category || "", featuredImageUrl: data.featured_image_url || "", status: data.status,
          }));
        }
      });
    } else {
      setInitialSnapshot(snapshot());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const goBack = () => {
    if (isDirty) setShowDiscardConfirm(true);
    else navigate("/admin/news");
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isNew) setSlug(slugify(val));
  };

  const save = async (newStatus?: string) => {
    if (!title.trim() || !slug.trim()) { toast.error("Title and slug required"); return; }
    setSaving(true);
    const finalStatus = newStatus || status;
    const payload = {
      title, slug, excerpt, content, category: category || null,
      featured_image_url: featuredImageUrl || null,
      status: finalStatus,
      author_id: user?.id,
      published_at: finalStatus === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from("news_posts").insert(payload));
    } else {
      ({ error } = await supabase.from("news_posts").update(payload).eq("id", id));
    }

    if (error) { toast.error(error.message); }
    else {
      await supabase.from("activity_log").insert({
        user_id: user?.id, user_name: profile?.full_name,
        action_type: finalStatus === "published" ? "published" : isNew ? "created" : "updated",
        content_type: "news", content_title: title,
      });
      toast.success(finalStatus === "published" ? "Published!" : "Saved!");
      setInitialSnapshot(snapshot());
      navigate("/admin/news");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from("news_posts").delete().eq("id", id);
    toast.success("Post deleted");
    navigate("/admin/news");
  };

  const canPublish = hasPermission(["super_admin", "editor"]);

  return (
    <AdminShell title={isNew ? "New Post" : "Edit Post"} breadcrumb={`Dashboard > News > ${isNew ? "New" : "Edit"}`}>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
        <Button variant="ghost" onClick={goBack} className="text-primary"><ArrowLeftIcon className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => save("draft")} disabled={saving} className="rounded-full border-primary/20 text-primary">
          <FloppyDiskIcon className="w-4 h-4 mr-1" /> Save Draft
        </Button>
        {canPublish ? (
          <Button onClick={() => save("published")} disabled={saving} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <PaperPlaneTiltIcon className="w-4 h-4 mr-1" /> Publish
          </Button>
        ) : (
          <Button onClick={() => save("draft")} disabled={saving} className="rounded-full bg-accent text-accent-foreground">
            Submit for Review
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6 space-y-4">
              <div>
                <Input placeholder="Post title..." value={title} onChange={e => handleTitleChange(e.target.value)}
                  className="text-2xl font-bold border-0 shadow-none px-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/40" />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">/news/</span>
                  <Input value={slug} onChange={e => setSlug(e.target.value)} className="text-xs h-6 border-0 shadow-none px-1 w-auto flex-1 focus-visible:ring-0" />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Featured Image</Label>
                <ImageUpload value={featuredImageUrl} onChange={setFeaturedImageUrl} folder="news" className="mt-1" />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Content</Label>
                <Textarea placeholder="Write your post content here..." value={content} onChange={e => setContent(e.target.value)}
                  className="min-h-[300px] rounded-xl mt-1" />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Excerpt</Label>
                <Textarea placeholder="Short summary..." value={excerpt} onChange={e => setExcerpt(e.target.value)}
                  className="rounded-xl mt-1" rows={3} />
                <p className="text-xs text-muted-foreground mt-1">{excerpt.length}/200</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homegrown">Homegrown</SelectItem>
                  <SelectItem value="the-land">The Land</SelectItem>
                  <SelectItem value="community-pantry">Community Pantry</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</Label>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>{status}</span>
              </div>
            </CardContent>
          </Card>

          {!isNew && (
            <Card className="rounded-2xl border-red-200">
              <CardContent className="p-6">
                <Label className="text-xs uppercase tracking-wider text-destructive font-semibold">Danger Zone</Label>
                <Button variant="outline" className="w-full mt-2 rounded-full border-red-300 text-destructive hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}>
                  Delete Post
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Discard changes confirmation */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-foreground">Discard unsaved changes?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">You have unsaved changes to this post. Leaving now will lose them.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDiscardConfirm(false)} className="rounded-full">Keep Editing</Button>
            <Button onClick={() => navigate("/admin/news")} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">Discard & Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete post confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-foreground">Delete this post?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">This cannot be undone.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="rounded-full">Go Back</Button>
            <Button onClick={handleDelete} disabled={deleting} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting ? "Deleting..." : "Delete Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
