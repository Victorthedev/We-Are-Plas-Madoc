import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminServiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [howToAccess, setHowToAccess] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      supabase.from("services").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setName(data.name);
          setDescription(data.description || "");
          setContent(data.content || "");
          setImageUrl(data.image_url || "");
          setOpeningHours(data.opening_hours || "");
          setHowToAccess(data.how_to_access || "");
          setContactInfo(data.contact_info || "");
        }
      });
    }
  }, [id]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("services").update({
      description, content, image_url: imageUrl || null,
      opening_hours: openingHours || null, how_to_access: howToAccess || null,
      contact_info: contactInfo || null, updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) toast.error(error.message);
    else {
      await supabase.from("activity_log").insert({
        user_id: user?.id, user_name: profile?.full_name,
        action_type: "updated", content_type: "service", content_title: name,
      });
      toast.success("Saved!"); navigate("/admin/services");
    }
    setSaving(false);
  };

  return (
    <AdminShell title={`Edit: ${name}`} breadcrumb="Dashboard > Services > Edit">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/admin/services")} className="text-wapm-purple"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex-1" />
        <Button onClick={save} disabled={saving} className="rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white"><Save className="w-4 h-4 mr-1" /> Save Changes</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-wapm-purple/[0.12]">
            <CardContent className="p-6 space-y-4">
              <div><Label>Service Name</Label><Input value={name} disabled className="rounded-[10px] mt-1 bg-muted" /></div>
              <div><Label>Short Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl mt-1" rows={3} /></div>
              <div><Label>Full Content</Label><Textarea value={content} onChange={e => setContent(e.target.value)} className="rounded-xl mt-1 min-h-[300px]" /></div>
              <div><Label>Featured Image URL</Label><Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="rounded-[10px] mt-1" /></div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="rounded-2xl border-wapm-purple/[0.12]">
            <CardContent className="p-6 space-y-4">
              <div><Label>Opening Hours</Label><Input value={openingHours} onChange={e => setOpeningHours(e.target.value)} className="rounded-[10px] mt-1" /></div>
              <div><Label>How to Access</Label><Textarea value={howToAccess} onChange={e => setHowToAccess(e.target.value)} className="rounded-xl mt-1" rows={3} /></div>
              <div><Label>Contact Info</Label><Input value={contactInfo} onChange={e => setContactInfo(e.target.value)} className="rounded-[10px] mt-1" /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
