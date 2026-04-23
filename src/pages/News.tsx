import { useEffect, useState } from "react";
import PageHero from "@/components/layout/PageHero";
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

export default function News() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [showCount, setShowCount] = useState(6);

  useEffect(() => {
    supabase
      .from("news_posts")
      .select("id, title, slug, excerpt, category, featured_image_url, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setPosts(data || []);
        setLoading(false);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(posts.map(p => p.category).filter(Boolean))) as string[]];
  const filtered = activeTab === "All" ? posts : posts.filter(p => p.category === activeTab);
  const visible = filtered.slice(0, showCount);

  return (
    <main id="main">
      <PageHero title="News & Updates" breadcrumbs={[{ label: "Home", to: "/" }, { label: "News" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No news posts yet — check back soon.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-12 justify-center">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveTab(cat); setShowCount(6); }}
                    className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition-all duration-200 border-2 ${
                      activeTab === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-primary border-primary/30 hover:border-primary"
                    }`}
                  >
                    {cat.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {visible.map((post, i) => (
                  <AnimatedSection key={post.id} delay={i * 0.05}>
                    <Link to={`/news/${post.slug}`} className="card-wapm block group overflow-hidden h-full">
                      <div className="relative h-44 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
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
                            day: "numeric", month: "short", year: "numeric",
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
              {visible.length < filtered.length && (
                <div className="text-center">
                  <button onClick={() => setShowCount(s => s + 6)} className="btn-outline-primary">Load More</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
