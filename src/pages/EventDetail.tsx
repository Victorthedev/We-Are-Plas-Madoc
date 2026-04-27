import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/superbase/client";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import RsvpButton from "@/components/events/RsvpButton";
import EventShareButtons from "@/components/events/EventShareButtons";
import { MapPin, Clock, Calendar, ArrowLeft, Tag } from "lucide-react";

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single()
      .then(({ data }) => {
        if (data) setEvent(data);
        else setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  const isPast = event ? new Date(event.start_datetime) < new Date() : false;
  const eventUrl = `${window.location.origin}/events/${id}`;

  if (loading) return (
    <main id="main">
      <PageHero title="Event Details" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Events", to: "/events" }, { label: "Loading..." }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <div className="card-wapm p-12 text-center text-muted-foreground">Loading event...</div>
        </div>
      </section>
    </main>
  );

  if (notFound) return (
    <main id="main">
      <PageHero title="Event Not Found" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Events", to: "/events" }, { label: "Not Found" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="text-muted-foreground mb-6">This event doesn't exist or is no longer available.</p>
          <Link to="/events" className="btn-primary">Browse Events</Link>
        </div>
      </section>
    </main>
  );

  return (
    <main id="main">
      <PageHero
        title={event.title}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Events", to: "/events" }, { label: event.title }]}
      />

      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection>
            <button
              onClick={() => navigate("/events")}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Events
            </button>

            <div className="card-wapm overflow-hidden">
              {/* Poster image */}
              {event.poster_image_url && (
                <div className="w-full h-64 md:h-80 overflow-hidden">
                  <img
                    src={event.poster_image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-8">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.is_free && (
                    <span className="px-3 py-1 rounded-full bg-wapm-cyan/20 text-wapm-cyan text-xs font-semibold">Free Entry</span>
                  )}
                  {event.event_type && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-wapm-purple/10 text-wapm-purple text-xs font-semibold capitalize">
                      <Tag className="w-3 h-3" />{event.event_type.replace("-", " ")}
                    </span>
                  )}
                  {event.status === "cancelled" && (
                    <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">Cancelled</span>
                  )}
                  {isPast && event.status !== "cancelled" && (
                    <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">Past Event</span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{event.title}</h1>

                {/* Details */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>{formatDate(event.start_datetime)}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>
                      {formatTime(event.start_datetime)}
                      {event.end_datetime && ` – ${formatTime(event.end_datetime)}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {event.description && (
                  <div className="prose prose-sm max-w-none text-muted-foreground mb-8 whitespace-pre-line">
                    {event.description}
                  </div>
                )}

                {/* External link */}
                {event.external_link && (
                  <a
                    href={event.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-primary hover:underline mb-8"
                  >
                    More information →
                  </a>
                )}

                {/* RSVP */}
                {!isPast && event.status !== "cancelled" && (
                  <div className="border-t border-border pt-6 mb-6">
                    <p className="text-sm text-muted-foreground mb-3">Interested in coming along?</p>
                    <RsvpButton event={event} />
                  </div>
                )}

                {isPast && (
                  <div className="border-t border-border pt-6 mb-6">
                    <p className="text-sm text-muted-foreground">This event has passed. <Link to="/events" className="text-primary hover:underline">Browse upcoming events →</Link></p>
                  </div>
                )}

                {/* Share */}
                <div className="border-t border-border pt-6">
                  <EventShareButtons eventName={event.title} eventUrl={eventUrl} />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
