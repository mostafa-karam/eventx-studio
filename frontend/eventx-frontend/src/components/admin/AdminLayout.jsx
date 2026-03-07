import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Ticket,
  User as UserIcon,
  Home,
  FileText,
  Bell,
  Search,
  ChevronDown,
  CalendarDays,
  Moon,
  Sun,
  Menu,
  X,
  Shield,
  Building2
} from 'lucide-react';
import { Toaster } from '../ui/sonner';
import { useTheme } from '../../contexts/ThemeContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navCls = (isActive) =>
    `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors w-full ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  const navigationItems = [
    { to: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/admin/events', icon: Calendar, label: 'Manage Events' },
    { to: '/admin/tickets', icon: Ticket, label: 'Booking & Tickets' },
    { to: '/admin/attendees', icon: Users, label: 'Attendee Insights' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics & Reports' },
  ];

  const supportItems = [
    { to: '/admin/support', icon: FileText, label: 'Contact Support' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const sidebar = (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">EventX</h1>
            <p className="text-xs text-gray-400">Studio · Admin</p>
          </div>
        </div>
      </div>

      {/* Quick Add Event */}
      <div className="p-4">
        <Button
          className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center space-x-2"
          onClick={() => { navigate('/admin/events/create'); setSidebarOpen(false); }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Quick Event</span>
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Main Navigation</h3>
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => navCls(isActive)}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Support & Management</h3>
          <nav className="space-y-1">
            {supportItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => navCls(isActive)}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Additional Features</h3>
          <nav className="space-y-1">
            <NavLink to="/admin/marketing" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => navCls(isActive)}>
              <FileText className="w-4 h-4" />
              <span>Marketing</span>
            </NavLink>
            <NavLink to="/admin/categories" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => navCls(isActive)}>
              <CalendarDays className="w-4 h-4" />
              <span>Event Categories</span>
            </NavLink>
            <NavLink to="/admin/users" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => navCls(isActive)}>
              <Users className="w-4 h-4" />
              <span>Manage Users</span>
            </NavLink>
            <NavLink to="/admin/halls" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => navCls(isActive)}>
              <Building2 className="w-4 h-4" />
              <span>Halls</span>
            </NavLink>
            <NavLink to="/admin/audit-log" onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => navCls(isActive)}>
              <Shield className="w-4 h-4" />
              <span>Audit Log</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Account */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 px-3 py-2 mb-2">
          <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-gray-300" />
          </div>
          <div className="text-sm">
            <p className="text-white font-medium truncate">{user?.name || 'Admin'}</p>
            <p className="text-gray-400 text-xs">Administrator</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 sticky top-0 self-start h-screen">
        {sidebar}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 z-50">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile hamburger */}
              <button
                className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Admin</h2>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input placeholder="Search..." className="pl-10 w-64 border rounded-md h-9 text-sm px-3" />
              </div>
              <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <NavLink to="/admin/notifications" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
              </NavLink>
              <div className="hidden sm:flex items-center space-x-2 border-l pl-4">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{user?.name || 'Admin User'}</p>
                  <p className="text-gray-500 text-xs">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </div>
  );
};

export default AdminLayout;
