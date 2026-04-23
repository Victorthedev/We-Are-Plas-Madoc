import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { supabase } from "@/integrations/superbase/client";

type Service = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  content: string | null;
  contact_info: string | null;
  opening_hours: string | null;
  how_to_access: string | null;
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("services")
      .select("*")
      .eq("slug", slug)
      .single()
      .then(({ data }) => {
        setService(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <main id="main">
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
      </main>
    );
  }

  if (!service) {
    return (
      <main id="main">
        <PageHero title="Service Not Found" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services", to: "/services" }, { label: "Not Found" }]} />
        <section className="section-padding text-center">
          <p className="text-muted-foreground">This service page doesn't exist.</p>
          <Link to="/services" className="btn-primary inline-block mt-6">Back to Services</Link>
        </section>
      </main>
    );
  }

  const paragraphs = (service.content || service.description || "").split("\n").filter(Boolean);

  return (
    <main id="main">
      <PageHero
        title={service.name}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services", to: "/services" }, { label: service.name }]}
      />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl">{service.icon || "📋"}</div>
              <h2 className="text-3xl font-bold text-foreground">{service.name}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed mb-4">{p}</p>
                ))}
              </div>
              <div>
                <div className="card-wapm p-6">
                  <h3 className="font-semibold text-foreground mb-4">Key Information</h3>
                  {service.opening_hours && (
                    <p className="text-sm text-muted-foreground mb-2">🕐 {service.opening_hours}</p>
                  )}
                  {service.how_to_access && (
                    <p className="text-sm text-muted-foreground mb-2">ℹ️ {service.how_to_access}</p>
                  )}
                  {service.contact_info && (
                    <p className="text-sm text-muted-foreground mb-4">{service.contact_info}</p>
                  )}
                  <Link to="/contact" className="btn-primary text-sm w-full text-center block">Get In Touch</Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
