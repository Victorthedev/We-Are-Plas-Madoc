import { Link } from "react-router-dom";
import WAPMLogo from "./WAPMLogo";
import DotPattern from "@/components/ui/DotPattern";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "News", to: "/news" },
  { label: "Events", to: "/events" },
  { label: "Gallery", to: "/gallery" },
  { label: "Contact", to: "/contact" },
];

const serviceLinks = [
  { label: "Community Car Scheme", to: "/services/community-car" },
  { label: "The Land Playground", to: "/services/the-land" },
  { label: "Kettle & Breakfast Club", to: "/services/kettle-club" },
  { label: "Little Sunflowers", to: "/services/little-sunflowers" },
  { label: "Mobile Food Van", to: "/services/food-van" },
];

export default function Footer() {
  return (
    <footer className="relative bg-wapm-deep text-primary-foreground">
      <DotPattern opacity={0.05} />
      <div className="relative z-10 container mx-auto section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <WAPMLogo size={36} white />
              <span className="font-bold text-lg">wapm</span>
            </div>
            <p className="text-sm opacity-80 mb-4 leading-relaxed">Building a stronger community together in Plas Madoc, Wrexham</p>
            <p className="text-xs opacity-60 mb-4">Charity Number: 1197278</p>
            <div className="flex gap-3">
              <a href="https://facebook.com/WeArePlasMadoc" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity text-sm">Facebook</a>
              <a href="https://twitter.com/WePlas" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity text-sm">Twitter/X</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-base mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((l) => (
                <li key={l.to}><Link to={l.to} className="text-sm opacity-80 hover:opacity-100 transition-opacity">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-base mb-4">Our Services</h4>
            <ul className="space-y-2">
              {serviceLinks.map((l) => (
                <li key={l.to}><Link to={l.to} className="text-sm opacity-80 hover:opacity-100 transition-opacity">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-base mb-4">Contact</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li>📞 <a href="tel:01978813912" className="hover:opacity-100">01978 813912</a></li>
              <li>📱 <a href="tel:07423503836" className="hover:opacity-100">07423503836 (Transport)</a></li>
              <li>✉️ <a href="mailto:weareplasmadoc@avow.org" className="hover:opacity-100">weareplasmadoc@avow.org</a></li>
              <li>📍 The Opportunities Centre, Plas Madoc, LL14 3US</li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 text-center text-xs opacity-60" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <p>© 2025 We Are Plas Madoc CIO. All rights reserved. Registered Charity Number: 1197278</p>
        </div>
      </div>
    </footer>
  );
}
