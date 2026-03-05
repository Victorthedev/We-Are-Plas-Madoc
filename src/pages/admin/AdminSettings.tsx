import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/layout/AdminShell";
import PermissionGuard from "@/components/admin/shared/PermissionGuard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminSettings() {
  const { user, profile, updatePassword, hasPermission } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name);
    supabase.from("site_settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(s => { map[s.key] = s.value || ""; });
      setSettings(map);
    });
  }, [profile]);

  const saveProfile = async () => {
    setSavingProfile(true);
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", user?.id);
    toast.success("Profile updated");
    setSavingProfile(false);
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 6) { toast.error("Min 6 characters"); return; }
    setSavingPw(true);
    const { error } = await updatePassword(newPw);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    setSavingPw(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    }
    toast.success("Settings saved");
    setSavingSettings(false);
  };

  return (
    <AdminShell title="Settings" breadcrumb="Dashboard > Settings">
      <div className="space-y-6 max-w-2xl">
        {/* My Account */}
        <Card className="rounded-2xl border-wapm-purple/[0.12]">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-wapm-deep-purple">My Account</h3>
            <div><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-[10px] mt-1" /></div>
            <div><Label>Email</Label><Input value={profile?.email || ""} disabled className="rounded-[10px] mt-1 bg-muted" /></div>
            <Button onClick={saveProfile} disabled={savingProfile} className="rounded-full bg-wapm-purple text-white">
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="rounded-2xl border-wapm-purple/[0.12]">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-wapm-deep-purple">Change Password</h3>
            <div><Label>New Password</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="rounded-[10px] mt-1" /></div>
            <div><Label>Confirm Password</Label><Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="rounded-[10px] mt-1" /></div>
            <Button onClick={changePassword} disabled={savingPw} variant="outline" className="rounded-full border-wapm-purple/20 text-wapm-purple">
              {savingPw ? "Updating..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Site Settings - super_admin only */}
        {hasPermission(["super_admin"]) && (
          <PermissionGuard roles={["super_admin"]}>
            <Card className="rounded-2xl border-wapm-purple/[0.12]">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-wapm-deep-purple">Site Settings</h3>
                <div><Label>Tagline</Label><Input value={settings.tagline || ""} onChange={e => setSettings({ ...settings, tagline: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Contact Email</Label><Input value={settings.contact_email || ""} onChange={e => setSettings({ ...settings, contact_email: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Main Phone</Label><Input value={settings.main_phone || ""} onChange={e => setSettings({ ...settings, main_phone: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Transport Phone</Label><Input value={settings.transport_phone || ""} onChange={e => setSettings({ ...settings, transport_phone: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Address</Label><Textarea value={settings.address || ""} onChange={e => setSettings({ ...settings, address: e.target.value })} className="rounded-xl mt-1" /></div>
                <div><Label>Facebook URL</Label><Input value={settings.facebook_url || ""} onChange={e => setSettings({ ...settings, facebook_url: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Twitter URL</Label><Input value={settings.twitter_url || ""} onChange={e => setSettings({ ...settings, twitter_url: e.target.value })} className="rounded-[10px] mt-1" /></div>
                <div><Label>Charity Number</Label><Input value={settings.charity_number || ""} disabled className="rounded-[10px] mt-1 bg-muted" /></div>
                <Button onClick={saveSettings} disabled={savingSettings} className="rounded-full bg-wapm-purple text-white">
                  {savingSettings ? "Saving..." : "Save Site Settings"}
                </Button>
              </CardContent>
            </Card>
          </PermissionGuard>
        )}
      </div>
    </AdminShell>
  );
}
