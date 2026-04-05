import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Calendar, Ticket, User as UserIcon, LogOut, Search, Heart,
  Bell, Menu, Moon, Sun
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const UserLayout = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navCls = (isActive) =>
    `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors w-full ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  const navItems = [
    { to: '/user/events', icon: Search, label: 'Browse Events' },
    { to: '/user/tickets', icon: Ticket, label: 'My Tickets' },
    { to: '/user/favorites', icon: Heart, label: 'Favorites' },
    { to: '/user/notifications', icon: Bell, label: 'Notifications' },
    { to: '/user/profile', icon: UserIcon, label: 'Profile' },
  ];

  const sidebar = (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">EventX</h1>
            <p className="text-xs text-gray-400">Member</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 overflow-y-auto">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Navigation</h3>
        <nav className="space-y-1">
          {navItems.map(({ to, icon: label }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => navCls(isActive)}>
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 px-3 py-2 mb-2">
          <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-gray-300" />
          </div>
          <div className="text-sm">
            <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-gray-400 text-xs">Member</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:flex md:w-64 sticky top-0 self-start h-screen">{sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 z-50">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input placeholder="Search events..." className="pl-10 w-52 lg:w-72 border rounded-md h-9 text-sm px-3"
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/user/events')} />
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <NavLink to="/user/notifications" className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
              </NavLink>
              <div className="hidden sm:flex items-center space-x-2 border-l pl-4">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-gray-500 text-xs">Member</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
};

export default UserLayout;
