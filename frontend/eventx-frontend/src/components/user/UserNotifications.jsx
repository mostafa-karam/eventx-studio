import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, Calendar, Ticket, Users, BarChart3, Settings, AlertCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const typeIcons = {
    booking: <Ticket className="h-5 w-5 text-blue-500" />,
    event: <Calendar className="h-5 w-5 text-indigo-500" />,
    user: <Users className="h-5 w-5 text-emerald-500" />,
    analytics: <BarChart3 className="h-5 w-5 text-amber-500" />,
    system: <Settings className="h-5 w-5 text-gray-500" />,
};

const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-red-100 text-red-700',
};

const UserNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | unread | read
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/notifications`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.success) {
                setNotifications(data.data.notifications || []);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, read: true } : n)
            );
        } catch (error) {
            toast.error('Failed to mark notification as read');
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const deleteNotification = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            setNotifications(prev => prev.filter(n => n._id !== id));
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const filtered = notifications.filter(n => {
        if (filter === 'unread' && n.read) return false;
        if (filter === 'read' && !n.read) return false;
        if (typeFilter !== 'all' && n.type !== typeFilter) return false;
        if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="h-6 w-6 text-blue-600" />
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                {unreadCount} new
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Stay updated with your events and bookings</p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <CheckCheck className="h-4 w-4" />
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'unread', 'read'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Types</option>
                    <option value="booking">Booking</option>
                    <option value="event">Event</option>
                    <option value="user">User</option>
                    <option value="analytics">Analytics</option>
                    <option value="system">System</option>
                </select>
            </div>

            {/* Notification List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No notifications</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        {filter === 'unread' ? "You're all caught up!" : 'No notifications to display.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(notification => (
                        <div
                            key={notification._id}
                            className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${notification.read
                                    ? 'bg-white border-gray-100'
                                    : 'bg-blue-50/50 border-blue-100 shadow-sm'
                                }`}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {typeIcons[notification.type] || <Info className="h-5 w-5 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`text-sm font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                        {notification.title}
                                    </h4>
                                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${priorityColors[notification.priority] || priorityColors.medium}`}>
                                        {notification.priority}
                                    </span>
                                    {!notification.read && (
                                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{formatDate(notification.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                    <button
                                        onClick={() => markAsRead(notification._id)}
                                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                                        title="Mark as read"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteNotification(notification._id)}
                                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-600"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserNotifications;
