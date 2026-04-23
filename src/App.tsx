import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/layout/ScrollToTop";
import CookieBanner from "@/components/layout/CookieBanner";
import Index from "./pages/Index";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Events from "./pages/Events";
import Gallery from "./pages/Gallery";
import GetInvolved from "./pages/GetInvolved";
import Contact from "./pages/Contact";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";
import CancelRsvp from "./pages/CancelRsvp";

// Admin pages
import AdminLogin from "./pages/admin/Login";
import AdminForgotPassword from "./pages/admin/ForgotPassword";
import AdminResetPassword from "./pages/admin/ResetPassword";
import AdminOverview from "./pages/admin/Overview";
import AdminNews from "./pages/admin/AdminNews";
import AdminNewsEditor from "./pages/admin/AdminNewsEditor";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminEventEditor from "./pages/admin/AdminEventEditor";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminVolunteers from "./pages/admin/AdminVolunteers";
import AdminVolunteerPositions from "./pages/admin/AdminVolunteerPositions";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminServices from "./pages/admin/AdminServices";
import AdminServiceEditor from "./pages/admin/AdminServiceEditor";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

function ScrollToTopOnNav() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <ScrollToTop />
      <CookieBanner />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTopOnNav />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
            <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
            <Route path="/services/:slug" element={<PublicLayout><ServiceDetail /></PublicLayout>} />
            <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
            <Route path="/news/:slug" element={<PublicLayout><NewsDetail /></PublicLayout>} />
            <Route path="/events" element={<PublicLayout><Events /></PublicLayout>} />
            <Route path="/events/cancel-rsvp" element={<PublicLayout><CancelRsvp /></PublicLayout>} />
            <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
            <Route path="/get-involved" element={<PublicLayout><GetInvolved /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
            <Route path="/team" element={<PublicLayout><Team /></PublicLayout>} />

            {/* Admin auth routes (no shell) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />

            {/* Admin routes (with shell/auth guard) */}
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/news" element={<AdminNews />} />
            <Route path="/admin/news/new" element={<AdminNewsEditor />} />
            <Route path="/admin/news/:id/edit" element={<AdminNewsEditor />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/events/new" element={<AdminEventEditor />} />
            <Route path="/admin/events/:id/edit" element={<AdminEventEditor />} />
            <Route path="/admin/gallery" element={<AdminGallery />} />
            <Route path="/admin/volunteers" element={<AdminVolunteers />} />
            <Route path="/admin/volunteer-positions" element={<AdminVolunteerPositions />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/services/:id/edit" element={<AdminServiceEditor />} />
            <Route path="/admin/team" element={<AdminTeam />} />
            <Route path="/admin/staff" element={<AdminStaff />} />
            <Route path="/admin/settings" element={<AdminSettings />} />

            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
