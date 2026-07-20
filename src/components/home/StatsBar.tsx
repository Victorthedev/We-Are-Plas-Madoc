import { useRef } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useCountUp } from "@/hooks/useCountUp";
import { CarIcon, UsersIcon, StarIcon, CalendarIcon } from "@phosphor-icons/react";

const stats = [
  { icon: CarIcon, number: 1200, suffix: "+", label: "Journeys Made" },
  { icon: UsersIcon, number: 300, suffix: "+", label: "Families Supported" },
  { icon: StarIcon, number: 6, suffix: "", label: "Active Services" },
  { icon: CalendarIcon, number: 10, suffix: "+", label: "Years Serving Plas Madoc" },
];

function StatItem({ stat, isActive }: { stat: typeof stats[0]; isActive: boolean }) {
  const count = useCountUp(stat.number, isActive);
  const Icon = stat.icon;
  return (
    <div className="text-center px-8 py-4 group">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3 group-hover:animate-[wiggle_0.4s_ease-in-out]">
        <Icon className="w-6 h-6" weight="duotone" />
      </div>
      <div className="text-4xl md:text-5xl font-display font-extrabold text-primary">{count}{stat.suffix}</div>
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
