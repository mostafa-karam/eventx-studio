import React, { Suspense, lazy } from 'react';
import './App.css';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from 'sonner';
import useUpcomingNotifications from './hooks/useUpcomingNotifications';

// ─── Lazy-loaded pages ─────────────────────────────────────────────
// Public
const HomePage = lazy(() => import('./pages/HomePage'));
const VenueLandingPage = lazy(() => import('./pages/VenueLandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PublicEventsPage = lazy(() => import('./pages/PublicEventsPage'));
const PublicHallsPage = lazy(() => import('./pages/PublicHallsPage'));
const HallComparisonPage = lazy(() => import('./pages/HallComparisonPage'));
const OrganizerProfilePage = lazy(() => import('./pages/OrganizerProfilePage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const EventCalendarPage = lazy(() => import('./pages/EventCalendarPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const EventReviewsPage = lazy(() => import('./pages/EventReviewsPage'));

// Admin
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const EventsManagement = lazy(() => import('./components/admin/EventsManagement'));
const EventForm = lazy(() => import('./components/admin/EventForm'));
const AdvancedAnalytics = lazy(() => import('./components/admin/AdvancedAnalytics'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));
const AdminSettings = lazy(() => import('./components/admin/AdminSettings'));
const TicketManagement = lazy(() => import('./components/admin/TicketManagement'));
const AttendeeInsights = lazy(() => import('./components/admin/AttendeeInsights'));
const AdminEventDetails = lazy(() => import('./components/admin/EventDetails'));
const Notifications = lazy(() => import('./components/admin/Notifications'));
const Marketing = lazy(() => import('./components/admin/Marketing'));
const EventCategories = lazy(() => import('./components/admin/EventCategories'));
const ContactSupport = lazy(() => import('./components/admin/ContactSupport'));
const AuditLogViewer = lazy(() => import('./components/admin/AuditLogViewer'));
const HallsManagement = lazy(() => import('./components/admin/HallsManagement'));
const CheckInDashboard = lazy(() => import('./components/admin/CheckInDashboard'));
const AdminCoupons = lazy(() => import('./components/admin/AdminCoupons'));

// Organizer
const OrganizerLayout = lazy(() => import('./components/organizer/OrganizerLayout'));
const OrganizerDashboard = lazy(() => import('./components/organizer/OrganizerDashboard'));
const OrganizerAnalytics = lazy(() => import('./components/organizer/OrganizerAnalytics'));
const OrganizerTickets = lazy(() => import('./components/organizer/OrganizerTickets'));
const OrganizerBookings = lazy(() => import('./components/organizer/OrganizerBookings'));
const HallBookingForm = lazy(() => import('./components/organizer/HallBookingForm'));
const HallRentalPage = lazy(() => import('./pages/HallRentalPage'));
const OrganizerInvoiceHistory = lazy(() => import('./components/organizer/OrganizerInvoiceHistory'));

// Venue Admin
const VenueAdminLayout = lazy(() => import('./components/venue/VenueAdminLayout'));
const VenueAdminDashboard = lazy(() => import('./components/venue/VenueAdminDashboard'));
const HallManagement = lazy(() => import('./components/venue/HallManagement'));
const BookingApproval = lazy(() => import('./components/venue/BookingApproval'));
const MaintenanceScheduler = lazy(() => import('./components/venue/MaintenanceScheduler'));

// Shared
const HallBrowser = lazy(() => import('./components/shared/HallBrowser'));
const HallDetail = lazy(() => import('./components/shared/HallDetail'));

// User
const UserLayout = lazy(() => import('./components/user/UserLayout'));
const EventsBrowser = lazy(() => import('./components/user/EventsBrowser'));
const UserEventDetails = lazy(() => import('./components/user/EventDetails'));
const MyTickets = lazy(() => import('./components/user/MyTickets'));
const UserProfile = lazy(() => import('./components/user/UserProfile'));
const Favorites = lazy(() => import('./components/user/Favorites'));
const UserNotifications = lazy(() => import('./components/user/UserNotifications'));
const TicketDetailPage = lazy(() => import('./components/user/TicketDetailPage'));
const PaymentHistoryPage = lazy(() => import('./components/user/PaymentHistoryPage'));

// Route loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-muted-foreground">Loading…</p>
    </div>
  </div>
);




// ─── Role guards ───────────────────────────────────────────────────
const RequireAuth = ({ role }) => {
  const { isAuthenticated, isAdmin, isOrganizer, isVenueAdmin, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading EventX Studio…</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (role === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (role === 'organizer' && !isOrganizer) return <Navigate to="/" replace />;
  if (role === 'venue_admin' && !isVenueAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
};

// ─── Main App ─────────────────────────────────────────────────────

const NotificationsWithNav = () => {
  const navigate = useNavigate();
  return <Notifications onOpenAction={(url) => navigate(url)} />;
};

const AppContent = () => {
  useUpcomingNotifications();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/events" element={<PublicEventsPage />} />
        <Route path="/halls" element={<PublicHallsPage />} />
        <Route path="/halls/compare" element={<HallComparisonPage />} />
        <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
        <Route path="/calendar" element={<EventCalendarPage />} />
        <Route path="/venue" element={<VenueLandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/events/:eventId/reviews" element={<EventReviewsPage />} />

        {/* ── Admin routes ── */}
        <Route element={<RequireAuth role="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="events" element={<EventsManagement />} />
            <Route path="events/create" element={<EventForm />} />
            <Route path="events/edit/:eventId" element={<EventForm />} />
            <Route path="events/:eventId" element={<AdminEventDetails />} />
            <Route path="tickets" element={<TicketManagement />} />
            <Route path="attendees" element={<AttendeeInsights />} />
            <Route path="analytics" element={<AdvancedAnalytics />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="notifications" element={<NotificationsWithNav />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="categories" element={<EventCategories />} />
            <Route path="support" element={<ContactSupport />} />
            <Route path="halls" element={<HallsManagement />} />
            <Route path="audit-log" element={<AuditLogViewer />} />
            <Route path="checkin" element={<CheckInDashboard />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* ── Venue Admin routes ── */}
        <Route element={<RequireAuth role="venue_admin" />}>
          <Route path="/venue" element={<VenueAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<VenueAdminDashboard />} />
            <Route path="halls" element={<HallManagement />} />
            <Route path="halls/:hallId" element={<HallDetail />} />
            <Route path="bookings" element={<BookingApproval />} />
            <Route path="maintenance" element={<MaintenanceScheduler />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>
        </Route>

        {/* ── Organizer routes ── */}
        <Route element={<RequireAuth role="organizer" />}>
          <Route path="/organizer" element={<OrganizerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OrganizerDashboard />} />
            <Route path="events" element={<EventsManagement />} />
            <Route path="events/create" element={<EventForm />} />
            <Route path="events/edit/:eventId" element={<EventForm />} />
            <Route path="halls" element={<HallBrowser />} />
            <Route path="halls/:hallId" element={<HallDetail />} />
            <Route path="halls/:hallId/book" element={<HallRentalPage />} />
            <Route path="analytics" element={<OrganizerAnalytics />} />
            <Route path="tickets" element={<OrganizerTickets />} />
            <Route path="bookings" element={<OrganizerBookings />} />
            <Route path="invoices" element={<OrganizerInvoiceHistory />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>
        </Route>

        {/* ── User routes ── */}
        <Route element={<RequireAuth />}>
          <Route path="/user" element={<UserLayout />}>
            <Route index element={<Navigate to="events" replace />} />
            <Route path="events" element={<EventsBrowser />} />
            <Route path="events/:eventId" element={<UserEventDetails />} />
            <Route path="tickets" element={<MyTickets />} />
            <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="payments" element={<PaymentHistoryPage />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="halls" element={<HallBrowser />} />
            <Route path="halls/:hallId" element={<HallDetail />} />
            <Route path="notifications" element={<UserNotifications />} />
            <Route path="booking/:eventId" element={<BookingPage />} />
          </Route>
        </Route>

        {/* ── Smart redirect after login ── */}
        <Route path="/dashboard" element={<RoleDashboardRedirect />} />

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

// Redirect to the correct role-based dashboard after login
const RoleDashboardRedirect = () => {
  const { isAdmin, isOrganizer, isVenueAdmin, isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading EventX Studio…</p>
      </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (isOrganizer) return <Navigate to="/organizer/dashboard" replace />;
  if (isVenueAdmin) return <Navigate to="/venue/dashboard" replace />;
  return <Navigate to="/user/events" replace />;
};

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
        <Toaster richColors position="top-right" closeButton />
        <Analytics />
        <SpeedInsights />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
