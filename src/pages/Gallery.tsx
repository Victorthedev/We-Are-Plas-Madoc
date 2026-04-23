import { useState, useEffect, useCallback } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { supabase } from "@/integrations/superbase/client";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  category: string | null;
  created_at: string;
};

const categoryLabels: Record<string, string> = {
  events: "Events",
  "the-land": "The Land",
  homegrown: "Homegrown",
  "community-pantry": "Community Pantry",
  community: "Community",
  general: "General",
};

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("gallery_items")
      .select("id, image_url, caption, category, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, []);

  const presentCategories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];
  const tabs = ["All", ...presentCategories];
  const filtered = activeTab === "All" ? items : items.filter(i => i.category === activeTab);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    document.body.style.overflow = "";
  }, []);

  const goNext = useCallback(() => {
    if (lightboxIndex !== null) setLightboxIndex((lightboxIndex + 1) % filtered.length);
  }, [lightboxIndex, filtered.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex !== null) setLightboxIndex((lightboxIndex - 1 + filtered.length) % filtered.length);
  }, [lightboxIndex, filtered.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, goNext, goPrev, closeLightbox]);

  return (
    <main id="main">
      <PageHero title="Our Gallery" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Gallery" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-8">
            <p className="text-muted-foreground text-lg">A glimpse into life at Plas Madoc</p>
          </AnimatedSection>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No photos yet — check back soon.</div>
          ) : (
            <>
              {tabs.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-12 justify-center">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition-all duration-200 border-2 ${
                        activeTab === tab
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-primary border-primary/30 hover:border-primary"
                      }`}
                    >
                      {tab === "All" ? "All" : (categoryLabels[tab] || tab)}
                    </button>
                  ))}
                </div>
              )}

              <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                {filtered.map((item, i) => (
                  <AnimatedSection key={item.id} delay={i * 0.03}>
                    <button
                      onClick={() => openLightbox(i)}
                      className="relative w-full mb-4 rounded-xl overflow-hidden group cursor-pointer block"
                    >
                      <img
                        src={item.image_url}
                        alt={item.caption || "Gallery photo"}
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-wapm-deep/0 group-hover:bg-wapm-deep/50 transition-all duration-300 flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      {item.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-sm bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {item.caption}
                        </div>
                      )}
                    </button>
                  </AnimatedSection>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>
          <p className="absolute top-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIndex + 1} / {filtered.length}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 text-white/80 hover:text-white z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
          >
            <img
              src={filtered[lightboxIndex].image_url}
              alt={filtered[lightboxIndex].caption || "Gallery photo"}
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 text-white/80 hover:text-white z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
          {filtered[lightboxIndex].caption && (
            <p className="absolute bottom-8 text-white/80 text-sm text-center px-8">
              {filtered[lightboxIndex].caption}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
