import { useParams, Link } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";

const serviceData: Record<string, { icon: string; title: string; content: string[]; contact: string; hours?: string }> = {
  "community-car": {
    icon: "🚗", title: "Community Car Scheme",
    content: [
      "Our Community Car Scheme provides door-to-door transport for Plas Madoc residents. Whether you need to get to a hospital appointment, do your weekly shopping, attend a social event, or visit family, our friendly volunteer drivers are here to help.",
      "The service is available to all residents of the Plas Madoc estate who have difficulty accessing public transport. We use electric automatic vehicles, making the service sustainable and comfortable.",
      "To book a journey, simply call our transport line and we'll arrange a driver for you."
    ],
    contact: "📞 07423503836", hours: "Monday - Friday, 9am - 5pm",
  },
  "the-land": {
    icon: "🌿", title: "The Land Adventure Playground",
    content: [
      "The Land is a unique adventure playground where children can explore, create, and play freely in nature. Unlike traditional playgrounds, The Land encourages children to take risks, build with loose parts, and use their imagination.",
      "Run by trained playworkers, The Land provides a safe but challenging environment that supports children's development, confidence, and resilience.",
      "The Land is free to attend and open to all children in the Plas Madoc area."
    ],
    contact: "📞 01978 813912",
  },
  "kettle-club": {
    icon: "☕", title: "Kettle & Breakfast Club",
    content: [
      "The Kettle & Breakfast Club is a warm, welcoming space where residents can come together to enjoy a free breakfast, a hot cup of tea, and friendly conversation.",
      "Designed to combat loneliness and isolation, the Kettle Club brings neighbours together in a relaxed, informal setting.",
      "No booking required — just turn up and say hello!"
    ],
    contact: "📞 01978 813912", hours: "Weekly sessions — contact us for schedule",
  },
  "little-sunflowers": {
    icon: "🌻", title: "Little Sunflowers Childcare",
    content: [
      "Little Sunflowers provides quality, affordable childcare in the heart of the Plas Madoc community. Our experienced and caring team ensures your child is safe, happy, and learning every day.",
      "We offer a nurturing environment where children can develop through play, creativity, and social interaction.",
      "Get in touch to find out about availability and pricing."
    ],
    contact: "📞 01978 813912",
  },
  "food-van": {
    icon: "🍱", title: "Mobile Food Van",
    content: [
      "Our Mobile Food Van brings affordable, nutritious meals and food supplies directly to residents across the Plas Madoc estate.",
      "We believe everyone deserves access to good food, and our food van helps bridge the gap for families who may struggle with food costs or access.",
      "Check our news page or social media for the latest routes and times."
    ],
    contact: "📞 01978 813912",
  },
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const service = serviceData[slug || ""];

  if (!service) {
    return (
      <main id="main">
        <PageHero title="Service Not Found" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services", to: "/services" }, { label: "Not Found" }]} />
        <section className="section-padding text-center">
          <p className="text-muted-foreground">This service page doesn't exist.</p>
          <Link to="/services" className="btn-primary inline-block mt-6">Back to Services</Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main">
      <PageHero title={service.title} breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services", to: "/services" }, { label: service.title }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl">{service.icon}</div>
              <h2 className="text-3xl font-bold text-foreground">{service.title}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                {service.content.map((p, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed mb-4">{p}</p>
                ))}
              </div>
              <div>
                <div className="card-wapm p-6">
                  <h3 className="font-semibold text-foreground mb-4">Key Information</h3>
                  {service.hours && <p className="text-sm text-muted-foreground mb-2">🕐 {service.hours}</p>}
                  <p className="text-sm text-muted-foreground mb-4">{service.contact}</p>
                  <Link to="/contact" className="btn-primary text-sm w-full text-center block">Get In Touch</Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
