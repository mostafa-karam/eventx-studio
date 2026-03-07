import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CalendarDays, Building2, Loader2, Clock, CheckCircle, XCircle, AlertCircle, Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const OrganizerBookings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/hall-bookings/my-bookings`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await response.json();
                if (data.success) {
                    setBookings(data.data?.bookings || []);
                }
            } catch (error) {
                console.error('Failed to fetch bookings:', error);
                toast.error('Failed to load bookings');
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const cancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/hall-bookings/${bookingId}/cancel`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Booking cancelled');
                setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b));
            } else {
                toast.error(data.message || 'Failed to cancel booking');
            }
        } catch (error) {
            toast.error('Failed to cancel booking');
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const filtered = bookings.filter(b => statusFilter === 'all' || b.status === statusFilter);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        My Hall Bookings
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your hall booking requests</p>
                </div>
                <button
                    onClick={() => navigate('/organizer/halls')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Book a Hall
                </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        {s !== 'all' && (
                            <span className="ml-1.5 text-xs opacity-75">
                                ({bookings.filter(b => b.status === s).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Bookings Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No bookings found</h3>
                    <p className="text-sm text-gray-400 mt-1">Browse halls to make your first booking</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(booking => {
                        const config = statusConfig[booking.status] || statusConfig.pending;
                        return (
                            <div key={booking._id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-50">
                                            <Building2 className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{booking.hall?.name || 'Unknown Hall'}</h3>
                                            <p className="text-xs text-gray-500">{booking.hall?.location?.floor ? `Floor ${booking.hall.location.floor}` : ''}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${config.color}`}>
                                        <config.icon className="h-3 w-3" />
                                        {config.label}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <CalendarDays className="h-4 w-4 text-gray-400" />
                                        <span>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
                                    </div>
                                    {booking.totalCost > 0 && (
                                        <p className="text-gray-600">
                                            <span className="font-medium">Cost:</span> {formatCurrency(booking.totalCost)}
                                        </p>
                                    )}
                                    {booking.notes && (
                                        <p className="text-gray-500 text-xs italic">"{booking.notes}"</p>
                                    )}
                                    {booking.rejectionReason && (
                                        <div className="mt-2 p-2 bg-red-50 rounded-lg">
                                            <p className="text-xs text-red-600"><strong>Reason:</strong> {booking.rejectionReason}</p>
                                        </div>
                                    )}
                                </div>

                                {booking.status === 'pending' && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => cancelBooking(booking._id)}
                                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Cancel Booking
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OrganizerBookings;
