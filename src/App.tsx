import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
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
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import EventDetail from "./pages/EventDetail";
import Register from "./pages/Register";
import VmsOverview from "./pages/admin/vms/VmsOverview";
import VmsChildren from "./pages/admin/vms/VmsChildren";
import VmsChildEditor from "./pages/admin/vms/VmsChildEditor";
import VmsChildProfile from "./pages/admin/vms/VmsChildProfile";
import VmsParents from "./pages/admin/vms/VmsParents";
import VmsParentEditor from "./pages/admin/vms/VmsParentEditor";
import VmsParentProfile from "./pages/admin/vms/VmsParentProfile";
import VmsVolunteerProfile from "./pages/admin/vms/VmsVolunteerProfile";
import VmsAttendance from "./pages/admin/vms/VmsAttendance";
import VmsYouth from "./pages/admin/vms/VmsYouth";
import VmsReports from "./pages/admin/vms/VmsReports";
import VmsIncidents from "./pages/admin/vms/VmsIncidents";
import VmsVisitors from "./pages/admin/vms/VmsVisitors";
import VmsVolunteers from "./pages/admin/vms/VmsVolunteers";
import VmsNotifications from "./pages/admin/vms/VmsNotifications";
import VmsPersonReport from "./pages/admin/vms/VmsPersonReport";
import VmsVisitorProfile from "./pages/admin/vms/VmsVisitorProfile";
import ChecksLog from "./pages/admin/checks/ChecksLog";
import ChecksHistory from "./pages/admin/checks/ChecksHistory";
import ChecklistItems from "./pages/admin/checks/ChecklistItems";
import Tasks from "./pages/admin/checks/Tasks";

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
      <Analytics />
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
            <Route path="/events/:id" element={<PublicLayout><EventDetail /></PublicLayout>} />
            <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
            <Route path="/get-involved" element={<PublicLayout><GetInvolved /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
            <Route path="/team" element={<PublicLayout><Team /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />

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
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/settings" element={<AdminSettings />} />

            {/* Visitor Management System */}
            <Route path="/admin/vms" element={<VmsOverview />} />
            <Route path="/admin/vms/children" element={<VmsChildren />} />
            <Route path="/admin/vms/children/new" element={<VmsChildEditor />} />
            <Route path="/admin/vms/children/:id/edit" element={<VmsChildEditor />} />
            <Route path="/admin/vms/children/:id" element={<VmsChildProfile />} />
            <Route path="/admin/vms/parents" element={<VmsParents />} />
            <Route path="/admin/vms/parents/new" element={<VmsParentEditor />} />
            <Route path="/admin/vms/parents/:id/edit" element={<VmsParentEditor />} />
            <Route path="/admin/vms/parents/:id" element={<VmsParentProfile />} />
            <Route path="/admin/vms/attendance" element={<VmsAttendance />} />
            <Route path="/admin/vms/youth" element={<VmsYouth />} />
            <Route path="/admin/vms/reports" element={<VmsReports />} />
            <Route path="/admin/vms/incidents" element={<VmsIncidents />} />
            <Route path="/admin/vms/visitors" element={<VmsVisitors />} />
            <Route path="/admin/vms/visitors/:id" element={<VmsVisitorProfile />} />
            <Route path="/admin/vms/volunteers" element={<VmsVolunteers />} />
            <Route path="/admin/vms/volunteers/:id" element={<VmsVolunteerProfile />} />
            <Route path="/admin/vms/notifications" element={<VmsNotifications />} />
            <Route path="/admin/vms/report/:personType/:id" element={<VmsPersonReport />} />

            <Route path="/admin/checks" element={<ChecksLog />} />
            <Route path="/admin/checks/history" element={<ChecksHistory />} />
            <Route path="/admin/checks/tasks" element={<Tasks />} />
            <Route path="/admin/checks/items" element={<ChecklistItems />} />
            <Route path="/admin/checks/log/:id" element={<ChecksLog />} />

            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
