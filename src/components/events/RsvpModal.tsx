import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

interface RsvpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    start_datetime: string;
    location?: string | null;
  };
  onSuccess?: () => void;
}

export default function RsvpModal({ open, onOpenChange, event, onSuccess }: RsvpModalProps) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", party_size: 1 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (form.party_size < 1 || form.party_size > 10) e.party_size = "Between 1 and 10";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const update = (field: string, value: string | number) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setDuplicate(false);

    try {
      const { data, error } = await supabase.functions.invoke("handle-rsvp", {
        body: { action: "submit", event_id: event.id, ...form },
      });

      if (error) throw error;

      if (data.duplicate) {
        setDuplicate(true);
      } else {
        // Save to localStorage
        const key = `rsvp_${event.id}_${form.email.toLowerCase()}`;
        localStorage.setItem(key, "true");
        setSuccess(true);
        onSuccess?.();
      }
    } catch (err) {
      console.error("RSVP error:", err);
    }
    setLoading(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm({ first_name: "", last_name: "", email: "", phone: "", party_size: 1 });
      setErrors({});
      setSuccess(false);
      setDuplicate(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-primary/10">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-wapm-green/10 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50">
              <Check className="w-8 h-8 text-wapm-green" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">You're confirmed! 🎉</h3>
            <p className="text-sm text-muted-foreground mb-1">We've sent a confirmation to <strong>{form.email}</strong></p>
            <p className="text-sm text-muted-foreground">See you on {formatDate(event.start_datetime)}!</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">Indicate your interest 🎉</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{event.title}</p>
            </DialogHeader>

            {duplicate && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-sm text-foreground">
                Looks like you're already registered for this event! Check your email for your confirmation.
              </div>
            )}

            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-sm">First Name *</Label>
                <Input value={form.first_name} onChange={e => update("first_name", e.target.value)} className="rounded-xl mt-1" placeholder="Your first name" />
                {errors.first_name && <p className="text-destructive text-xs mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <Label className="text-sm">Last Name</Label>
                <Input value={form.last_name} onChange={e => update("last_name", e.target.value)} className="rounded-xl mt-1" placeholder="Your last name (optional)" />
              </div>
              <div>
                <Label className="text-sm">Email *</Label>
                <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} className="rounded-xl mt-1" placeholder="your@email.com" />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label className="text-sm">Phone</Label>
                <Input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} className="rounded-xl mt-1" placeholder="Optional" />
              </div>
              <div>
                <Label className="text-sm">Number of people attending (including yourself)</Label>
                <Input type="number" min={1} max={10} value={form.party_size} onChange={e => update("party_size", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} className="rounded-xl mt-1 w-24" />
                {errors.party_size && <p className="text-destructive text-xs mt-1">{errors.party_size}</p>}
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {loading ? "Submitting..." : "Confirm Attendance"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
