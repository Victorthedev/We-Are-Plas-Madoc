import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { supabase } from "@/integrations/superbase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MagnifyingGlassIcon, StudentIcon, WarningIcon, SparkleIcon, PhoneIcon, DownloadSimpleIcon, FileXlsIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { YOUTH_AGE_BANDS, calculateAge, getYouthAgeBand, isYouthClubAge, isNewToYouthClub, fetchEmergencyContacts, formatPlayground, type EmergencyContact } from "@/lib/vms";
import { generateRosterPdf } from "@/lib/pdf";
import { downloadExcelWorkbook } from "@/lib/excel";
import PlaygroundFilter, { usePlaygroundFilter } from "@/components/admin/vms/PlaygroundFilter";
import FilterDisclosure from "@/components/admin/vms/FilterDisclosure";
import ExportMenu from "@/components/admin/vms/ExportMenu";

const tabs = ["all", ...YOUTH_AGE_BANDS] as const;
const ROSTER_COLUMNS = ["Name", "Age", "Playground", "Ethnicity", "Medical Conditions", "Allergies", "Additional Learning Needs", "Emergency Contact", "Contact Phone"];

export default function VmsYouth() {
  const navigate = useNavigate();
  const playgroundFilter = usePlaygroundFilter();
  const [youth, setYouth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<typeof tabs[number]>("all");
  const [contacts, setContacts] = useState<Record<string, EmergencyContact>>({});
  const [exportingRoster, setExportingRoster] = useState(false);

  useEffect(() => {
    const fetchYouth = async () => {
      setLoading(true);
      const { data } = await supabase.from("children").select("*").is("archived_at", null).eq("approval_status", "approved").order("first_name").order("last_name");
      const youthMembers = (data || []).filter((c) => isYouthClubAge(c.date_of_birth)).map((c) => ({ ...c, age: calculateAge(c.date_of_birth) }));
      setYouth(youthMembers);
      if (youthMembers.length) setContacts(await fetchEmergencyContacts(youthMembers.map((c) => c.id)));
      setLoading(false);
    };
    fetchYouth();
  }, []);

  const filtered = youth.filter((c) => {
    if (playgroundFilter !== "all" && c.playground !== playgroundFilter) return false;
    if (tab !== "all" && getYouthAgeBand(c.age) !== tab) return false;
    if (search && !`${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rosterRows = () => filtered.map((c) => [
    `${c.first_name} ${c.last_name}`, c.age, formatPlayground(c.playground),
    c.ethnicity || "", c.medical_conditions || "", c.allergies || "", c.additional_learning_needs || "",
    contacts[c.id]?.name || "", contacts[c.id]?.phone || "",
  ]);

  const handleExportRosterPdf = async () => {
    setExportingRoster(true);
    try {
      await generateRosterPdf("Youth_Club_Roster", "Youth Club Roster", `${filtered.length} member${filtered.length === 1 ? "" : "s"}`, ROSTER_COLUMNS, rosterRows());
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
    setExportingRoster(false);
  };
  const handleExportRosterExcel = () => {
    downloadExcelWorkbook("WAPM_Youth_Club_Roster.xlsx", [{ name: "Youth Club", headers: ROSTER_COLUMNS, rows: rosterRows() }]);
  };

  return (
    <AdminShell title="Youth Club" breadcrumb="Dashboard > Visitor Management > Youth Club">
      <PermissionGuard roles={["super_admin", "playground_worker"]}>
        <p className="text-sm text-muted-foreground mb-2">
          Young people aged 10-17. These are the same records as the Children register, editing here updates the same person.
        </p>
        <div className="text-sm mb-4">
          <span className="font-bold text-foreground text-lg">{youth.filter((c) => playgroundFilter === "all" || c.playground === playgroundFilter).length}</span> <span className="text-muted-foreground">active youth club members</span>
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
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border",
                  tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-primary border-primary/20 hover:bg-primary/5"
                )}
              >
                {t === "all" ? "All ages" : t}
              </button>
            ))}
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
                <StudentIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-semibold text-foreground">No youth club members found</p>
                <p className="text-sm text-muted-foreground mt-1">Young people appear here automatically from age 10.</p>
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
                        <th className="text-left p-4 font-semibold text-foreground">Emergency Contact</th>
                        <th className="text-left p-4 font-semibold text-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(c => (
                        <tr key={c.id} onClick={() => navigate(`/admin/vms/children/${c.id}`)} className="border-b border-admin-border/60 hover:bg-muted/50 cursor-pointer">
                          <td className="p-4 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{c.first_name} {c.last_name}</span>
                              {isNewToYouthClub(c.date_of_birth) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-wapm-cyan/20 text-wapm-cyan">
                                  <SparkleIcon className="w-3 h-3" weight="fill" /> New
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{c.age}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list, below md */}
                <div className="md:hidden divide-y divide-admin-border/60">
                  {filtered.map(c => (
                    <div key={c.id} onClick={() => navigate(`/admin/vms/children/${c.id}`)} className="p-4 cursor-pointer active:bg-muted/50">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{c.first_name} {c.last_name}</span>
                          {isNewToYouthClub(c.date_of_birth) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-wapm-cyan/20 text-wapm-cyan">
                              <SparkleIcon className="w-3 h-3" weight="fill" /> New
                            </span>
                          )}
                        </div>
                        {(c.allergies || c.medical_conditions) && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                            <WarningIcon className="w-3 h-3" weight="fill" /> Medical
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{c.age} years</p>
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
      </PermissionGuard>
    </AdminShell>
  );
}
