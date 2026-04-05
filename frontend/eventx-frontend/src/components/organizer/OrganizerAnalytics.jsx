import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, TrendingUp, Ticket, Users, DollarSign, Eye, Calendar, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const OrganizerAnalytics = () => {
    useAuth();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        totalViews: 0,
        avgOccupancy: 0,
    });
    const [timeRange, setTimeRange] = useState('30d');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/events?organizer=me`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await response.json();
                if (data.success) {
                    const evts = data.data?.events || [];
                    setEvents(evts);

                    // Calculate stats
                    let totalTickets = 0, totalRevenue = 0, totalViews = 0, totalOccupancy = 0;
                    evts.forEach(e => {
                        totalTickets += (e.analytics?.bookings || 0);
                        totalRevenue += (e.analytics?.revenue || 0);
                        totalViews += (e.analytics?.views || 0);
                        const total = e.seating?.totalSeats || 1;
                        const booked = total - (e.seating?.availableSeats || 0);
                        totalOccupancy += (booked / total) * 100;
                    });

                    setStats({
                        totalEvents: evts.length,
                        totalTicketsSold: totalTickets,
                        totalRevenue: totalRevenue,
                        totalViews: totalViews,
                        avgOccupancy: evts.length > 0 ? Math.round(totalOccupancy / evts.length) : 0,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
                toast.error('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [timeRange]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Tickets Sold', value: stats.totalTicketsSold, icon: Ticket, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Avg Occupancy', value: `${stats.avgOccupancy}%`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                        Analytics
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track your event performance and revenue</p>
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {[
                        { label: '7D', value: '7d' },
                        { label: '30D', value: '30d' },
                        { label: '90D', value: '90d' },
                        { label: 'All', value: 'all' },
                    ].map(t => (
                        <button
                            key={t.value}
                            onClick={() => setTimeRange(t.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeRange === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {statCards.map(card => (
                    <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Event Performance Table */}
            <div className="bg-white rounded-xl border border-gray-100">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Event Performance</h2>
                    <p className="text-sm text-gray-500">Detailed breakdown of each event</p>
                </div>
                {events.length === 0 ? (
                    <div className="p-12 text-center">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">No events yet</h3>
                        <p className="text-sm text-gray-400 mt-1">Create your first event to start seeing analytics</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="text-left px-5 py-3 font-medium">Event</th>
                                    <th className="text-left px-5 py-3 font-medium">Status</th>
                                    <th className="text-right px-5 py-3 font-medium">Views</th>
                                    <th className="text-right px-5 py-3 font-medium">Tickets</th>
                                    <th className="text-right px-5 py-3 font-medium">Revenue</th>
                                    <th className="text-right px-5 py-3 font-medium">Occupancy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {events.map(event => {
                                    const total = event.seating?.totalSeats || 1;
                                    const booked = total - (event.seating?.availableSeats || 0);
                                    const occupancy = Math.round((booked / total) * 100);

                                    return (
                                        <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${event.status === 'published' ? 'bg-green-100 text-green-700' :
                                                        event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                                            event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right text-sm text-gray-600">
                                                {(event.analytics?.views || 0).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4 text-right text-sm text-gray-600">
                                                {booked}/{total}
                                            </td>
                                            <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                                                {formatCurrency(event.analytics?.revenue || 0)}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${occupancy > 80 ? 'bg-green-500' : occupancy > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${occupancy}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-600">{occupancy}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizerAnalytics;
