import { useEffect, useState } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/superbase/client";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number | null;
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("services")
      .select("id, name, slug, description, icon, display_order")
      .order("display_order")
      .then(({ data }) => {
        setServices(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <main id="main">
      <PageHero title="Our Services" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-16 max-w-[700px] mx-auto">
            <p className="text-muted-foreground text-lg">Everything we do is designed to support the residents of Plas Madoc. Click on any service below to learn more.</p>
          </AnimatedSection>
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((s, i) => (
                <AnimatedSection key={s.id} delay={i * 0.1}>
                  <Link to={`/services/${s.slug}`} className="card-wapm p-8 h-full block border-t-[3px] border-transparent hover:border-primary group">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-5">{s.icon || "📋"}</div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{s.name}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
                    <span className="text-primary font-semibold text-sm mt-4 inline-block group-hover:text-accent transition-colors">Learn More →</span>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
