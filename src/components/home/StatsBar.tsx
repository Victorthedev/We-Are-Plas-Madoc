import { useRef } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useCountUp } from "@/hooks/useCountUp";

const stats = [
  { icon: "🚗", number: 1200, suffix: "+", label: "Journeys Made" },
  { icon: "👨‍👩‍👧", number: 300, suffix: "+", label: "Families Supported" },
  { icon: "⭐", number: 6, suffix: "", label: "Active Services" },
  { icon: "📅", number: 10, suffix: "+", label: "Years Serving Plas Madoc" },
];

function StatItem({ stat, isActive }: { stat: typeof stats[0]; isActive: boolean }) {
  const count = useCountUp(stat.number, isActive);
  return (
    <div className="text-center px-8 py-4">
      <div className="text-3xl mb-2">{stat.icon}</div>
      <div className="text-4xl md:text-5xl font-extrabold text-primary">{count}{stat.suffix}</div>
      <div className="text-sm font-medium text-foreground mt-1">{stat.label}</div>
    </div>
  );
}

export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, { threshold: 0.3 });

  return (
    <section ref={ref} className="bg-card section-padding">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:divide-x divide-border">
          {stats.map((stat) => (
            <StatItem key={stat.label} stat={stat} isActive={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}
