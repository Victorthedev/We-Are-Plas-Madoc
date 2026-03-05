import AnimatedSection from "@/components/ui/AnimatedSection";
import DotPattern from "@/components/ui/DotPattern";
import { Link } from "react-router-dom";

const placeholderEvents = [
  { id: "1", day: "28", month: "FEB", title: "Kettle Club Open Morning", time: "10:00 AM", location: "Opportunities Centre", desc: "Join us for a warm cuppa and friendly conversation." },
  { id: "2", day: "05", month: "MAR", title: "The Land Spring Opening", time: "1:00 PM", location: "The Land, Plas Madoc", desc: "Adventure playground opens for the spring season." },
  { id: "3", day: "12", month: "MAR", title: "Food Van Community Day", time: "11:00 AM", location: "Plas Madoc Estate", desc: "Free community food event for all residents." },
];

export default function UpcomingEvents() {
  return (
    <section className="relative section-padding bg-gradient-to-br from-primary to-wapm-dark overflow-hidden">
      <DotPattern opacity={0.08} />
      <div className="relative z-10 container mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="pill-badge bg-primary-foreground/20 text-primary-foreground mb-4 inline-flex">Events</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">Upcoming Events & Activities</h2>
          <p className="text-primary-foreground/80">See what's coming up in the community</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {placeholderEvents.map((evt, i) => (
            <AnimatedSection key={evt.id} delay={i * 0.1}>
              <div className="flex gap-5 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-card flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-primary leading-none">{evt.day}</span>
                  <span className="text-[10px] font-semibold text-primary uppercase">{evt.month}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground mb-1">{evt.title}</h3>
                  <p className="text-xs text-primary-foreground/70 mb-1">📍 {evt.location} · 🕐 {evt.time}</p>
                  <p className="text-sm text-primary-foreground/60 line-clamp-2">{evt.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
        <div className="text-center">
          <Link to="/events" className="btn-hero-outline">View Full Calendar →</Link>
        </div>
      </div>
    </section>
  );
}
