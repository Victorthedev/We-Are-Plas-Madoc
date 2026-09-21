import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, MagnifyingGlassIcon, ArchiveIcon, ArrowCounterClockwiseIcon, BabyIcon, WarningIcon, CheckIcon, XIcon, ClockIcon, PhoneIcon, EyeIcon, DownloadSimpleIcon, FileXlsIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AGE_BANDS, calculateAge, getAgeBand, formatPlayground, isEighteenOrOver, fetchEmergencyContacts, type EmergencyContact } from "@/lib/vms";
import { generateRosterPdf } from "@/lib/pdf";
import { downloadExcelWorkbook } from "@/lib/excel";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import FilterDisclosure from "@/components/admin/vms/FilterDisclosure";
import ExportMenu from "@/components/admin/vms/ExportMenu";
import { useAuth } from "@/hooks/useAuth";

const ROSTER_COLUMNS = ["Name", "Age", "Date of Birth", "Playground", "Ethnicity", "Medical Conditions", "Allergies", "Additional Learning Needs", "Emergency Contact", "Contact Phone", "Status"];

const tabs = ["all", ...AGE_BANDS] as const;

export default function VmsChildren() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const playgroundFilter = usePlaygroundFilter();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<typeof tabs[number]>((searchParams.get("ageBand") as typeof tabs[number]) || "all");
  const [showArchived, setShowArchived] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [contacts, setContacts] = useState<Record<string, EmergencyContact>>({});
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewParents, setReviewParents] = useState<any[]>([]);
  const [exportingRoster, setExportingRoster] = useState(false);

  const fetchChildren = async () => {
    setLoading(true);
    const { data } = await supabase.from("children").select("*").order("first_name").order("last_name");
    setChildren(data || []);
    if (data?.length) setContacts(await fetchEmergencyContacts(data.map((c) => c.id)));
    setLoading(false);
  };

  useEffect(() => { fetchChildren(); }, []);

  const withAge = children
    .filter((c) => playgroundFilter === "all" || c.playground === playgroundFilter)
    .map((c) => ({ ...c, age: calculateAge(c.date_of_birth), isAgedOut: isEighteenOrOver(c.date_of_birth) }));
  const pendingFiltered = withAge.filter((c) => c.approval_status === "pending");
  const archivedFiltered = withAge.filter((c) => (!!c.archived_at || c.isAgedOut) && c.approval_status === "approved");
  const activeFiltered = withAge.filter((c) => !c.archived_at && !c.isAgedOut && c.approval_status === "approved");

  const base = showPending ? pendingFiltered : showArchived ? archivedFiltered : activeFiltered;
  const filtered = base.filter((c) => {
    if (!showPending && tab !== "all" && getAgeBand(c.age) !== tab) return false;
    if (search && !`${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleReview = async (child: any, status: "approved" | "rejected") => {
    await supabase.from("children").update({
      approval_status: status, approved_by: user?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", child.id);
    await supabase.from("vms_activity_log").insert({ action_type: status, content_type: "child", content_id: child.id });
    toast.success(`${child.first_name} ${status}`);
    setReviewTarget(null);
    fetchChildren();
  };

  const handleParentReview = async (parent: any, status: "approved" | "rejected") => {
    await supabase.from("parents").update({
      approval_status: status, approved_by: user?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", parent.id);
    await supabase.from("vms_activity_log").insert({ action_type: status, content_type: "parent", content_id: parent.id });
    toast.success(`${parent.first_name} ${status}`);
    if (reviewTarget) openReview(reviewTarget);
  };

  const openReview = async (child: any) => {
    setReviewTarget(child);
    const { data } = await supabase
      .from("child_parent_links")
      .select("relationship, is_primary_contact, parents(*)")
      .eq("child_id", child.id);
    setReviewParents(data || []);
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    await supabase.from("children").update({
      archived_at: new Date().toISOString(),
      archived_reason: archiveReason || null,
      updated_at: new Date().toISOString(),
    }).eq("id", archiveTarget.id);
    await supabase.from("vms_activity_log").insert({ action_type: "archived", content_type: "child", content_id: archiveTarget.id });
    toast.success(`${archiveTarget.first_name} archived`);
    setArchiveTarget(null);
    setArchiveReason("");
    setArchiving(false);
    fetchChildren();
  };

  const handleRestore = async (child: any) => {
    await supabase.from("children").update({ archived_at: null, archived_reason: null, updated_at: new Date().toISOString() }).eq("id", child.id);
    await supabase.from("vms_activity_log").insert({ action_type: "restored", content_type: "child", content_id: child.id });
    toast.success(`${child.first_name} restored`);
    fetchChildren();
  };

  const totalApproved = activeFiltered.length + archivedFiltered.length;

  const rosterRows = () => filtered.map((c) => [
    `${c.first_name} ${c.last_name}`,
    c.age,
    new Date(c.date_of_birth).toLocaleDateString("en-GB"),
    formatPlayground(c.playground),
    c.ethnicity || "",
    c.medical_conditions || "",
    c.allergies || "",
    c.additional_learning_needs || "",
    contacts[c.id]?.name || "",
    contacts[c.id]?.phone || "",
    showPending ? "Pending" : showArchived ? "Archived" : "Active",
  ]);
  const rosterSubtitle = `${showPending ? "Pending" : showArchived ? "Archived" : "Active"} · ${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  const handleExportRosterPdf = async () => {
    setExportingRoster(true);
    try {
      await generateRosterPdf("Children_Roster", "Children Roster", rosterSubtitle, ROSTER_COLUMNS, rosterRows());
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExportingRoster(false);
  };
  const handleExportRosterExcel = () => {
    downloadExcelWorkbook("WAPM_Children_Roster.xlsx", [{ name: "Children", headers: ROSTER_COLUMNS, rows: rosterRows() }]);
  };

  return (
    <AdminShell title="Children" breadcrumb="Dashboard > Visitor Management > Children">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="flex gap-6 text-sm mb-4">
          <div><span className="font-bold text-foreground text-lg">{totalApproved}</span> <span className="text-muted-foreground">total</span></div>
          <div><span className="font-bold text-foreground text-lg">{activeFiltered.length}</span> <span className="text-muted-foreground">active</span></div>
          <div><span className="font-bold text-foreground text-lg">{archivedFiltered.length}</span> <span className="text-muted-foreground">archived</span></div>
        </div>

        <FilterDisclosure>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <PlaygroundFilter compact />
            <ExportMenu
              disabled={filtered.length === 0 || exportingRoster}
              options={[
                { label: "Export Excel", icon: <FileXlsIcon className="w-4 h-4" />, onClick: handleExportRosterExcel },
                { label: exportingRoster ? "Generating..." : "Export PDF", icon: <DownloadSimpleIcon className="w-4 h-4" />, onClick: handleExportRosterPdf },
              ]}
            />
          </div>
        </FilterDisclosure>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {!showPending && tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border",
                  tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
                )}
              >
                {t === "all" ? "All ages" : t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            {pendingFiltered.length > 0 && (
              <Button
                variant="outline"
                onClick={() => { setShowPending((s) => !s); setShowArchived(false); }}
                className={cn("rounded-full border-amber-300 text-amber-700 flex-1 sm:flex-none", showPending && "bg-amber-100")}
              >
                <ClockIcon className="w-4 h-4 mr-1" /> Pending Review ({pendingFiltered.length})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => { setShowArchived((s) => !s); setShowPending(false); }}
              className={cn("rounded-full border-admin-border flex-1 sm:flex-none", showArchived && "bg-muted")}
            >
              <ArchiveIcon className="w-4 h-4 mr-1" /> {showArchived ? "Showing Archived" : "Archived"}
            </Button>
            <Button onClick={() => navigate("/admin/vms/children/new")} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none">
              <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> New Child
            </Button>
          </div>
        </div>

        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <Card className="rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <BabyIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No children found</p>
                {children.length === 0 && (
                  <Button onClick={() => navigate("/admin/vms/children/new")} className="mt-4 rounded-full bg-primary text-primary-foreground">
                    <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Add First Child
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table, md and up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-admin-border">
                        <th className="text-left p-4 font-semibold text-foreground">Name</th>
                        <th className="text-left p-4 font-semibold text-foreground">Age</th>
                        <th className="text-left p-4 font-semibold text-foreground">Playground</th>
                        <th className="text-left p-4 font-semibold text-foreground">Emergency Contact</th>
                        <th className="text-left p-4 font-semibold text-foreground">Notes</th>
                        <th className="text-right p-4 font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(c => (
                        <tr
                          key={c.id}
                          onClick={() => showPending ? openReview(c) : navigate(`/admin/vms/children/${c.id}`)}
                          className="border-b border-admin-border/60 hover:bg-muted/50 cursor-pointer"
                        >
                          <td className="p-4 font-medium text-foreground">
                            {c.first_name} {c.last_name}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{c.age}</td>
                          <td className="p-4 text-muted-foreground text-xs">{formatPlayground(c.playground)}</td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {contacts[c.id] ? (
                              <div>
                                <div className="text-foreground">{contacts[c.id].name}</div>
                                <div className="flex items-center gap-1"><PhoneIcon className="w-3 h-3" />{contacts[c.id].phone}</div>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="p-4">
                            {(c.allergies || c.medical_conditions) && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                <WarningIcon className="w-3 h-3" weight="fill" /> Allergy/Medical
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              {showPending ? (
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openReview(c); }} className="h-9 w-9 text-primary" aria-label="Review"><EyeIcon className="w-4 h-4" /></Button>
                              ) : showArchived ? (
                                c.archived_at && <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRestore(c); }} className="h-9 w-9 text-primary" aria-label="Restore child"><ArrowCounterClockwiseIcon className="w-4 h-4" /></Button>
                              ) : (
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setArchiveTarget(c); }} className="h-9 w-9 text-destructive" aria-label="Archive child"><ArchiveIcon className="w-4 h-4" /></Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list, below md */}
                <div className="md:hidden divide-y divide-admin-border/60">
                  {filtered.map(c => (
                    <div
                      key={c.id}
                      onClick={() => showPending ? openReview(c) : navigate(`/admin/vms/children/${c.id}`)}
                      className="p-4 cursor-pointer active:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-foreground">{c.first_name} {c.last_name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {(c.allergies || c.medical_conditions) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                              <WarningIcon className="w-3 h-3" weight="fill" /> Medical
                            </span>
                          )}
                          {showPending ? (
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openReview(c); }} className="h-9 w-9 text-primary" aria-label="Review"><EyeIcon className="w-4 h-4" /></Button>
                          ) : showArchived ? (
                            c.archived_at && <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRestore(c); }} className="h-9 w-9 text-primary" aria-label="Restore child"><ArrowCounterClockwiseIcon className="w-4 h-4" /></Button>
                          ) : (
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setArchiveTarget(c); }} className="h-9 w-9 text-destructive" aria-label="Archive child"><ArchiveIcon className="w-4 h-4" /></Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{c.age} years &middot; {formatPlayground(c.playground)}</p>
                      {contacts[c.id] && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <PhoneIcon className="w-3 h-3" /> {contacts[c.id].name} &middot; {contacts[c.id].phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
          <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-foreground">Review {reviewTarget?.first_name} {reviewTarget?.last_name}</DialogTitle></DialogHeader>
            {reviewTarget && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Child Details</h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-muted-foreground text-xs">Date of Birth</dt><dd className="text-foreground">{new Date(reviewTarget.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Playground</dt><dd className="text-foreground">{formatPlayground(reviewTarget.playground)}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Ethnicity</dt><dd className="text-foreground">{reviewTarget.ethnicity || "-"}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Registration Source</dt><dd className="text-foreground capitalize">{reviewTarget.registration_source}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs">Medical Conditions</dt><dd className="text-foreground">{reviewTarget.medical_conditions || "None recorded"}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs">Allergies</dt><dd className="text-foreground">{reviewTarget.allergies || "None recorded"}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs">Additional Learning Needs</dt><dd className="text-foreground">{reviewTarget.additional_learning_needs || "None recorded"}</dd></div>
                  </dl>
                </div>

                {reviewParents.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Linked Parent/Guardian</h4>
                    <div className="space-y-3">
                      {reviewParents.map((link: any, i: number) => {
                        const p = link.parents;
                        if (!p) return null;
                        return (
                          <div key={i} className="p-3 rounded-xl border border-admin-border">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</span>
                              {p.approval_status === "pending" && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pending</span>
                              )}
                            </div>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                              <div><dt className="text-muted-foreground">Relationship</dt><dd className="text-foreground">{link.relationship || "-"}</dd></div>
                              <div><dt className="text-muted-foreground">Phone</dt><dd className="text-foreground">{p.phone}</dd></div>
                              <div><dt className="text-muted-foreground">Language</dt><dd className="text-foreground">{p.language || "-"}</dd></div>
                              <div><dt className="text-muted-foreground">Cultural Background</dt><dd className="text-foreground">{p.cultural_background || "-"}</dd></div>
                            </dl>
                            {p.approval_status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleParentReview(p, "approved")} className="h-8 rounded-full border-wapm-green/30 text-wapm-green flex-1">
                                  <CheckIcon className="w-3.5 h-3.5 mr-1" weight="bold" /> Approve Parent
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleParentReview(p, "rejected")} className="h-8 rounded-full border-destructive/30 text-destructive flex-1">
                                  <XIcon className="w-3.5 h-3.5 mr-1" weight="bold" /> Reject Parent
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleReview(reviewTarget, "rejected")} className="rounded-full border-destructive/30 text-destructive">
                <XIcon className="w-4 h-4 mr-1" weight="bold" /> Reject Child
              </Button>
              <Button onClick={() => handleReview(reviewTarget, "approved")} className="rounded-full bg-wapm-green hover:bg-wapm-green/90 text-white">
                <CheckIcon className="w-4 h-4 mr-1" weight="bold" /> Approve Child
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="text-foreground">Archive {archiveTarget?.first_name}?</DialogTitle></DialogHeader>
            <p className="text-muted-foreground text-sm">
              Archived children are hidden from active lists and attendance, but their history stays available in reports. This is not a delete.
            </p>
            <div>
              <Textarea placeholder="Reason (optional), e.g. family moved away" value={archiveReason} onChange={e => setArchiveReason(e.target.value)} className="rounded-xl mt-1" rows={2} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setArchiveTarget(null)} className="rounded-full">Go Back</Button>
              <Button onClick={handleArchive} disabled={archiving} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {archiving ? "Archiving..." : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
