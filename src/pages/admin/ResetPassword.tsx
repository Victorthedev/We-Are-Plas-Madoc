import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    if (error) { toast.error(error.message); }
    else { toast.success("Password updated!"); navigate("/admin"); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-wapm-lavender flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-wapm-deep-purple mb-1">Set New Password</h1>
        <p className="text-muted-foreground text-sm mb-6">Enter your new password below.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="rounded-[10px] mt-1" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="rounded-[10px] mt-1" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-12 rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white font-semibold">
            {submitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
