import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    Building2,
    ClipboardCheck,
    Clock,
    TrendingUp,
    ArrowUpRight,
    CheckCircle,
    XCircle,
    AlertCircle,
    Inbox,
    Wrench,
    Calendar
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DashboardStatsSkeleton } from '../shared/LoadingSkeletons';
import EmptyState from '../shared/EmptyState';

const VenueAdminDashboard = ({ onTabChange }) => {
    const { token } = useAuth();
    const [stats, setStats] = useState({
        totalHalls: 0,
        activeBookings: 0,
        pendingRequests: 0,
        occupancyRate: 0,
    });
    const [pendingBookings, setPendingBookings] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Maintenance state
    const [hallsList, setHallsList] = useState([]);
    const [maintenanceForm, setMaintenanceForm] = useState({
        hall: '',
        startDate: '',
        endDate: '',
        notes: ''
    });
    const [maintenanceMsg, setMaintenanceMsg] = useState({ type: '', text: '' });
    const [submittingMaintenance, setSubmittingMaintenance] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch halls
            const hallsRes = await fetch(`${API_BASE_URL}/halls`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const hallsData = await hallsRes.json();

            // Fetch bookings
            const bookingsRes = await fetch(`${API_BASE_URL}/hall-bookings?status=pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const bookingsData = await bookingsRes.json();

            // Fetch all bookings for stats
            const allBookingsRes = await fetch(`${API_BASE_URL}/hall-bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const allBookingsData = await allBookingsRes.json();

            const totalHalls = hallsData.success ? hallsData.data.pagination.total : 0;
            const statusCounts = allBookingsData.success ? allBookingsData.data.statusCounts : {};

            if (hallsData.success) {
                setHallsList(hallsData.data.halls);
            }

            setStats({
                totalHalls,
                activeBookings: statusCounts.approved || 0,
                pendingRequests: statusCounts.pending || 0,
                occupancyRate: totalHalls > 0
                    ? Math.round(((statusCounts.approved || 0) / totalHalls) * 100)
                    : 0,
            });

            if (allBookingsData.success) {
                // Group revenue by month for chart
                const monthlyRev = {};
                allBookingsData.data.bookings.forEach(b => {
                    if (b.status === 'approved') {
                        const date = new Date(b.startDate);
                        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                        monthlyRev[month] = (monthlyRev[month] || 0) + (b.totalCost || 0);
                    }
                });
                const chartData = Object.keys(monthlyRev).map(k => ({ month: k, revenue: monthlyRev[k] }));
                // limit to last 6 entries
                setRevenueData(chartData.slice(-6));
            }

            if (bookingsData.success) {
                setPendingBookings(bookingsData.data.bookings.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleMaintenance = async (e) => {
        e.preventDefault();
        setSubmittingMaintenance(true);
        setMaintenanceMsg({ type: '', text: '' });

        try {
            const res = await fetch(`${API_BASE_URL}/hall-bookings/maintenance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(maintenanceForm)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setMaintenanceMsg({ type: 'success', text: 'Maintenance scheduled successfully!' });
                setMaintenanceForm({ hall: '', startDate: '', endDate: '', notes: '' });
                fetchDashboardData(); // Refresh stats/bookings

                // clear message after 5 seconds
                setTimeout(() => {
                    setMaintenanceMsg({ type: '', text: '' });
                }, 5000);
            } else {
                setMaintenanceMsg({ type: 'error', text: data.message || 'Failed to schedule maintenance' });
            }
        } catch (error) {
            setMaintenanceMsg({ type: 'error', text: 'Error scheduling maintenance' });
        } finally {
            setSubmittingMaintenance(false);
        }
    };

    const statCards = [
        {
            title: 'Total Halls',
            value: stats.totalHalls,
            icon: Building2,
            lightColor: 'bg-teal-50',
            textColor: 'text-teal-600'
        },
        {
            title: 'Active Bookings',
            value: stats.activeBookings,
            icon: CheckCircle,
            lightColor: 'bg-emerald-50',
            textColor: 'text-emerald-600'
        },
        {
            title: 'Pending Requests',
            value: stats.pendingRequests,
            icon: Clock,
            lightColor: 'bg-amber-50',
            textColor: 'text-amber-600'
        },
        {
            title: 'Occupancy Rate',
            value: `${stats.occupancyRate}%`,
            icon: TrendingUp,
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

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Summary</h3>
                <div className="h-72 w-full">
                    {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`$${value}`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-gray-500">
                            Not enough data to display revenue
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions & Maintenance Scheduling */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => onTabChange('halls')}
                        className="flex items-center space-x-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl p-4 transition-colors"
                    >
                        <div className="bg-teal-500 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-teal-900">Manage Halls</p>
                            <p className="text-sm text-teal-600">Add, edit, or maintain halls</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onTabChange('bookings')}
                        className="flex items-center space-x-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl p-4 transition-colors"
                    >
                        <div className="bg-amber-500 p-2 rounded-lg">
                            <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-amber-900">Review Bookings</p>
                            <p className="text-sm text-amber-600">{stats.pendingRequests} pending request(s)</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onTabChange('users')}
                        className="flex items-center space-x-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl p-4 transition-colors"
                    >
                        <div className="bg-indigo-500 p-2 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-indigo-900">Approve Upgrades</p>
                            <p className="text-sm text-indigo-600">Review organizer role upgrade requests</p>
                        </div>
                    </button>
                </div>

                {/* Schedule Maintenance Form */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-indigo-600" />
                        Schedule Maintenance
                    </h3>

                    {maintenanceMsg.text && (
                        <div className={`p-3 rounded-lg mb-4 text-sm ${maintenanceMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                            {maintenanceMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleScheduleMaintenance} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Hall</label>
                            <select
                                required
                                value={maintenanceForm.hall}
                                onChange={e => setMaintenanceForm({ ...maintenanceForm, hall: e.target.value })}
                                className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            >
                                <option value="" disabled>Choose a hall...</option>
                                {hallsList.map(h => (
                                    <option key={h._id} value={h._id}>{h.name} (Capacity: {h.capacity})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={maintenanceForm.startDate}
                                    onChange={e => setMaintenanceForm({ ...maintenanceForm, startDate: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={maintenanceForm.endDate}
                                    onChange={e => setMaintenanceForm({ ...maintenanceForm, endDate: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reason</label>
                            <input
                                type="text"
                                value={maintenanceForm.notes}
                                onChange={e => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                                placeholder="e.g. HVAC Repair, Cleaning..."
                                className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submittingMaintenance}
                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {submittingMaintenance ? 'Scheduling...' : 'Confirm Maintenance'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Pending Booking Requests */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Pending Booking Requests</h3>
                        <button
                            onClick={() => onTabChange('bookings')}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                            View All →
                        </button>
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {pendingBookings.length === 0 ? (
                        <div className="p-6">
                            <EmptyState
                                icon={Inbox}
                                title="No pending requests"
                                description="All booking requests have been reviewed."
                            />
                        </div>
                    ) : (
                        pendingBookings.map((booking) => (
                            <div key={booking._id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {booking.hall?.name || 'Unknown Hall'}
                                        </p>
                                        <div className="flex items-center space-x-3 mt-1">
                                            <span className="text-xs text-gray-500">
                                                By: {booking.organizer?.name || 'Unknown'}
                                            </span>
                                            <span className="flex items-center text-xs text-gray-500">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                                        Pending
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

export default VenueAdminDashboard;
