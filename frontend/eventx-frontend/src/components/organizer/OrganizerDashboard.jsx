import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    Calendar,
    DollarSign,
    Ticket,
    TrendingUp,
    ArrowUpRight,
    Clock,
    Users,
    Building2,
    Plus,
    Inbox
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DashboardStatsSkeleton } from '../shared/LoadingSkeletons';
import EmptyState from '../shared/EmptyState';

const OrganizerDashboard = ({ onTabChange }) => {
    useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const [stats, setStats] = useState({
        totalEvents: 0,
        totalRevenue: 0,
        ticketsSold: 0,
        upcomingEvents: 0,
    });
    const [recentEvents, setRecentEvents] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch organizer's events
            const eventsRes = await fetch(`${API_BASE_URL}/events/admin/my-events?limit=5`, {
                credentials: 'include',
            });
            const eventsData = await eventsRes.json();

            if (eventsData.success) {
                const events = eventsData.data.events;
                setRecentEvents(events);

                const now = new Date();
                setStats({
                    totalEvents: eventsData.data.pagination.total,
                    totalRevenue: events.reduce((sum, e) => sum + (e.analytics?.revenue || 0), 0),
                    ticketsSold: events.reduce((sum, e) => sum + (e.analytics?.bookings || 0), 0),
                    upcomingEvents: events.filter(e => new Date(e.date) > now).length,
                });
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Events',
            value: stats.totalEvents,
            icon: Calendar,
            color: 'bg-indigo-500',
            lightColor: 'bg-indigo-50',
            textColor: 'text-indigo-600'
        },
        {
            title: 'Revenue',
            value: `$${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'bg-emerald-500',
            lightColor: 'bg-emerald-50',
            textColor: 'text-emerald-600'
        },
        {
            title: 'Tickets Sold',
            value: stats.ticketsSold,
            icon: Ticket,
            color: 'bg-amber-500',
            lightColor: 'bg-amber-50',
            textColor: 'text-amber-600'
        },
        {
            title: 'Upcoming',
            value: stats.upcomingEvents,
            icon: TrendingUp,
            color: 'bg-blue-500',
            lightColor: 'bg-blue-50',
            textColor: 'text-blue-600'
        }
    ];

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <DashboardStatsSkeleton />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${card.lightColor} p-2.5 rounded-lg`}>
                                    <Icon className={`w-5 h-5 ${card.textColor}`} />
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">{card.title}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => onTabChange('create-event')}
                    className="flex items-center space-x-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl p-4 transition-colors"
                >
                    <div className="bg-indigo-500 p-2 rounded-lg">
                        <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-indigo-900">Create Event</p>
                        <p className="text-sm text-indigo-600">Set up a new event</p>
                    </div>
                </button>

                <button
                    onClick={() => onTabChange('hall-browser')}
                    className="flex items-center space-x-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl p-4 transition-colors"
                >
                    <div className="bg-purple-500 p-2 rounded-lg">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-purple-900">Browse Halls</p>
                        <p className="text-sm text-purple-600">Find a venue</p>
                    </div>
                </button>

                <button
                    onClick={() => onTabChange('events')}
                    className="flex items-center space-x-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl p-4 transition-colors"
                >
                    <div className="bg-emerald-500 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-emerald-900">My Events</p>
                        <p className="text-sm text-emerald-600">Manage your events</p>
                    </div>
                </button>
            </div>

            {/* Analytics Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Events Ticket Sales</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={recentEvents.slice().reverse().map(e => ({
                                name: e.title.substring(0, 15) + (e.title.length > 15 ? '...' : ''),
                                tickets: e.analytics?.bookings || 0
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="tickets" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTickets)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
                        <button
                            onClick={() => onTabChange('events')}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            View All →
                        </button>
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {recentEvents.length === 0 ? (
                        <div className="p-6">
                            <EmptyState
                                icon={Inbox}
                                title="No events yet"
                                description="You haven't created any events yet."
                                actionText="Create your first event"
                                onAction={() => onTabChange('create-event')}
                            />
                        </div>
                    ) : (
                        recentEvents.map((event) => (
                            <div key={event._id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-2 h-2 rounded-full ${event.status === 'published' ? 'bg-green-500' :
                                            event.status === 'draft' ? 'bg-yellow-500' :
                                                'bg-gray-400'
                                            }`} />
                                        <div>
                                            <p className="font-medium text-gray-900">{event.title}</p>
                                            <div className="flex items-center space-x-3 mt-1">
                                                <span className="flex items-center text-xs text-gray-500">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(event.date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center text-xs text-gray-500">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {event.analytics?.bookings || 0} booked
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${event.status === 'published' ? 'bg-green-100 text-green-700' :
                                        event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {event.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizerDashboard;
