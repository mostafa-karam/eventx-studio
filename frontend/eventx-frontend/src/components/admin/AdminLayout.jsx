import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Ticket,
  Home,
  FileText,
  Bell,
  Search,
  ChevronDown,
  User as UserIcon
} from 'lucide-react';

const AdminLayout = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();

  const navigationItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'events', icon: Calendar, label: 'Manage Events' },
    { id: 'tickets', icon: Ticket, label: 'Booking & Tickets' },
    { id: 'attendees', icon: Users, label: 'Attendee Insights' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics & Reports' }
  ];

  const supportItems = [
    { id: 'reports', icon: FileText, label: 'Contact Support' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const pageTitle = (() => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'events':
        return 'Event Management Section';
      case 'tickets':
        return 'Booking & Tickets';
      case 'analytics':
        return 'Analytics & Reports';
      case 'attendees':
        return 'Attendee Insights';
      case 'reports':
        return 'Contact Support';
      case 'notifications':
        return 'Notifications';
      case 'users':
        return 'Manage Users';
      case 'settings':
        return 'Settings';
      case 'create-event':
        return 'Create Event';
      case 'edit-event':
        return 'Edit Event';
      case 'event-details':
        return 'Event Details';
      default:
        return 'EventX Studio';
    }
  })();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col sticky top-0 self-start h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EventX</h1>
              <p className="text-xs text-gray-400">Studio</p>
            </div>
          </div>
        </div>

        {/* Quick Add Event */}
        <div className="p-4">
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center space-x-2" onClick={() => onTabChange('create-event')}>
            <Plus className="w-4 h-4" />
            <span>Add Quick Event</span>
          </Button>
          <p className="text-xs text-gray-400 mt-1">Events</p>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 px-4">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400">Main Navigation</h3>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Support & Management */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400">Support & Management</h3>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <nav className="space-y-1">
              {supportItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Additional Features */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400">Additional Features</h3>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => onTabChange('marketing')}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === 'marketing' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Marketing</span>
              </button>
              <button
                onClick={() => onTabChange('categories')}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === 'categories' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Event Categories</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Account Management */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Account Management</h3>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('users')}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'users' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Manage Users</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-semibold text-gray-900">{pageTitle}</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  placeholder="Search..."
                  className="pl-10 w-64 border rounded-md h-9 text-sm px-3"
                />
              </div>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{user?.name || 'Admin User'}</p>
                  <p className="text-gray-500">System Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

