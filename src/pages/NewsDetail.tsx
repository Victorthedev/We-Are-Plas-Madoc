import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { supabase } from "@/integrations/superbase/client";

type NewsPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
};

export default function NewsDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("news_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single()
      .then(({ data }) => {
        setPost(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <main id="main">
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
      </main>
    );
  }

  if (!post) {
    return (
      <main id="main">
        <PageHero title="Post Not Found" breadcrumbs={[{ label: "Home", to: "/" }, { label: "News", to: "/news" }, { label: "Not Found" }]} />
        <section className="section-padding text-center">
          <p className="text-muted-foreground">This news post doesn't exist or has been removed.</p>
          <Link to="/news" className="btn-primary inline-block mt-6">Back to News</Link>
        </section>
      </main>
    );
  }

  const paragraphs = (post.content || post.excerpt || "").split("\n").filter(Boolean);

  return (
    <main id="main">
      <PageHero
        title={post.title}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "News", to: "/news" }, { label: post.title }]}
      />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection>
            {post.featured_image_url && (
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full rounded-2xl object-cover max-h-[420px] mb-8"
              />
            )}
            <div className="flex items-center gap-3 mb-8 text-sm text-muted-foreground">
              <span>
                {new Date(post.published_at || post.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
              {post.category && (
                <>
                  <span>·</span>
                  <span className="capitalize">{post.category.replace(/-/g, " ")}</span>
                </>
              )}
            </div>
            <div className="space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-foreground leading-relaxed">{p}</p>
              ))}
            </div>
            <div className="mt-12 pt-8 border-t border-border">
              <Link to="/news" className="btn-outline-primary">← Back to News</Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
