import WAPMLogo from "@/components/layout/WAPMLogo";
import DotPattern from "@/components/ui/DotPattern";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-wapm-deep to-primary overflow-hidden">
      <DotPattern opacity={0.08} />
      <div className="relative z-10 container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12 pt-24 pb-16">
        <div className="flex-1 text-center lg:text-left">
          <div
            className="pill-badge-cyan mb-6 inline-flex opacity-0"
            style={{ animation: "fade-in-up 0.6s 0.3s forwards" }}
          >
            🏴󠁧󠁢󠁷󠁬󠁳󠁿 Serving Plas Madoc, Wrexham
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground leading-[1.1] tracking-[-0.03em] mb-6">
            <span className="block opacity-0" style={{ animation: "fade-in-up 0.6s 0.4s forwards" }}>
              Building a Stronger
            </span>
            <span className="block opacity-0" style={{ animation: "fade-in-up 0.6s 0.55s forwards" }}>
              Community, Together
            </span>
          </h1>
          <p
            className="text-lg text-primary-foreground/85 font-light max-w-[480px] mb-8 mx-auto lg:mx-0 opacity-0"
            style={{ animation: "fade-in-up 0.6s 0.6s forwards" }}
          >
            We Are Plas Madoc (WAPM) is a community-led organisation improving opportunities and quality of life for residents in Plas Madoc. Shaped by local people, their ideas, skills and lived experience.
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start opacity-0"
            style={{ animation: "fade-in-up 0.6s 0.9s forwards" }}
          >
            <Link to="/services" className="btn-hero-filled">Explore Our Services</Link>
            <Link to="/get-involved" className="btn-hero-outline">Get Involved →</Link>
          </div>
          <div
            className="mt-12 text-primary-foreground/60 text-xs flex items-center gap-2 justify-center lg:justify-start opacity-0"
            style={{ animation: "fade-in-up 0.6s 1.1s forwards" }}
          >
            Scroll to discover <ChevronDown className="w-4 h-4 animate-bounce-down" />
          </div>
        </div>
        <div
          className="flex-shrink-0 opacity-0"
          style={{ animation: "fade-in-up 0.8s 0.5s forwards" }}
        >
          <div className="animate-float" style={{ filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.3))" }}>
            <WAPMLogo size={320} white />
          </div>
        </div>
      </div>
    </section>
  );
}
