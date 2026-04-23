import AnimatedSection from "@/components/ui/AnimatedSection";
import { Link } from "react-router-dom";

export default function AboutStrip() {
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
              Our staff and volunteers include many local residents who bring deep knowledge and a genuine understanding of what matters here. Whether it's transport, food, play or simply a place to connect — everything we do is rooted in the needs of the community.
            </p>
            <Link to="/team" className="btn-primary">Our Story →</Link>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 overflow-hidden"
                  style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
                >
                  <div className="w-full h-full bg-primary/5 flex items-center justify-center text-4xl opacity-30">
                    {["🏘️", "🌿", "🤝", "☀️"][i]}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
