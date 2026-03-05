import { useState } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Link } from "react-router-dom";

const categories = ["All", "Mobile Food Van", "Sustainable Projects", "Resident Projects", "Community"];
const categoryMap: Record<string, string> = { "Mobile Food Van": "food-van", "Sustainable Projects": "sustainable", "Resident Projects": "resident", Community: "community" };
const categoryColors: Record<string, string> = { "food-van": "bg-accent", sustainable: "bg-wapm-green", resident: "bg-wapm-pink", community: "bg-primary" };

const allNews = [
  { id: "1", title: "New Food Van Routes Announced for Spring 2025", excerpt: "We're expanding our mobile food van service to reach more residents across the estate with affordable meals.", category: "food-van", date: "26 February 2025" },
  { id: "2", title: "Sustainable Garden Project Wins Community Award", excerpt: "Our community garden initiative has been recognised for its positive environmental impact on the estate.", category: "sustainable", date: "20 February 2025" },
  { id: "3", title: "Residents Come Together for Winter Warm Space", excerpt: "The Kettle Club opens its doors wider during winter months to combat isolation and keep people warm.", category: "community", date: "15 February 2025" },
  { id: "4", title: "Volunteer Drivers Make 1000th Journey", excerpt: "Our amazing volunteer drivers have completed their 1000th community transport journey — a huge milestone!", category: "community", date: "10 February 2025" },
  { id: "5", title: "Recycling Initiative Launches on Estate", excerpt: "Working with local partners to improve recycling rates and reduce waste on the Plas Madoc estate.", category: "sustainable", date: "5 February 2025" },
  { id: "6", title: "Resident-Led Mural Project Brightens Estate", excerpt: "Local residents have come together to paint a stunning community mural celebrating Plas Madoc's heritage.", category: "resident", date: "1 February 2025" },
];

export default function News() {
  const [activeTab, setActiveTab] = useState("All");
  const [showCount, setShowCount] = useState(6);
  const filtered = activeTab === "All" ? allNews : allNews.filter(n => n.category === categoryMap[activeTab]);
  const visible = filtered.slice(0, showCount);

  return (
    <main id="main">
      <PageHero title="News & Updates" breadcrumbs={[{ label: "Home", to: "/" }, { label: "News" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="flex flex-wrap gap-2 mb-12 justify-center">
            {categories.map((cat) => (
              <button key={cat} onClick={() => { setActiveTab(cat); setShowCount(6); }}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 border-2 ${
                  activeTab === cat ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-primary border-primary/30 hover:border-primary"
                }`}>{cat}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {visible.map((post, i) => (
              <AnimatedSection key={post.id} delay={i * 0.05}>
                <Link to={`/news/${post.id}`} className="card-wapm block group overflow-hidden h-full">
                  <div className="relative h-44 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
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
          {visible.length < filtered.length && (
            <div className="text-center">
              <button onClick={() => setShowCount(s => s + 6)} className="btn-outline-primary">Load More</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
