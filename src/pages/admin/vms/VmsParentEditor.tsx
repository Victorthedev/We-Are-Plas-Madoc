import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftIcon, FloppyDiskIcon, PlusIcon, XIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PLAYGROUNDS } from "@/lib/vms";

export default function VmsParentEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [playground, setPlayground] = useState("");
  const [language, setLanguage] = useState("");
  const [culturalBackground, setCulturalBackground] = useState("");
  const [religion, setReligion] = useState("");
  const [saving, setSaving] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const [links, setLinks] = useState<any[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [childSearch, setChildSearch] = useState("");
  const [childResults, setChildResults] = useState<any[]>([]);
  const [relationship, setRelationship] = useState("");
  const [isPrimaryContact, setIsPrimaryContact] = useState(true);
  const [selectedChild, setSelectedChild] = useState<any>(null);

  const snapshot = () => JSON.stringify({ firstName, lastName, dateOfBirth, phone, playground, language, culturalBackground, religion });
  const isDirty = initialSnapshot !== "" && snapshot() !== initialSnapshot;

  const fetchLinks = async (parentId: string) => {
    const { data } = await supabase
      .from("child_parent_links")
      .select("*, children(id, first_name, last_name)")
      .eq("parent_id", parentId);
    setLinks(data || []);
  };

  useEffect(() => {
    if (!isNew && id) {
      supabase.from("parents").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setFirstName(data.first_name);
          setLastName(data.last_name);
          setDateOfBirth(data.date_of_birth || "");
          setPhone(data.phone);
          setPlayground(data.playground || "");
          setLanguage(data.language || "");
          setCulturalBackground(data.cultural_background || "");
          setReligion(data.religion || "");
          setInitialSnapshot(JSON.stringify({
            firstName: data.first_name, lastName: data.last_name, dateOfBirth: data.date_of_birth || "",
            phone: data.phone, playground: data.playground || "", language: data.language || "", culturalBackground: data.cultural_background || "",
            religion: data.religion || "",
          }));
        }
      });
      fetchLinks(id);
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

  useEffect(() => {
    if (childSearch.trim().length < 2) { setChildResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("children")
        .select("id, first_name, last_name")
        .or(`first_name.ilike.%${childSearch}%,last_name.ilike.%${childSearch}%`)
        .limit(8);
      setChildResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [childSearch]);

  const goBack = () => {
    if (isDirty) setShowDiscardConfirm(true);
    else navigate("/admin/vms/parents");
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("First name, last name and phone are required");
      return;
    }
    setSaving(true);
    const payload = {
      first_name: firstName.trim(), last_name: lastName.trim(), date_of_birth: dateOfBirth || null,
      phone: phone.trim(), playground: playground || null, language: language || null, cultural_background: culturalBackground || null,
      religion: religion || null, updated_at: new Date().toISOString(),
    };

    let error;
    let parentId = id;
    if (isNew) {
      const { data, error: insertErr } = await supabase.from("parents").insert(payload).select("id").single();
      error = insertErr;
      parentId = data?.id;
    } else {
      ({ error } = await supabase.from("parents").update(payload).eq("id", id));
    }

    if (error) toast.error(error.message);
    else {
      await supabase.from("vms_activity_log").insert({
        action_type: isNew ? "created" : "updated", content_type: "parent", content_id: parentId,
      });
      toast.success("Saved!");
      setInitialSnapshot(snapshot());
      if (isNew && parentId) navigate(`/admin/vms/parents/${parentId}/edit`);
    }
    setSaving(false);
  };

  const addLink = async () => {
    if (!selectedChild || isNew || !id) return;
    const { error } = await supabase.from("child_parent_links").insert({
      child_id: selectedChild.id, parent_id: id, relationship: relationship || null, is_primary_contact: isPrimaryContact,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`Linked to ${selectedChild.first_name}`);
      setShowLinkModal(false);
      setSelectedChild(null);
      setChildSearch("");
      setRelationship("");
      fetchLinks(id);
    }
  };

  const removeLink = async (linkId: string) => {
    await supabase.from("child_parent_links").delete().eq("id", linkId);
    toast.success("Link removed");
    if (id) fetchLinks(id);
  };

  return (
    <AdminShell title={isNew ? "New Parent" : "Edit Parent"} breadcrumb={`Dashboard > Visitor Management > Parents > ${isNew ? "New" : "Edit"}`}>
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
                <div><Label>Date of Birth</Label><Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>Phone *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="rounded-[10px] mt-1" /></div>
              </div>
              <div>
                <Label>Playground</Label>
                <Select value={playground} onValueChange={setPlayground}>
                  <SelectTrigger className="rounded-[10px] mt-1"><SelectValue placeholder="Select a playground" /></SelectTrigger>
                  <SelectContent>
                    {PLAYGROUNDS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label>Language</Label><Input value={language} onChange={e => setLanguage(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>Background</Label><Input value={culturalBackground} onChange={e => setCulturalBackground(e.target.value)} className="rounded-[10px] mt-1" /></div>
                <div><Label>Religion</Label><Input value={religion} onChange={e => setReligion(e.target.value)} className="rounded-[10px] mt-1" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border-admin-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Linked Children</Label>
                {!isNew && (
                  <Button size="sm" variant="outline" onClick={() => setShowLinkModal(true)} className="h-8 rounded-full border-primary/20 text-primary">
                    <PlusIcon className="w-3.5 h-3.5 mr-1" /> Link
                  </Button>
                )}
              </div>
              {isNew ? (
                <p className="text-xs text-muted-foreground">Save this parent first, then link them to their children.</p>
              ) : links.length === 0 ? (
                <p className="text-xs text-muted-foreground">No children linked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{l.children?.first_name} {l.children?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{l.relationship || "Guardian"}{l.is_primary_contact ? " · Primary contact" : ""}</p>
                      </div>
                      <button onClick={() => removeLink(l.id)} className="shrink-0 w-7 h-7 rounded-full hover:bg-destructive/10 flex items-center justify-center text-destructive/60 hover:text-destructive" aria-label="Remove link">
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Link a child modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Link a Child</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search children by name..." value={childSearch} onChange={e => { setChildSearch(e.target.value); setSelectedChild(null); }} className="pl-9 rounded-xl" />
            </div>
            {childResults.length > 0 && !selectedChild && (
              <ul className="border border-admin-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {childResults.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => { setSelectedChild(c); setChildSearch(`${c.first_name} ${c.last_name}`); setChildResults([]); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50">
                      {c.first_name} {c.last_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedChild && (
              <>
                <div><Label>Relationship</Label><Input value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g. Mother, Father, Guardian" className="rounded-[10px] mt-1" /></div>
                <label className="flex items-center gap-2">
                  <Checkbox checked={isPrimaryContact} onCheckedChange={(c) => setIsPrimaryContact(!!c)} />
                  <span className="text-sm">Primary emergency contact</span>
                </label>
                <Button onClick={addLink} className="w-full rounded-full bg-primary text-primary-foreground">Link Child</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-foreground">Discard unsaved changes?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">You have unsaved changes to this record. Leaving now will lose them.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDiscardConfirm(false)} className="rounded-full">Keep Editing</Button>
            <Button onClick={() => navigate("/admin/vms/parents")} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">Discard & Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
