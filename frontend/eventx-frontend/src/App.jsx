import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import EventsManagement from './components/admin/EventsManagement';
import EventForm from './components/admin/EventForm';
import AdvancedAnalytics from './components/admin/AdvancedAnalytics';
import ReportsCenter from './components/admin/ReportsCenter';
import UserLayout from './components/user/UserLayout';
import EventsBrowser from './components/user/EventsBrowser';
import EventDetails from './components/user/EventDetails';
import MyTickets from './components/user/MyTickets';
import './App.css';

// Main App Content Component
const AppContent = () => {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'events');
  const [selectedEvent, setSelectedEvent] = useState(null);

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
    return <AuthPage />;
  }

  // Admin Dashboard
  if (isAdmin) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    
    const renderAdminContent = () => {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard />;
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
              onSave={(event) => {
                console.log('Event created:', event);
                setActiveTab('events');
              }}
              onCancel={() => setActiveTab('events')}
            />
          );
        case 'edit-event':
          return (
            <EventForm 
              event={selectedEvent}
              onSave={(event) => {
                console.log('Event updated:', event);
                setActiveTab('events');
              }}
              onCancel={() => setActiveTab('events')}
            />
          );
        case 'analytics':
          return <AdvancedAnalytics />;
        case 'reports':
          return <ReportsCenter />;
        case 'users':
          return (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
              <p className="text-gray-600">User management functionality coming in Phase 5!</p>
            </div>
          );
        case 'settings':
          return (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
              <p className="text-gray-600">Settings functionality coming in Phase 5!</p>
            </div>
          );
        default:
          return <AdminDashboard />;
      }
    };

    return (
      <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderAdminContent()}
      </AdminLayout>
    );
  }

  // User Dashboard
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setActiveTab('event-details');
  };

  const handleBookTicket = async (bookingData) => {
    // This would normally make an API call to book the ticket
    console.log('Booking ticket:', bookingData);
    alert('Ticket booking functionality will be connected to backend in Phase 4!');
    setActiveTab('my-tickets');
  };

  const renderUserContent = () => {
    switch (activeTab) {
      case 'events':
        return <EventsBrowser onEventSelect={handleEventSelect} />;
      case 'event-details':
        return (
          <EventDetails 
            event={selectedEvent}
            onBack={() => setActiveTab('events')}
            onBookTicket={handleBookTicket}
          />
        );
      case 'my-tickets':
        return <MyTickets />;
      case 'favorites':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Favorites</h2>
            <p className="text-gray-600">Your favorite events will appear here!</p>
          </div>
        );
      case 'profile':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile</h2>
            <p className="text-gray-600">Profile management coming soon!</p>
          </div>
        );
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;

