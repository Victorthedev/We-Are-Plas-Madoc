import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "../../integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, TrashIcon, PencilSimpleIcon, ImageIcon, CheckIcon } from "@phosphor-icons/react";
import ImageUpload from "@/components/ui/ImageUpload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categories = ["events", "the-land", "homegrown", "community-pantry", "community", "general"];

export default function AdminGallery() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("gallery_items").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const handleUpload = async () => {
    if (!uploadUrl.trim()) { toast.error("Image URL required"); return; }
    setUploading(true);
    await supabase.from("gallery_items").insert({
      image_url: uploadUrl, caption: uploadCaption || null,
      category: uploadCategory, uploaded_by: user?.id,
    });
    await supabase.from("activity_log").insert({
      user_id: user?.id, user_name: profile?.full_name,
      action_type: "uploaded", content_type: "gallery", content_title: uploadCaption || "Photo",
    });
    toast.success("Photo added!");
    setShowUpload(false);
    setUploadUrl(""); setUploadCaption(""); setUploadCategory("general");
    setUploading(false);
    fetchItems();
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    for (const id of selected) {
      await supabase.from("gallery_items").delete().eq("id", id);
    }
    toast.success("Deleted");
    setSelected(new Set());
    setDeleteSelectedConfirm(false);
    setDeleting(false);
    fetchItems();
  };

  const handleDeleteOne = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("gallery_items").delete().eq("id", deleteTarget.id);
    toast.success("Deleted");
    setDeleteTarget(null);
    setDeleting(false);
    fetchItems();
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    await supabase.from("gallery_items").update({ caption: editItem.caption, category: editItem.category }).eq("id", editItem.id);
    toast.success("Updated");
    setEditItem(null);
    setSavingEdit(false);
    fetchItems();
  };

  return (
    <AdminShell title="Gallery" breadcrumb="Dashboard > Gallery">
      <PermissionGuard roles={["super_admin", "editor", "contributor", "gallery_only"]}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {["all", ...categories].map(c => (
              <button key={c} onClick={() => setFilter(c)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border",
                  filter === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20"
                )}>{c}</button>
            ))}
          </div>
          <Button onClick={() => setShowUpload(true)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Upload Photos
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="sticky top-16 z-30 bg-admin-chrome text-white rounded-full px-4 sm:px-6 py-2 flex items-center gap-3 sm:gap-4 mb-4 w-fit max-w-full">
            <span className="text-sm whitespace-nowrap">{selected.size} selected</span>
            <Button size="sm" variant="ghost" onClick={() => setDeleteSelectedConfirm(true)} className="text-white hover:text-red-300 h-8"><TrashIcon className="w-4 h-4 mr-1" /> Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="text-white/70 h-8">Deselect</Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">No photos yet</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
            {filtered.map(item => (
              <div key={item.id} className="break-inside-avoid mb-3 sm:mb-4 relative group rounded-xl overflow-hidden">
                <img src={item.image_url} alt={item.caption || "Gallery"} className="w-full rounded-xl" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />

                {/* Selection checkbox: always visible, not hover-gated */}
                <button
                  onClick={() => toggleSelect(item.id)}
                  className={cn(
                    "absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm",
                    selected.has(item.id) ? "bg-primary border-primary" : "bg-white/85 border-white"
                  )}
                  aria-label={selected.has(item.id) ? "Deselect photo" : "Select photo"}
                >
                  {selected.has(item.id) && <CheckIcon className="w-4 h-4 text-white" weight="bold" />}
                </button>

                {/* Edit/delete: always visible, not hover-gated */}
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button
                    onClick={() => setEditItem(item)}
                    className="w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white"
                    aria-label="Edit photo"
                  >
                    <PencilSimpleIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white"
                    aria-label="Delete photo"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Upload Photo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-1 block">Photo *</Label>
                <ImageUpload value={uploadUrl} onChange={setUploadUrl} folder="gallery" />
              </div>
              <div><Label>Caption</Label><Input value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} className="rounded-[10px] mt-1" /></div>
              <div>
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="w-full rounded-full bg-primary text-primary-foreground">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Edit Photo</DialogTitle></DialogHeader>
            {editItem && (
              <div className="space-y-4">
                <img src={editItem.image_url} alt="" className="w-full rounded-xl max-h-48 object-cover" />
                <div><Label>Caption</Label><Input value={editItem.caption || ""} onChange={e => setEditItem({ ...editItem, caption: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={editItem.category || "general"} onValueChange={v => setEditItem({ ...editItem, category: v })}>
                    <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full rounded-full bg-primary text-primary-foreground">
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete one confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-foreground">Delete photo?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground text-sm">This cannot be undone.</p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">Go Back</Button>
              <Button onClick={handleDeleteOne} disabled={deleting} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleting ? "Deleting..." : "Delete Photo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete selected confirmation */}
        <Dialog open={deleteSelectedConfirm} onOpenChange={setDeleteSelectedConfirm}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-foreground">Delete {selected.size} photos?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground text-sm">This cannot be undone.</p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteSelectedConfirm(false)} className="rounded-full">Go Back</Button>
              <Button onClick={handleDeleteSelected} disabled={deleting} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleting ? "Deleting..." : `Delete ${selected.size} Photos`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
