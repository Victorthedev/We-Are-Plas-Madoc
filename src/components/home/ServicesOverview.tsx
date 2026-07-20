import { useEffect, useState } from "react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import DotPattern from "@/components/ui/DotPattern";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/superbase/client";
import { ClipboardTextIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import { serviceIcons } from "@/lib/serviceIcons";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number | null;
};

export default function ServicesOverview() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    supabase
      .from("services")
      .select("id, name, slug, description, icon, display_order")
      .order("display_order")
      .then(({ data }) => setServices(data || []));
  }, []);

  if (services.length === 0) return null;

  return (
    <section className="relative section-padding bg-wapm-lavender">
      <DotPattern opacity={0.05} />
      <div className="relative z-10 container mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="pill-badge-cyan mb-4 inline-flex">Our Services</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">How We Support The Community</h2>
          <p className="text-muted-foreground max-w-[600px] mx-auto">From getting you to your appointments to keeping your children safe and happy, we're here when it matters.</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, i) => {
            const ServiceIcon = serviceIcons[s.slug] || ClipboardTextIcon;
            return (
            <AnimatedSection key={s.id} delay={i * 0.1}>
              <Link
                to={`/services/${s.slug}`}
                className="card-wapm relative flex flex-col p-8 h-full border-t-[3px] border-transparent hover:border-primary group"
              >
                <span className="absolute top-8 right-8 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                  <ArrowUpRightIcon className="w-4 h-4" weight="bold" />
                </span>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:animate-[wiggle_0.4s_ease-in-out]">
                  <ServiceIcon className="w-6 h-6" weight="duotone" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3 pr-10">{s.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </Link>
            </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
