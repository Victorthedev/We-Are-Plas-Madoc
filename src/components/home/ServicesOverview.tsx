import AnimatedSection from "@/components/ui/AnimatedSection";
import DotPattern from "@/components/ui/DotPattern";
import { Link } from "react-router-dom";

const services = [
  { icon: "🚗", title: "Community Car Scheme", desc: "Door-to-door transport for hospital appointments, shopping trips, social events and visiting family.", slug: "community-car" },
  { icon: "🌿", title: "The Land Adventure Playground", desc: "A wild, creative outdoor space where children can explore, build, and connect with nature freely.", slug: "the-land" },
  { icon: "☕", title: "Kettle & Breakfast Club", desc: "A warm and welcoming space to start the day — combating isolation and bringing neighbours together.", slug: "kettle-club" },
  { icon: "🌻", title: "Little Sunflowers Childcare", desc: "Quality, affordable childcare in the heart of the community — giving parents peace of mind.", slug: "little-sunflowers" },
  { icon: "🍱", title: "Mobile Food Van", desc: "Bringing affordable, nutritious food directly to residents across Plas Madoc every week.", slug: "food-van" },
];

export default function ServicesOverview() {
  return (
    <section className="relative section-padding bg-wapm-lavender">
      <DotPattern opacity={0.05} />
      <div className="relative z-10 container mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="pill-badge-cyan mb-4 inline-flex">Our Services</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">How We Support The Community</h2>
          <p className="text-muted-foreground max-w-[600px] mx-auto">From getting you to your appointments to keeping your children safe and happy — we're here when it matters.</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <AnimatedSection key={s.slug} delay={i * 0.1}>
              <div className="card-wapm p-8 h-full border-t-[3px] border-transparent hover:border-primary group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl mb-5">{s.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{s.desc}</p>
                <Link to={`/services/${s.slug}`} className="text-primary font-semibold text-sm hover:text-accent transition-colors">Learn More →</Link>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
