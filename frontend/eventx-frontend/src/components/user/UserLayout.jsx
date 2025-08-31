import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Toaster } from '../ui/sonner';
import {
  Calendar,
  Ticket,
  User as UserIcon,
  LogOut,
  Search,
  Home,
  Heart,
  Bell,
  ChevronDown
} from 'lucide-react';

const UserLayout = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'events', label: 'Browse Events', icon: Search },
    { id: 'my-tickets', label: 'My Tickets', icon: Ticket },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col sticky top-0 self-start h-screen border-r border-gray-800">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EventX</h1>
              <p className="text-xs text-gray-400">User</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 px-4 pt-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400">Navigation</h3>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => {
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

          {/* Account */}
          <div className="mt-auto mb-4 border-t border-gray-700 pt-4">
            <nav className="space-y-1">
              <button
                onClick={logout}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                {menuItems.find(m => m.id === activeTab)?.label || 'EventX Studio'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  placeholder="Search events..."
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
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-gray-500">Member</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6">
            {children}
          </div>
          <Toaster />
        </main>
      </div>
    </div>
  );
};

export default UserLayout;

