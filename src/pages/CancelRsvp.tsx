import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../integrations/superbase/client";
import { Button } from "@/components/ui/button";
import PageHero from "@/components/layout/PageHero";

export default function CancelRsvp() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [rsvp, setRsvp] = useState<any>(null);
  const [cancelled, setCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setLoading(false); setError("Invalid link."); return; }
    supabase.functions.invoke("handle-rsvp", { body: { action: "get-by-token", token } })
      .then(({ data }) => {
        if (data?.rsvp) setRsvp(data.rsvp);
        else setError("RSVP not found. It may have already been cancelled.");
        setLoading(false);
      })
      .catch(() => { setError("Something went wrong."); setLoading(false); });
  }, [token]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("handle-rsvp", { body: { action: "cancel", token } });
      if (err) throw err;
      setCancelled(true);
    } catch {
      setError("Failed to cancel. Please try again.");
    }
    setCancelling(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <main id="main">
      <PageHero title="Cancel RSVP" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Events", to: "/events" }, { label: "Cancel RSVP" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-lg">
          <div className="card-wapm p-8 text-center">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : error ? (
              <>
                <p className="text-lg font-semibold text-foreground mb-2">Oops</p>
                <p className="text-muted-foreground">{error}</p>
              </>
            ) : cancelled ? (
              <>
                <div className="text-5xl mb-4">👋</div>
                <p className="text-lg font-semibold text-foreground mb-2">Your RSVP has been cancelled.</p>
                <p className="text-muted-foreground">Hope to see you next time!</p>
              </>
            ) : rsvp ? (
              <>
                <h2 className="text-xl font-bold text-foreground mb-2">{rsvp.events?.title}</h2>
                <p className="text-sm text-muted-foreground mb-6">{rsvp.events?.start_datetime && formatDate(rsvp.events.start_datetime)}</p>
                <p className="text-foreground mb-8">Are you sure you want to cancel your RSVP for <strong>{rsvp.first_name}</strong>?</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleCancel} disabled={cancelling} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    {cancelling ? "Cancelling..." : "Yes, Cancel My RSVP"}
                  </Button>
                  <Button variant="outline" onClick={() => window.history.back()} className="rounded-full border-border text-muted-foreground">
                    Keep My RSVP
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
