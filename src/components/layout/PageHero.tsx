import { Link } from "react-router-dom";
import DotPattern from "@/components/ui/DotPattern";

interface Breadcrumb {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  breadcrumbs?: Breadcrumb[];
}

export default function PageHero({ title, breadcrumbs }: Props) {
  return (
    <section className="relative min-h-[40vh] flex items-center justify-center bg-gradient-to-br from-wapm-deep to-primary overflow-hidden">
      <DotPattern opacity={0.08} />
      <div className="relative z-10 text-center px-4 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">{title}</h1>
        {breadcrumbs && (
          <nav className="text-primary-foreground/70 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-2">›</span>}
                {b.to ? <Link to={b.to} className="hover:text-primary-foreground transition-colors">{b.label}</Link> : <span>{b.label}</span>}
              </span>
            ))}
          </nav>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full block">
          <path d="M0 40C360 80 720 0 1080 40C1260 60 1380 50 1440 40V80H0V40Z" fill="hsl(249, 100%, 98%)" />
        </svg>
      </div>
    </section>
  );
}
