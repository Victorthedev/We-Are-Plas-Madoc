import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, MagnifyingGlassIcon, PencilSimpleIcon, UserListIcon, ClockIcon, CheckIcon, XIcon, EyeIcon, DownloadSimpleIcon, FileXlsIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import FilterDisclosure from "@/components/admin/vms/FilterDisclosure";
import ExportMenu from "@/components/admin/vms/ExportMenu";
import { formatPlayground, calculateAge } from "@/lib/vms";
import { generateRosterPdf } from "@/lib/pdf";
import { downloadExcelWorkbook } from "@/lib/excel";
import { useAuth } from "@/hooks/useAuth";

const ROSTER_COLUMNS = ["Name", "Phone", "Playground", "Linked Children", "Language", "Cultural Background", "Religion"];

export default function VmsParents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const playgroundFilter = usePlaygroundFilter();
  const [parents, setParents] = useState<any[]>([]);
  const [linkCounts, setLinkCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPending, setShowPending] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewChildren, setReviewChildren] = useState<any[]>([]);
  const [exportingRoster, setExportingRoster] = useState(false);

  const fetchParents = async () => {
    setLoading(true);
    const { data } = await supabase.from("parents").select("*").order("first_name").order("last_name");
    setParents(data || []);

    if (data?.length) {
      const { data: links } = await supabase.from("child_parent_links").select("parent_id");
      const counts: Record<string, number> = {};
      (links || []).forEach((l) => { counts[l.parent_id] = (counts[l.parent_id] || 0) + 1; });
      setLinkCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchParents(); }, []);

  const byPlayground = parents.filter((p) => playgroundFilter === "all" || p.playground === playgroundFilter);
  const pendingParents = byPlayground.filter((p) => p.approval_status === "pending");
  const base = showPending ? pendingParents : byPlayground.filter((p) => p.approval_status === "approved");
  const filtered = base.filter((p) =>
    !search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleReview = async (parent: any, status: "approved" | "rejected") => {
    await supabase.from("parents").update({
      approval_status: status, approved_by: user?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", parent.id);
    await supabase.from("vms_activity_log").insert({ action_type: status, content_type: "parent", content_id: parent.id });
    toast.success(`${parent.first_name} ${status}`);
    setReviewTarget(null);
    fetchParents();
  };

  const handleChildReview = async (child: any, status: "approved" | "rejected") => {
    await supabase.from("children").update({
      approval_status: status, approved_by: user?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", child.id);
    await supabase.from("vms_activity_log").insert({ action_type: status, content_type: "child", content_id: child.id });
    toast.success(`${child.first_name} ${status}`);
    if (reviewTarget) openReview(reviewTarget);
  };

  const openReview = async (parent: any) => {
    setReviewTarget(parent);
    const { data } = await supabase
      .from("child_parent_links")
      .select("relationship, is_primary_contact, children(*)")
      .eq("parent_id", parent.id);
    setReviewChildren(data || []);
  };

  const rosterRows = () => filtered.map((p) => [
    `${p.first_name} ${p.last_name}`, p.phone, formatPlayground(p.playground),
    linkCounts[p.id] || 0, p.language || "", p.cultural_background || "", p.religion || "",
  ]);
  const handleExportRosterPdf = async () => {
    setExportingRoster(true);
    try {
      await generateRosterPdf("Parents_Roster", "Parents Roster", `${showPending ? "Pending" : "Approved"} · ${filtered.length} record${filtered.length === 1 ? "" : "s"}`, ROSTER_COLUMNS, rosterRows());
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExportingRoster(false);
  };
  const handleExportRosterExcel = () => {
    downloadExcelWorkbook("WAPM_Parents_Roster.xlsx", [{ name: "Parents", headers: ROSTER_COLUMNS, rows: rosterRows() }]);
  };

  return (
    <AdminShell title="Parents" breadcrumb="Dashboard > Visitor Management > Parents">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <div className="text-sm mb-4">
          <span className="font-bold text-foreground text-lg">{byPlayground.filter((p) => p.approval_status === "approved").length}</span> <span className="text-muted-foreground">total</span>
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

        <div className="flex flex-col sm:flex-row justify-end gap-2 mb-6">
          {pendingParents.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowPending((s) => !s)}
              className={cn("rounded-full border-amber-300 text-amber-700 w-full sm:w-auto", showPending && "bg-amber-100")}
            >
              <ClockIcon className="w-4 h-4 mr-1" /> Pending Review ({pendingParents.length})
            </Button>
          )}
          <Button onClick={() => navigate("/admin/vms/parents/new")} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> New Parent
          </Button>
        </div>

        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <Card className={cn("rounded-2xl border-admin-border shadow-[0_2px_12px_rgba(20,20,30,0.06)]")}>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <UserListIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No parents found</p>
                {parents.length === 0 && (
                  <Button onClick={() => navigate("/admin/vms/parents/new")} className="mt-4 rounded-full bg-primary text-primary-foreground">
                    <PlusIcon className="w-4 h-4 mr-1" weight="bold" /> Add First Parent
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
                        <th className="text-left p-4 font-semibold text-foreground">Phone</th>
                        <th className="text-left p-4 font-semibold text-foreground">Linked Children</th>
                        <th className="text-right p-4 font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <tr key={p.id} className="border-b border-admin-border/60 hover:bg-muted/50">
                          <td className="p-4 font-medium text-foreground">
                            {showPending ? (
                              <button onClick={() => openReview(p)} className="hover:text-primary transition-colors text-left">{p.first_name} {p.last_name}</button>
                            ) : (
                              <Link to={`/admin/vms/parents/${p.id}`} className="hover:text-primary transition-colors">{p.first_name} {p.last_name}</Link>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{p.phone}</td>
                          <td className="p-4 text-muted-foreground text-xs">{linkCounts[p.id] || 0}</td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              {showPending ? (
                                <Button size="icon" variant="ghost" onClick={() => openReview(p)} className="h-9 w-9 text-primary" aria-label="Review"><EyeIcon className="w-4 h-4" /></Button>
                              ) : (
                                <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/vms/parents/${p.id}/edit`)} className="h-9 w-9 text-primary" aria-label="Edit parent"><PencilSimpleIcon className="w-4 h-4" /></Button>
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
                  {filtered.map(p => (
                    <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        {showPending ? (
                          <button onClick={() => openReview(p)} className="font-medium text-foreground truncate hover:text-primary transition-colors block text-left">{p.first_name} {p.last_name}</button>
                        ) : (
                          <Link to={`/admin/vms/parents/${p.id}`} className="font-medium text-foreground truncate hover:text-primary transition-colors block">{p.first_name} {p.last_name}</Link>
                        )}
                        <p className="text-xs text-muted-foreground">{p.phone} &middot; {linkCounts[p.id] || 0} linked {linkCounts[p.id] === 1 ? "child" : "children"}</p>
                      </div>
                      {showPending ? (
                        <Button size="icon" variant="ghost" onClick={() => openReview(p)} className="h-10 w-10 text-primary shrink-0" aria-label="Review"><EyeIcon className="w-4 h-4" /></Button>
                      ) : (
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/vms/parents/${p.id}/edit`)} className="h-10 w-10 text-primary shrink-0" aria-label="Edit parent"><PencilSimpleIcon className="w-4 h-4" /></Button>
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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Parent/Guardian Details</h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-muted-foreground text-xs">Phone</dt><dd className="text-foreground">{reviewTarget.phone}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Playground</dt><dd className="text-foreground">{formatPlayground(reviewTarget.playground)}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Date of Birth</dt><dd className="text-foreground">{reviewTarget.date_of_birth ? new Date(reviewTarget.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-"}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Language</dt><dd className="text-foreground">{reviewTarget.language || "-"}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Cultural Background</dt><dd className="text-foreground">{reviewTarget.cultural_background || "-"}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Religion</dt><dd className="text-foreground">{reviewTarget.religion || "-"}</dd></div>
                  </dl>
                </div>

                {reviewChildren.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Linked Children</h4>
                    <div className="space-y-3">
                      {reviewChildren.map((link: any, i: number) => {
                        const c = link.children;
                        if (!c) return null;
                        return (
                          <div key={i} className="p-3 rounded-xl border border-admin-border">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-sm font-medium text-foreground">{c.first_name} {c.last_name} &middot; {calculateAge(c.date_of_birth)} yrs</span>
                              {c.approval_status === "pending" && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pending</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{link.relationship || "Relationship not set"}{link.is_primary_contact ? " · Primary contact" : ""}</p>
                            {c.approval_status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleChildReview(c, "approved")} className="h-8 rounded-full border-wapm-green/30 text-wapm-green flex-1">
                                  <CheckIcon className="w-3.5 h-3.5 mr-1" weight="bold" /> Approve Child
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleChildReview(c, "rejected")} className="h-8 rounded-full border-destructive/30 text-destructive flex-1">
                                  <XIcon className="w-3.5 h-3.5 mr-1" weight="bold" /> Reject Child
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
                <XIcon className="w-4 h-4 mr-1" weight="bold" /> Reject Parent
              </Button>
              <Button onClick={() => handleReview(reviewTarget, "approved")} className="rounded-full bg-wapm-green hover:bg-wapm-green/90 text-white">
                <CheckIcon className="w-4 h-4 mr-1" weight="bold" /> Approve Parent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AdminShell>
  );
}
