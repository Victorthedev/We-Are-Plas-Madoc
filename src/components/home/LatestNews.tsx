import AnimatedSection from "@/components/ui/AnimatedSection";
import { Link } from "react-router-dom";

const placeholderNews = [
  { id: "1", title: "New Food Van Routes Announced for Spring 2025", excerpt: "We're expanding our mobile food van service to reach more residents across the estate.", category: "food-van", date: "26 February 2025" },
  { id: "2", title: "Sustainable Garden Project Wins Community Award", excerpt: "Our community garden initiative has been recognised for its positive environmental impact.", category: "sustainable", date: "20 February 2025" },
  { id: "3", title: "Residents Come Together for Winter Warm Space", excerpt: "The Kettle Club opens its doors wider during winter months to combat isolation.", category: "community", date: "15 February 2025" },
];

const categoryColors: Record<string, string> = {
  "food-van": "bg-accent",
  sustainable: "bg-wapm-green",
  resident: "bg-wapm-pink",
  community: "bg-primary",
};

export default function LatestNews() {
  return (
    <section className="section-padding bg-card">
      <div className="container mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="pill-badge-cyan mb-4 inline-flex">Latest News</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">What's Happening in Plas Madoc</h2>
          <p className="text-muted-foreground">Stories, updates and projects from your community</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {placeholderNews.map((post, i) => (
            <AnimatedSection key={post.id} delay={i * 0.1}>
              <Link to={`/news/${post.id}`} className="card-wapm block group overflow-hidden h-full">
                <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 group-hover:scale-105 transition-transform duration-300" />
                  <span className={`absolute bottom-3 left-3 pill-badge text-xs text-primary-foreground ${categoryColors[post.category] || "bg-primary"}`}>
                    {post.category.replace("-", " ")}
                  </span>
                </div>
                <div className="p-6">
                  <p className="text-xs text-muted-foreground mb-2">{post.date}</p>
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  <span className="text-primary font-semibold text-sm mt-3 inline-block">Read more →</span>
                </div>
              </Link>
            </AnimatedSection>
          ))}
        </div>
        <div className="text-center">
          <Link to="/news" className="btn-outline-primary">View All News →</Link>
        </div>
      </div>
    </section>
  );
}
