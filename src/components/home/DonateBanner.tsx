import AnimatedSection from "@/components/ui/AnimatedSection";
import DotPattern from "@/components/ui/DotPattern";
import { Link } from "react-router-dom";

export default function DonateBanner() {
  return (
    <section className="relative section-padding bg-primary overflow-hidden">
      <DotPattern opacity={0.1} />
      <div className="relative z-10 container mx-auto text-center">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">Support Us Today</h2>
          <p className="text-primary-foreground/80 text-lg max-w-[600px] mx-auto mb-10">
            Every donation helps us keep the playground, youth club and community services running for local families.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/donate" className="btn-hero-filled">Donate Now</Link>
          </div>
          <p className="text-primary-foreground/50 text-xs">We are a registered charity, Charity No. 1197278</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
