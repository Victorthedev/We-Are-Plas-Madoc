import AnimatedSection from "@/components/ui/AnimatedSection";
import DotPattern from "@/components/ui/DotPattern";
import { Link } from "react-router-dom";

export default function GetInvolvedBanner() {
  return (
    <section className="relative section-padding bg-wapm-deep overflow-hidden">
      <DotPattern opacity={0.1} />
      <div className="relative z-10 container mx-auto text-center">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">Want to Make a Difference?</h2>
          <p className="text-primary-foreground/80 text-lg max-w-[600px] mx-auto mb-10">
            We're always looking for passionate volunteers to join our community. No experience needed — just a willing heart.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/get-involved" className="btn-hero-filled">Become a Volunteer</Link>
            <Link to="/contact" className="btn-hero-outline">Contact Us</Link>
          </div>
          <p className="text-primary-foreground/50 text-xs">We are a registered charity — Charity No. 1197278</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
