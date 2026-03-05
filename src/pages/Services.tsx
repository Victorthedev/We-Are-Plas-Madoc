import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Link } from "react-router-dom";

const services = [
  { icon: "🚗", title: "Community Car Scheme", desc: "Door-to-door transport for hospital appointments, shopping trips, social events and visiting family. Our volunteer drivers provide a friendly, reliable service.", slug: "community-car" },
  { icon: "🌿", title: "The Land Adventure Playground", desc: "A wild, creative outdoor space where children can explore, build, and connect with nature freely. Giving children freedom to take risks and develop resilience.", slug: "the-land" },
  { icon: "☕", title: "Kettle & Breakfast Club", desc: "A warm and welcoming space to start the day — combating isolation and bringing neighbours together. Free breakfast and great company.", slug: "kettle-club" },
  { icon: "🌻", title: "Little Sunflowers Childcare", desc: "Quality, affordable childcare in the heart of the community — giving parents peace of mind with experienced, caring staff.", slug: "little-sunflowers" },
  { icon: "🍱", title: "Mobile Food Van", desc: "Bringing affordable, nutritious food directly to residents across Plas Madoc every week. Supporting families with healthy meals.", slug: "food-van" },
];

export default function Services() {
  return (
    <main id="main">
      <PageHero title="Our Services" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16 max-w-[700px] mx-auto">
            <p className="text-muted-foreground text-lg">Everything we do is designed to support the residents of Plas Madoc. Click on any service below to learn more.</p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((s, i) => (
              <AnimatedSection key={s.slug} delay={i * 0.1}>
                <Link to={`/services/${s.slug}`} className="card-wapm p-8 h-full block border-t-[3px] border-transparent hover:border-primary group">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-5">{s.icon}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  <span className="text-primary font-semibold text-sm mt-4 inline-block group-hover:text-accent transition-colors">Learn More →</span>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
