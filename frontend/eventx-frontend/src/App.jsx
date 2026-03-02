import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { SpeedInsights } from '@vercel/speed-insights/react';
import useUpcomingNotifications from './hooks/useUpcomingNotifications';

// Public pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import PublicEventsPage from './pages/PublicEventsPage';
import PublicHallsPage from './pages/PublicHallsPage';

// Admin
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import EventsManagement from './components/admin/EventsManagement';
import EventForm from './components/admin/EventForm';
import AdvancedAnalytics from './components/admin/AdvancedAnalytics';
import UserManagement from './components/admin/UserManagement';
import AdminSettings from './components/admin/AdminSettings';
import TicketManagement from './components/admin/TicketManagement';
import AttendeeInsights from './components/admin/AttendeeInsights';
import AdminEventDetails from './components/admin/EventDetails';
import Notifications from './components/admin/Notifications';
import Marketing from './components/admin/Marketing';
import EventCategories from './components/admin/EventCategories';
import ContactSupport from './components/admin/ContactSupport';

// Organizer
import OrganizerLayout from './components/organizer/OrganizerLayout';
import OrganizerDashboard from './components/organizer/OrganizerDashboard';

// Venue Admin
import VenueAdminLayout from './components/venue/VenueAdminLayout';
import VenueAdminDashboard from './components/venue/VenueAdminDashboard';
import HallManagement from './components/venue/HallManagement';
import BookingApproval from './components/venue/BookingApproval';

// Shared
import HallBrowser from './components/shared/HallBrowser';
import HallDetail from './components/shared/HallDetail';

// User
import UserLayout from './components/user/UserLayout';
import EventsBrowser from './components/user/EventsBrowser';
import UserEventDetails from './components/user/EventDetails';
import MyTickets from './components/user/MyTickets';
import UserProfile from './components/user/UserProfile';
import Favorites from './components/user/Favorites';

import './App.css';

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
const AppContent = () => {
  useUpcomingNotifications();

  return (
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
          <Route path="notifications" element={<Notifications />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="categories" element={<EventCategories />} />
          <Route path="support" element={<ContactSupport />} />
          <Route path="halls" element={<HallBrowser />} />
          <Route path="halls/:hallId" element={<HallDetail />} />
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
          <Route path="favorites" element={<Favorites />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="halls" element={<HallBrowser />} />
          <Route path="halls/:hallId" element={<HallDetail />} />
        </Route>
      </Route>

      {/* ── Smart redirect after login ── */}
      <Route path="/dashboard" element={<RoleDashboardRedirect />} />

      {/* ── 404 ── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// Redirect to the correct role-based dashboard after login
const RoleDashboardRedirect = () => {
  const { isAdmin, isOrganizer, isVenueAdmin, isAuthenticated } = useAuth();
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
        <SpeedInsights />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
