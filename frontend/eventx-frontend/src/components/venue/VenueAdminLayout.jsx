import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
    Calendar,
    Home,
    Search,
    ChevronDown,
    User as UserIcon,
    Building2,
    ClipboardCheck,
    LogOut,
    Eye,
    Moon,
    Sun
} from 'lucide-react';
import PageTransition from '../animations/PageTransition';
import { useTheme } from '../../contexts/ThemeContext';

const VenueAdminLayout = ({ children, activeTab, onTabChange }) => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();

    const navigationItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'halls', icon: Building2, label: 'Hall Management' },
        { id: 'bookings', icon: ClipboardCheck, label: 'Booking Requests' },
        { id: 'hall-browser', icon: Eye, label: 'Hall Browser' },
    ];

    const accountItems = [
        { id: 'profile', icon: UserIcon, label: 'Profile' },
    ];

    const pageTitle = (() => {
        switch (activeTab) {
            case 'dashboard': return 'Venue Dashboard';
            case 'halls': return 'Hall Management';
            case 'bookings': return 'Booking Requests';
            case 'hall-browser': return 'Browse Halls';
            case 'hall-detail': return 'Hall Details';
            case 'profile': return 'Profile';
            default: return 'EventX Studio';
        }
    })();

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-teal-900 to-teal-950 text-white flex flex-col sticky top-0 self-start h-screen">
                {/* Logo */}
                <div className="p-6 border-b border-teal-700/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">EventX</h1>
                            <p className="text-xs text-teal-300">Venue Admin</p>
                        </div>
                    </div>
                </div>

                {/* Main Navigation */}
                <div className="flex-1 px-4 pt-4">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-teal-300">Navigation</h3>
                            <ChevronDown className="w-4 h-4 text-teal-400" />
                        </div>
                        <nav className="space-y-1">
                            {navigationItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                                            ? 'bg-teal-700/60 text-white'
                                            : 'text-teal-200 hover:bg-teal-800/50 hover:text-white'
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
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-teal-300">Account</h3>
                            <ChevronDown className="w-4 h-4 text-teal-400" />
                        </div>
                        <nav className="space-y-1">
                            {accountItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                                            ? 'bg-teal-700/60 text-white'
                                            : 'text-teal-200 hover:bg-teal-800/50 hover:text-white'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Logout */}
                <div className="p-4 border-t border-teal-700/50">
                    <button
                        onClick={logout}
                        className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-teal-200 hover:bg-teal-800/50 hover:text-white transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold text-gray-900">{pageTitle}</h2>
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    placeholder="Search..."
                                    className="pl-10 w-64 border rounded-md h-9 text-sm px-3 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors dark:hover:bg-gray-800 dark:text-gray-400"
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="flex items-center space-x-2 border-l pl-4 dark:border-gray-700">
                                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-teal-600" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium">{user?.name || 'Venue Admin'}</p>
                                    <p className="text-gray-500">Venue Administrator</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto relative">
                    <PageTransition transitionKey={activeTab}>
                        {children}
                    </PageTransition>
                </main>
            </div>
        </div>
    );
};

export default VenueAdminLayout;
