import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Image } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categories = ["events", "land", "community", "sunflowers", "food-van", "general"];

export default function AdminGallery() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("gallery_items").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);

  const handleUpload = async () => {
    if (!uploadUrl.trim()) { toast.error("Image URL required"); return; }
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
    fetchItems();
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} photos?`)) return;
    for (const id of selected) {
      await supabase.from("gallery_items").delete().eq("id", id);
    }
    toast.success("Deleted");
    setSelected(new Set());
    fetchItems();
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    await supabase.from("gallery_items").update({ caption: editItem.caption, category: editItem.category }).eq("id", editItem.id);
    toast.success("Updated");
    setEditItem(null);
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
                  filter === c ? "bg-wapm-purple text-white border-wapm-purple" : "bg-white text-wapm-purple border-wapm-purple/20"
                )}>{c}</button>
            ))}
          </div>
          <Button onClick={() => setShowUpload(true)} className="rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white">
            <Plus className="w-4 h-4 mr-1" /> Upload Photos
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="bg-wapm-deep-purple text-white rounded-full px-6 py-2 flex items-center gap-4 mb-4 inline-flex">
            <span className="text-sm">{selected.size} selected</span>
            <Button size="sm" variant="ghost" onClick={handleDeleteSelected} className="text-white hover:text-red-300"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="text-white/70">Deselect</Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-wapm-deep-purple">No photos yet</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className="break-inside-avoid mb-4 group relative">
                <img src={item.image_url} alt={item.caption || "Gallery"} className="w-full rounded-xl" loading="lazy" />
                <div className="absolute inset-0 bg-wapm-deep-purple/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <input type="checkbox" checked={selected.has(item.id)}
                    onChange={e => {
                      const s = new Set(selected);
                      e.target.checked ? s.add(item.id) : s.delete(item.id);
                      setSelected(s);
                    }}
                    className="absolute top-3 left-3 w-5 h-5" />
                  <Button size="icon" variant="ghost" onClick={() => setEditItem(item)} className="text-white"><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("Delete this photo?")) return;
                    await supabase.from("gallery_items").delete().eq("id", item.id);
                    toast.success("Deleted"); fetchItems();
                  }} className="text-white"><Trash2 className="w-4 h-4" /></Button>
                </div>
                {item.caption && <p className="text-xs text-muted-foreground mt-1">{item.caption}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Upload Photo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Image URL *</Label><Input value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} placeholder="https://..." className="rounded-[10px] mt-1" /></div>
              <div><Label>Caption</Label><Input value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} className="rounded-[10px] mt-1" /></div>
              <div>
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpload} className="w-full rounded-full bg-wapm-purple text-white">Upload</Button>
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
                <Button onClick={handleSaveEdit} className="w-full rounded-full bg-wapm-purple text-white">Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
