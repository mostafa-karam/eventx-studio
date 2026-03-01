import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
// Admin
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import EventsManagement from './components/admin/EventsManagement';
import EventForm from './components/admin/EventForm';
import AdvancedAnalytics from './components/admin/AdvancedAnalytics';
import ReportsCenter from './components/admin/ReportsCenter';
import UserManagement from './components/admin/UserManagement';
import AdminSettings from './components/admin/AdminSettings';
import TicketManagement from './components/admin/TicketManagement';
import AttendeeInsights from './components/admin/AttendeeInsights';
import EventDetails from './components/admin/EventDetails';
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
import ErrorBoundary from './components/ErrorBoundary';
import useUpcomingNotifications from './hooks/useUpcomingNotifications';

// Main App Content Component
const AppContent = () => {
  const { user, loading, isAuthenticated, isAdmin, isOrganizer, isVenueAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedHall, setSelectedHall] = useState(null);
  const navigate = useNavigate();

  // Always register notifications hook so Hooks order doesn't change between renders
  useUpcomingNotifications();

  // One-time cleanup: if no explicit opt-in, clear any previously remembered email
  useEffect(() => {
    const migrated = localStorage.getItem('eventx_remember_migrated') === '1';
    if (!migrated) {
      const optedIn = localStorage.getItem('eventx_remember_opt_in') === '1';
      if (!optedIn) {
        localStorage.removeItem('eventx_remember_email');
      }
      localStorage.setItem('eventx_remember_migrated', '1');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading EventX Studio...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<HomePage onGetStarted={() => navigate('/auth')} />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // ──── Admin Dashboard ─────────────────────────────────────────────
  if (isAdmin) {
    const handleAdminNotificationAction = (actionUrl) => {
      try {
        const match = String(actionUrl).match(/\/events\/(\w[\w-]*)/);
        if (match && match[1]) {
          setSelectedEventId(match[1]);
          setActiveTab('event-details');
          return;
        }
      } catch { }
      setActiveTab('notifications');
    };

    const renderAdminContent = () => {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard onTabChange={setActiveTab} />;
        case 'events':
          return (
            <EventsManagement
              onCreateEvent={() => setActiveTab('create-event')}
              onEditEvent={(event) => {
                setSelectedEvent(event);
                setActiveTab('edit-event');
              }}
            />
          );
        case 'create-event':
          return (
            <EventForm
              onSave={() => setActiveTab('events')}
              onCancel={() => setActiveTab('events')}
            />
          );
        case 'edit-event':
          return (
            <EventForm
              event={selectedEvent}
              onSave={() => setActiveTab('events')}
              onCancel={() => setActiveTab('events')}
            />
          );
        case 'analytics':
          return <AdvancedAnalytics />;
        case 'attendees':
          return <AttendeeInsights />;
        case 'event-details':
          return (
            <EventDetails
              eventId={selectedEventId}
              onBack={() => setActiveTab('events')}
            />
          );
        case 'reports':
          return <ContactSupport />;
        case 'notifications':
          return <Notifications onOpenAction={handleAdminNotificationAction} />;
        case 'marketing':
          return <Marketing />;
        case 'categories':
          return <EventCategories />;
        case 'tickets':
          return <TicketManagement />;
        case 'users':
          return <UserManagement />;
        case 'settings':
          return <AdminSettings />;
        case 'halls':
          return <HallBrowser onSelectHall={(hall) => { setSelectedHall(hall); setActiveTab('hall-detail'); }} />;
        case 'hall-detail':
          return <HallDetail hall={selectedHall} onBack={() => setActiveTab('halls')} />;
        default:
          return <AdminDashboard onTabChange={setActiveTab} />;
      }
    };

    return (
      <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderAdminContent()}
      </AdminLayout>
    );
  }

  // ──── Venue Admin Dashboard ───────────────────────────────────────
  if (isVenueAdmin) {
    const renderVenueAdminContent = () => {
      switch (activeTab) {
        case 'dashboard':
          return <VenueAdminDashboard onTabChange={setActiveTab} />;
        case 'halls':
          return <HallManagement onSelectHall={(hall) => { setSelectedHall(hall); setActiveTab('hall-detail'); }} />;
        case 'hall-detail':
          return <HallDetail hall={selectedHall} onBack={() => setActiveTab('halls')} />;
        case 'bookings':
          return <BookingApproval />;
        case 'hall-browser':
          return <HallBrowser onSelectHall={(hall) => { setSelectedHall(hall); setActiveTab('hall-detail'); }} />;
        case 'profile':
          return <UserProfile />;
        default:
          return <VenueAdminDashboard onTabChange={setActiveTab} />;
      }
    };

    return (
      <VenueAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderVenueAdminContent()}
      </VenueAdminLayout>
    );
  }

  // ──── Organizer Dashboard ─────────────────────────────────────────
  if (isOrganizer) {
    const renderOrganizerContent = () => {
      switch (activeTab) {
        case 'dashboard':
          return <OrganizerDashboard onTabChange={setActiveTab} />;
        case 'events':
          return (
            <EventsManagement
              onCreateEvent={() => setActiveTab('create-event')}
              onEditEvent={(event) => {
                setSelectedEvent(event);
                setActiveTab('edit-event');
              }}
            />
          );
        case 'create-event':
          return (
            <EventForm
              onSave={() => setActiveTab('events')}
              onCancel={() => setActiveTab('events')}
            />
          );
        case 'edit-event':
          return (
            <EventForm
              event={selectedEvent}
              onSave={() => setActiveTab('events')}
              onCancel={() => setActiveTab('events')}
            />
          );
        case 'hall-browser':
          return <HallBrowser onSelectHall={(hall) => { setSelectedHall(hall); setActiveTab('hall-detail'); }} />;
        case 'hall-detail':
          return <HallDetail hall={selectedHall} onBack={() => setActiveTab('hall-browser')} />;
        case 'profile':
          return <UserProfile />;
        default:
          return <OrganizerDashboard onTabChange={setActiveTab} />;
      }
    };

    return (
      <OrganizerLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderOrganizerContent()}
      </OrganizerLayout>
    );
  }

  // ──── User (Attendee) Dashboard ───────────────────────────────────
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setActiveTab('event-details');
  };

  const handleBookTicket = async () => {
    setActiveTab('my-tickets');
  };

  const renderUserContent = () => {
    switch (activeTab) {
      case 'events':
        return <EventsBrowser onEventSelect={handleEventSelect} />;
      case 'event-details':
        return (
          <UserEventDetails
            event={selectedEvent}
            onBack={() => setActiveTab('events')}
            onBookTicket={handleBookTicket}
          />
        );
      case 'my-tickets':
        return <MyTickets />;
      case 'favorites':
        return <Favorites onEventSelect={handleEventSelect} />;
      case 'profile':
        return <UserProfile />;
      case 'hall-browser':
        return <HallBrowser onSelectHall={(hall) => { setSelectedHall(hall); setActiveTab('hall-detail'); }} />;
      case 'hall-detail':
        return <HallDetail hall={selectedHall} onBack={() => setActiveTab('hall-browser')} />;
      default:
        return <EventsBrowser onEventSelect={handleEventSelect} />;
    }
  };

  return (
    <UserLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderUserContent()}
    </UserLayout>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
