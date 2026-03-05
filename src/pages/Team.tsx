import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";

const staff = [
  { name: "Claire Pugh", role: "AVOW Play Department Manager & Community Development Manager", bio: "Leading community initiatives across Plas Madoc." },
  { name: "Donna Jordan", role: "AVOW Play Team & Community Development Officer", bio: "Supporting residents and coordinating local projects." },
];

const trustees = ["Anne Salisbury", "Zoe", "Emma Green", "Sharon Evans", "Stephen Perkins", "Sue Tookey", "Sian Hughes"];

export default function Team() {
  return (
    <main id="main">
      <PageHero title="Meet The Team" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Meet The Team" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {staff.map((person, i) => (
              <AnimatedSection key={person.name} delay={i * 0.1}>
                <div className="card-wapm p-8 text-center group">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-6 flex items-center justify-center text-4xl group-hover:ring-4 group-hover:ring-primary/30 transition-all duration-300">👤</div>
                  <h3 className="text-lg font-semibold text-foreground">{person.name}</h3>
                  <p className="text-sm text-primary mb-2">{person.role}</p>
                  <p className="text-xs text-muted-foreground">{person.bio}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
      <section className="section-padding bg-wapm-lavender">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-12"><h2 className="text-3xl font-bold text-foreground">Our Trustees</h2></AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {trustees.map((name, i) => (
              <AnimatedSection key={name} delay={i * 0.05}>
                <div className="card-wapm p-6 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/15 to-accent/15 mb-4 flex items-center justify-center text-2xl">👤</div>
                  <p className="font-semibold text-foreground text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">Trustee</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
