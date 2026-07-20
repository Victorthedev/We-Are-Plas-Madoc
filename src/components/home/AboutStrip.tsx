import { useEffect, useState } from "react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/superbase/client";
import { HouseIcon, LeafIcon, UsersIcon, SunIcon, ArrowRightIcon } from "@phosphor-icons/react";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
};

const placeholderIcons = [HouseIcon, LeafIcon, UsersIcon, SunIcon];
const placeholderTints = ["bg-primary/12", "bg-accent/12", "bg-wapm-pink/12", "bg-wapm-green/12"];
const tileRotation = [-6, 5, -4, 7];
const tileOffset = ["", "mt-10", "-mt-4", "mt-6"];

export default function AboutStrip() {
  const [photos, setPhotos] = useState<GalleryItem[]>([]);

  useEffect(() => {
    supabase
      .from("gallery_items")
      .select("id, image_url, caption")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => setPhotos(data || []));
  }, []);

  return (
    <section className="section-padding bg-card">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <span className="pill-badge-cyan mb-4 inline-flex">About WAPM</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">A Community Built For, And By, Its Residents</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We Are Plas Madoc is a community-led organisation dedicated to improving opportunities and quality of life for residents in Plas Madoc. Our work is shaped by local people, their ideas, skills and lived experience.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Our staff and volunteers include many local residents who bring deep knowledge and a genuine understanding of what matters here. Whether it's transport, food, play or simply a place to connect, everything we do is rooted in the needs of the community.
            </p>
            <Link to="/team" className="btn-primary inline-flex items-center gap-1.5">Our Story <ArrowRightIcon className="w-4 h-4" weight="bold" /></Link>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-2 gap-6 px-2">
              {[0, 1, 2, 3].map((i) => {
                const photo = photos[i];
                const Icon = placeholderIcons[i];
                return (
                  <div
                    key={i}
                    className={`bg-card rounded-2xl p-2 transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] ${tileOffset[i]}`}
                    style={{ transform: `rotate(${tileRotation[i]}deg)`, boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden transition-transform duration-300 hover:-translate-y-1">
                      <div className={`w-full h-full flex items-center justify-center ${placeholderTints[i]}`}>
                        {photo ? (
                          <img
                            src={photo.image_url}
                            alt={photo.caption || "Community photo"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon className="w-10 h-10 text-foreground/30" weight="duotone" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
