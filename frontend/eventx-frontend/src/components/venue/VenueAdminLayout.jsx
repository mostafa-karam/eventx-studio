import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NavLink, Outlet } from 'react-router-dom';
import {
    Building2, Home, ClipboardCheck, User as UserIcon, Wrench,
    Moon, Sun, LogOut, Menu
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const VenueAdminLayout = () => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navCls = (isActive) =>
        `w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-teal-700/60 text-white' : 'text-teal-200 hover:bg-teal-800/50 hover:text-white'
        }`;

    const navItems = [
        { to: '/venue/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/venue/halls', icon: Building2, label: 'Hall Management' },
        { to: '/venue/bookings', icon: ClipboardCheck, label: 'Booking Requests' },
        { to: '/venue/maintenance', icon: Wrench, label: 'Maintenance' },
        { to: '/venue/profile', icon: UserIcon, label: 'Profile' },
    ];

    const sidebar = (
        <div className="w-64 bg-gradient-to-b from-teal-900 to-teal-950 text-white flex flex-col h-full">
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

            <div className="flex-1 px-4 pt-4 overflow-y-auto">
                <h3 className="text-sm font-medium text-teal-300 mb-3">Navigation</h3>
                <nav className="space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => navCls(isActive)}>
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-teal-700/50">
                <div className="flex items-center space-x-3 px-3 py-2 mb-2">
                    <div className="w-7 h-7 bg-teal-700 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-teal-200" />
                    </div>
                    <div className="text-sm">
                        <p className="text-white font-medium truncate">{user?.name || 'Venue Admin'}</p>
                        <p className="text-teal-300 text-xs">Venue Administrator</p>
                    </div>
                </div>
                <button onClick={logout}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-teal-200 hover:bg-teal-800/50 hover:text-white transition-colors">
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
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Venue Admin</h2>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors">
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="hidden sm:flex items-center space-x-2 border-l pl-4">
                                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-teal-600" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium">{user?.name || 'Venue Admin'}</p>
                                    <p className="text-gray-500 text-xs">Venue Administrator</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>

            </div>
        </div>
    );
};

export default VenueAdminLayout;
