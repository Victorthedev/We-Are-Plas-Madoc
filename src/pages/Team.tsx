import { useEffect, useState } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { supabase } from "@/integrations/superbase/client";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  social_link: string | null;
  is_trustee: boolean | null;
  display_order: number | null;
};

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("team_members")
      .select("*")
      .order("display_order")
      .then(({ data }) => {
        setMembers(data || []);
        setLoading(false);
      });
  }, []);

  const staff = members.filter(m => !m.is_trustee);
  const trustees = members.filter(m => m.is_trustee);

  return (
    <main id="main">
      <PageHero title="Meet The Team" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Meet The Team" }]} />

      <section className="section-padding bg-background">
        <div className="container mx-auto">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading...</div>
          ) : staff.length === 0 ? null : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {staff.map((person, i) => (
                <AnimatedSection key={person.id} delay={i * 0.1}>
                  <div className="card-wapm p-8 text-center group">
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 mb-6 group-hover:ring-4 group-hover:ring-primary/30 transition-all duration-300">
                      {person.photo_url ? (
                        <img src={person.photo_url} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{person.name}</h3>
                    <p className="text-sm text-primary mb-2">{person.role}</p>
                    {person.bio && <p className="text-xs text-muted-foreground">{person.bio}</p>}
                    {person.social_link && (
                      <a
                        href={person.social_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-accent transition-colors mt-3 inline-block"
                      >
                        Connect →
                      </a>
                    )}
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {trustees.length > 0 && (
        <section className="section-padding bg-wapm-lavender">
          <div className="container mx-auto">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">Our Trustees</h2>
            </AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {trustees.map((person, i) => (
                <AnimatedSection key={person.id} delay={i * 0.05}>
                  <div className="card-wapm p-6 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-primary/15 to-accent/15 mb-4">
                      {person.photo_url ? (
                        <img src={person.photo_url} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                      )}
                    </div>
                    <p className="font-semibold text-foreground text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.role || "Trustee"}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
