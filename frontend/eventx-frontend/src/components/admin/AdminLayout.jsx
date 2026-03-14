import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Moon,
  Sun,
  Menu,
  X,
  Shield,
  Building2,
  QrCode,
  Tag,
  Megaphone,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { to: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/admin/events', icon: Calendar, label: 'Events' },
    { to: '/admin/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/admin/attendees', icon: Users, label: 'Attendees' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const managementItems = [
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
    { to: '/admin/categories', icon: CalendarDays, label: 'Categories' },
    { to: '/admin/halls', icon: Building2, label: 'Halls' },
    { to: '/admin/coupons', icon: Tag, label: 'Coupons' },
    { to: '/admin/checkin', icon: QrCode, label: 'Check-In' },
  ];

  const bottomItems = [
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/support', icon: FileText, label: 'Support' },
    { to: '/admin/audit-log', icon: Shield, label: 'Audit Log' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  // Derive current page title from path
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop();
    const titles = {
      dashboard: 'Dashboard',
      events: 'Events', create: 'Create Event',
      tickets: 'Tickets', attendees: 'Attendees',
      analytics: 'Analytics', users: 'Users',
      marketing: 'Marketing', categories: 'Categories',
      halls: 'Halls', coupons: 'Coupons',
      checkin: 'Check-In', notifications: 'Notifications',
      support: 'Support', 'audit-log': 'Audit Log',
      settings: 'Settings',
    };
    return titles[path] || 'Admin';
  };

  const NavItem = ({ item, isCollapsed }) => {
    const Icon = item.icon;
    return (
      <NavLink
        to={item.to}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
            isCollapsed ? 'justify-center' : ''
          } ${
            isActive
              ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full" />
            )}
            <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    );
  };

  const SidebarContent = ({ isCollapsed = false }) => (
    <div className={`flex flex-col h-full bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 ${isCollapsed ? 'w-[72px]' : 'w-[260px]'} transition-all duration-300`}>
      {/* Logo */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-5'} h-16 border-b border-white/5`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">EventX</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Studio</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <div className={`${isCollapsed ? 'px-2' : 'px-4'} pt-4 pb-2`}>
        <Button
          className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300 rounded-xl h-9 ${isCollapsed ? 'px-0' : ''}`}
          onClick={() => { navigate('/admin/events/create'); setSidebarOpen(false); }}
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Event</span>}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* Main */}
        <div>
          {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Main</p>}
          <nav className="space-y-0.5">
            {navigationItems.map((item) => <NavItem key={item.to} item={item} isCollapsed={isCollapsed} />)}
          </nav>
        </div>

        {/* Management */}
        <div>
          {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Management</p>}
          <nav className="space-y-0.5">
            {managementItems.map((item) => <NavItem key={item.to} item={item} isCollapsed={isCollapsed} />)}
          </nav>
        </div>

        {/* System */}
        <div>
          {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">System</p>}
          <nav className="space-y-0.5">
            {bottomItems.map((item) => <NavItem key={item.to} item={item} isCollapsed={isCollapsed} />)}
          </nav>
        </div>
      </div>

      {/* User Section */}
      <div className="border-t border-white/5 p-3">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} py-2 mb-1`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@eventx.studio'}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-3'} py-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse Toggle (desktop only, hidden on mobile sidebar) */}
      <div className="hidden md:block border-t border-white/5 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50/50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 h-screen sticky top-0">
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50 shadow-2xl animate-slide-in-left">
            <SidebarContent isCollapsed={false} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">{getPageTitle()}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden lg:block group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input
                  placeholder="Search..."
                  className="pl-10 w-56 focus:w-72 border border-gray-200 rounded-xl h-9 text-sm bg-gray-50/80 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all duration-300 outline-none"
                />
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                {isDarkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>

              {/* Notifications */}
              <NavLink
                to="/admin/notifications"
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              </NavLink>

              {/* Separator */}
              <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1" />

              {/* Profile */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700 leading-tight">{user?.name || 'Admin'}</p>
                    <p className="text-[11px] text-gray-400 leading-tight">Administrator</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user?.name || 'Admin'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{user?.email || 'admin@eventx.studio'}</p>
                      </div>
                      <NavLink to="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                        <Settings className="w-4 h-4" /> Settings
                      </NavLink>
                      <button onClick={() => { setProfileOpen(false); logout(); }} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
