import { useEffect, useState } from "react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/superbase/client";

type NewsPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
};

const categoryColors: Record<string, string> = {
  homegrown: "bg-wapm-green",
  "the-land": "bg-accent",
  "community-pantry": "bg-wapm-pink",
  community: "bg-primary",
};

export default function LatestNews() {
  const [posts, setPosts] = useState<NewsPost[]>([]);

  useEffect(() => {
    supabase
      .from("news_posts")
      .select("id, title, slug, excerpt, category, featured_image_url, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setPosts(data || []));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="section-padding bg-card">
      <div className="container mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="pill-badge-cyan mb-4 inline-flex">Latest News</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">What's Happening in Plas Madoc</h2>
          <p className="text-muted-foreground">Stories, updates and projects from your community</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {posts.map((post, i) => (
            <AnimatedSection key={post.id} delay={i * 0.1}>
              <Link to={`/news/${post.slug}`} className="card-wapm block group overflow-hidden h-full">
                <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                  {post.featured_image_url ? (
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-primary/5 group-hover:scale-105 transition-transform duration-300" />
                  )}
                  {post.category && (
                    <span className={`absolute bottom-3 left-3 pill-badge text-xs text-white ${categoryColors[post.category] || "bg-primary"}`}>
                      {post.category.replace(/-/g, " ")}
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(post.published_at || post.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
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
