import { useState, useEffect, useCallback } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

const categories = ["All", "Events", "The Land", "Community", "Little Sunflowers", "Food Van"];
const categoryMap: Record<string, string> = { Events: "events", "The Land": "land", Community: "community", "Little Sunflowers": "sunflowers", "Food Van": "food-van" };

const galleryItems = Array.from({ length: 18 }, (_, i) => ({
  id: String(i + 1),
  caption: ["Community gathering", "The Land playground", "Kettle Club morning", "Food van delivery", "Volunteer team", "Little Sunflowers", "Estate mural", "Spring event", "Community garden"][i % 9],
  category: ["events", "land", "community", "food-van", "community", "sunflowers", "events", "land", "community"][i % 9],
  height: [240, 320, 280, 200, 360, 260, 300, 220, 340][i % 9],
}));

export default function Gallery() {
  const [activeTab, setActiveTab] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const filtered = activeTab === "All" ? galleryItems : galleryItems.filter(g => g.category === categoryMap[activeTab]);

  const closeLightbox = useCallback(() => { setLightboxIndex(null); document.body.style.overflow = ""; }, []);
  const goNext = useCallback(() => { if (lightboxIndex !== null) setLightboxIndex((lightboxIndex + 1) % filtered.length); }, [lightboxIndex, filtered.length]);
  const goPrev = useCallback(() => { if (lightboxIndex !== null) setLightboxIndex((lightboxIndex - 1 + filtered.length) % filtered.length); }, [lightboxIndex, filtered.length]);

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
          <div className="flex flex-wrap gap-2 mb-12 justify-center">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveTab(cat)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 border-2 ${
                  activeTab === cat ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-primary border-primary/30 hover:border-primary"
                }`}>{cat}</button>
            ))}
          </div>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
            {filtered.map((item, i) => (
              <AnimatedSection key={item.id} delay={i * 0.03}>
                <button
                  onClick={() => { setLightboxIndex(i); document.body.style.overflow = "hidden"; }}
                  className="relative w-full mb-4 rounded-xl overflow-hidden group cursor-pointer block"
                  style={{ height: item.height }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                  <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">📷</div>
                  <div className="absolute inset-0 bg-wapm-deep/0 group-hover:bg-wapm-deep/60 transition-all duration-300 flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-primary-foreground text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.caption}
                    </div>
                  )}
                </button>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[200] bg-foreground/95 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-6 right-6 text-primary-foreground/80 hover:text-primary-foreground" aria-label="Close"><X className="w-8 h-8" /></button>
          <p className="absolute top-6 left-1/2 -translate-x-1/2 text-primary-foreground/60 text-sm">{lightboxIndex + 1} / {filtered.length}</p>
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-4 text-primary-foreground/80 hover:text-primary-foreground" aria-label="Previous"><ChevronLeft className="w-10 h-10" /></button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[80vh] rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center" style={{ width: 600, height: 400 }}>
            <span className="text-6xl opacity-20">📷</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-4 text-primary-foreground/80 hover:text-primary-foreground" aria-label="Next"><ChevronRight className="w-10 h-10" /></button>
          {filtered[lightboxIndex]?.caption && <p className="absolute bottom-8 text-primary-foreground/80 text-sm">{filtered[lightboxIndex].caption}</p>}
        </div>
      )}
    </main>
  );
}
