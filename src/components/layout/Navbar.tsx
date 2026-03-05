import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import WAPMLogo from "./WAPMLogo";
import { Menu, X, ChevronDown } from "lucide-react";

const serviceLinks = [
  { label: "🚗 Community Car Scheme", to: "/services/community-car" },
  { label: "🌿 The Land Adventure Playground", to: "/services/the-land" },
  { label: "☕ Kettle & Breakfast Club", to: "/services/kettle-club" },
  { label: "🌻 Little Sunflowers Childcare", to: "/services/little-sunflowers" },
  { label: "🍱 Mobile Food Van", to: "/services/food-van" },
  { label: "📖 About WAPM", to: "/team" },
];

const newsLinks = [
  { label: "🚐 Mobile Food Van", to: "/news?cat=food-van" },
  { label: "♻️ Sustainable Projects", to: "/news?cat=sustainable" },
  { label: "👥 Resident Projects", to: "/news?cat=resident" },
];

const navLinks = [
  { label: "Home", to: "/", dropdown: undefined as typeof serviceLinks | undefined },
  { label: "Services", to: "/services", dropdown: serviceLinks },
  { label: "News", to: "/news", dropdown: newsLinks },
  { label: "Events", to: "/events", dropdown: undefined },
  { label: "Get Involved", to: "/get-involved", dropdown: undefined },
  { label: "Gallery", to: "/gallery", dropdown: undefined },
  { label: "Contact Us", to: "/contact", dropdown: undefined },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [location]);

  const textClass = scrolled ? "text-foreground" : "text-primary-foreground";
  const navBg = scrolled
    ? "bg-card/95 backdrop-blur-md"
    : "bg-transparent";
  const navShadow = scrolled ? "shadow-[var(--shadow-nav)]" : "";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to main content
      </a>
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${navBg} ${navShadow}`}>
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <WAPMLogo size={40} white={!scrolled} />
            <div className={`${textClass} transition-colors duration-300`}>
              <span className="font-bold text-lg leading-none block">wapm</span>
              <span className="text-xs leading-none opacity-70">we are plas madoc</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.dropdown && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  to={link.to}
                  className={`nav-link-animated px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center gap-1 ${
                    location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to))
                      ? "text-primary font-bold"
                      : textClass
                  }`}
                >
                  {link.label}
                  {link.dropdown && <ChevronDown className="w-3 h-3" />}
                </Link>
                {link.dropdown && openDropdown === link.label && (
                  <div className="absolute top-full left-0 pt-2 min-w-[280px]">
                    <div className="bg-card rounded-2xl p-2 border border-border" style={{ boxShadow: "var(--shadow-card-hover)" }}>
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="block px-4 py-3 rounded-xl text-sm text-foreground hover:bg-wapm-lavender transition-colors duration-150"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className={`lg:hidden p-2 ${textClass} transition-colors duration-300`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-[99] bg-wapm-deep flex flex-col items-center justify-center gap-6 lg:hidden">
          {navLinks.map((link, i) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-primary-foreground text-3xl font-semibold opacity-0"
              style={{ animation: `fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s forwards` }}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-4 mt-8 opacity-0" style={{ animation: "fade-in-up 0.4s 0.8s forwards" }}>
            <a href="https://facebook.com/WeArePlasMadoc" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/70 hover:text-primary-foreground transition-opacity text-sm">
              Facebook
            </a>
            <a href="https://twitter.com/WePlas" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/70 hover:text-primary-foreground transition-opacity text-sm">
              Twitter/X
            </a>
          </div>
        </div>
      )}
    </>
  );
}
