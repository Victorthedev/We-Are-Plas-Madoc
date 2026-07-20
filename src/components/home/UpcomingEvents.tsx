import { useEffect, useState } from "react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import DotPattern from "@/components/ui/DotPattern";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/superbase/client";
import { MapPinIcon, ClockIcon, ArrowRightIcon } from "@phosphor-icons/react";

type Event = {
  id: string;
  title: string;
  start_datetime: string;
  location: string | null;
  description: string | null;
};

export default function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, start_datetime, location, description")
      .eq("status", "published")
      .gte("start_datetime", new Date().toISOString())
      .order("start_datetime", { ascending: true })
      .limit(3)
      .then(({ data }) => setEvents(data || []));
  }, []);

  if (events.length === 0) return null;

  return (
    <section className="relative section-padding bg-primary overflow-hidden">
      <DotPattern opacity={0.08} />
      <div className="absolute -bottom-32 -left-16 w-[380px] h-[380px] rounded-full bg-wapm-deep-purple/25 blur-3xl pointer-events-none" />
      <div className="relative z-10 container mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="pill-badge bg-primary-foreground/20 text-primary-foreground mb-4 inline-flex">Events</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">Upcoming Events & Activities</h2>
          <p className="text-primary-foreground/80">See what's coming up in the community</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {events.map((evt, i) => {
            const date = new Date(evt.start_datetime);
            const day = date.toLocaleDateString("en-GB", { day: "2-digit" });
            const month = date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
            const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            return (
              <AnimatedSection key={evt.id} delay={i * 0.1}>
                <div className="flex gap-5 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-card flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-primary leading-none">{day}</span>
                    <span className="text-[10px] font-semibold text-primary uppercase">{month}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-foreground mb-1">{evt.title}</h3>
                    <p className="text-xs text-primary-foreground/70 mb-1 flex items-center flex-wrap gap-x-1.5">
                      {evt.location && (
                        <span className="inline-flex items-center gap-1"><MapPinIcon className="w-3 h-3" weight="duotone" /> {evt.location}</span>
                      )}
                      <span className="inline-flex items-center gap-1"><ClockIcon className="w-3 h-3" weight="duotone" /> {time}</span>
                    </p>
                    {evt.description && (
                      <p className="text-sm text-primary-foreground/60 line-clamp-2">{evt.description}</p>
                    )}
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
        <div className="text-center">
          <Link to="/events" className="btn-hero-outline inline-flex items-center gap-1.5">View Full Calendar <ArrowRightIcon className="w-4 h-4" weight="bold" /></Link>
        </div>
      </div>
    </section>
  );
}
