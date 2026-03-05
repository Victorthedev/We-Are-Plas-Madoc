import HeroSection from "@/components/home/HeroSection";
import StatsBar from "@/components/home/StatsBar";
import ServicesOverview from "@/components/home/ServicesOverview";
import LatestNews from "@/components/home/LatestNews";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import AboutStrip from "@/components/home/AboutStrip";
import GetInvolvedBanner from "@/components/home/GetInvolvedBanner";

const Index = () => (
  <main id="main">
    <HeroSection />
    <StatsBar />
    <ServicesOverview />
    <LatestNews />
    <UpcomingEvents />
    <AboutStrip />
    <GetInvolvedBanner />
  </main>
);

export default Index;
