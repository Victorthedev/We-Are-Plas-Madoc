import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeftIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import ImageUpload from "@/components/ui/ImageUpload";
import { toast } from "sonner";
import { PLAYGROUNDS } from "@/lib/vms";

export default function VmsChildEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [allergies, setAllergies] = useState("");
  const [additionalLearningNeeds, setAdditionalLearningNeeds] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [playground, setPlayground] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const snapshot = () => JSON.stringify({
    firstName, lastName, dateOfBirth, ethnicity, allergies, additionalLearningNeeds,
    medicalConditions, playground, photoUrl, internalNotes,
  });
  const isDirty = initialSnapshot !== "" && snapshot() !== initialSnapshot;

  useEffect(() => {
    if (!isNew && id) {
      supabase.from("children").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setFirstName(data.first_name);
          setLastName(data.last_name);
          setDateOfBirth(data.date_of_birth);
          setEthnicity(data.ethnicity || "");
          setAllergies(data.allergies || "");
          setAdditionalLearningNeeds(data.additional_learning_needs || "");
          setMedicalConditions(data.medical_conditions || "");
          setPlayground(data.playground);
          setPhotoUrl(data.photo_url || "");
          setInternalNotes(data.internal_notes || "");
          setInitialSnapshot(JSON.stringify({
            firstName: data.first_name, lastName: data.last_name, dateOfBirth: data.date_of_birth,
            ethnicity: data.ethnicity || "", allergies: data.allergies || "",
            additionalLearningNeeds: data.additional_learning_needs || "", medicalConditions: data.medical_conditions || "",
            playground: data.playground, photoUrl: data.photo_url || "", internalNotes: data.internal_notes || "",
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
    else navigate("/admin/vms/children");
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !dateOfBirth || !playground) {
      toast.error("First name, last name, date of birth and playground are required");
      return;
    }
    setSaving(true);
    const payload = {
      first_name: firstName.trim(), last_name: lastName.trim(), date_of_birth: dateOfBirth,
      ethnicity: ethnicity || null, allergies: allergies || null,
      additional_learning_needs: additionalLearningNeeds || null, medical_conditions: medicalConditions || null,
      playground, photo_url: photoUrl || null, internal_notes: internalNotes || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    let childId = id;
    if (isNew) {
      const { data, error: insertErr } = await supabase.from("children").insert(payload).select("id").single();
      error = insertErr;
      childId = data?.id;
    } else {
      ({ error } = await supabase.from("children").update(payload).eq("id", id));
    }

    if (error) toast.error(error.message);
    else {
      await supabase.from("vms_activity_log").insert({
        action_type: isNew ? "created" : "updated", content_type: "child", content_id: childId,
      });
      toast.success("Saved!");
      setInitialSnapshot(snapshot());
      navigate("/admin/vms/children");
    }
    setSaving(false);
  };

  return (
    <AdminShell title={isNew ? "New Child" : "Edit Child"} breadcrumb={`Dashboard > Visitor Management > Children > ${isNew ? "New" : "Edit"}`}>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
        <Button variant="ghost" onClick={goBack} className="text-primary"><ArrowLeftIcon className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex-1" />
        <Button onClick={save} disabled={saving} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <FloppyDiskIcon className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>Last Name *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} className="rounded-[10px] mt-1" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Date of Birth *</Label><Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>Ethnicity</Label><Input value={ethnicity} onChange={e => setEthnicity(e.target.value)} className="rounded-[10px] mt-1" /></div>
              </div>
              <div><Label>Allergies</Label><Textarea value={allergies} onChange={e => setAllergies(e.target.value)} className="rounded-xl mt-1" rows={2} /></div>
              <div><Label>Medical Conditions</Label><Textarea value={medicalConditions} onChange={e => setMedicalConditions(e.target.value)} className="rounded-xl mt-1" rows={2} /></div>
              <div><Label>Additional Learning Needs</Label><Textarea value={additionalLearningNeeds} onChange={e => setAdditionalLearningNeeds(e.target.value)} className="rounded-xl mt-1" rows={2} /></div>
              <div><Label>Internal Notes</Label><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="rounded-xl mt-1" rows={2} /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Playground *</Label>
                <Select value={playground} onValueChange={setPlayground}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Select playground" /></SelectTrigger>
                  <SelectContent>
                    {PLAYGROUNDS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Photo</Label>
                <ImageUpload value={photoUrl} onChange={setPhotoUrl} folder="children" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-foreground">Discard unsaved changes?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">You have unsaved changes to this record. Leaving now will lose them.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDiscardConfirm(false)} className="rounded-full">Keep Editing</Button>
            <Button onClick={() => navigate("/admin/vms/children")} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">Discard & Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
