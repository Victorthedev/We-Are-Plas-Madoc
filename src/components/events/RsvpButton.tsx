import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import RsvpModal from "./RsvpModal";

interface RsvpButtonProps {
  event: {
    id: string;
    title: string;
    start_datetime: string;
    location?: string | null;
    status: string;
  };
  size?: "sm" | "default";
}

export default function RsvpButton({ event, size = "default" }: RsvpButtonProps) {
  const [open, setOpen] = useState(false);
  const [hasRsvpd, setHasRsvpd] = useState(false);

  useEffect(() => {
    // Check all localStorage keys for this event
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`rsvp_${event.id}_`)) {
        setHasRsvpd(true);
        break;
      }
    }
  }, [event.id]);

  if (event.status === "cancelled") return null;

  if (hasRsvpd) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border-2 border-wapm-green text-wapm-green font-semibold ${size === "sm" ? "px-3 py-1 text-xs" : "px-5 py-2 text-sm"}`}>
        <Check className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} /> You're Attending
      </span>
    );
  }

  return (
    <>
      <Button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold ${size === "sm" ? "px-3 py-1 h-auto text-xs" : ""}`}
        size={size === "sm" ? "sm" : "default"}
      >
        I'm Attending
      </Button>
      <RsvpModal
        open={open}
        onOpenChange={setOpen}
        event={event}
        onSuccess={() => setHasRsvpd(true)}
      />
    </>
  );
}
