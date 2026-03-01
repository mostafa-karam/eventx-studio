import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    CalendarDays,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Building2,
    Inbox
} from 'lucide-react';
import { CardSkeleton } from '../shared/LoadingSkeletons';
import EmptyState from '../shared/EmptyState';
import Breadcrumbs from '../shared/Breadcrumbs';

const BookingApproval = () => {
    const { token } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchBookings();
    }, [filter]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const url = filter === 'all'
                ? `${API_BASE_URL}/hall-bookings`
                : `${API_BASE_URL}/hall-bookings?status=${filter}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBookings(data.data.bookings);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (bookingId, action) => {
        const isApprove = action === 'approve';
        const confirmMsg = isApprove
            ? 'Are you sure you want to approve this booking?'
            : 'Are you sure you want to REJECT this booking?';

        if (!window.confirm(confirmMsg)) return;

        try {
            const payload = isApprove ? {} : { reason: 'Venue administrator rejected the request.' };

            const res = await fetch(`${API_BASE_URL}/hall-bookings/${bookingId}/${action}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                fetchBookings(); // Refresh the list
            } else {
                alert(data.message || `Failed to ${action} booking.`);
            }
        } catch (error) {
            alert(`An error occurred while trying to ${action} the booking.`);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Breadcrumbs items={[{ label: 'Booking Requests' }]} />
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Booking Validations</h2>
                    <p className="text-sm text-gray-500">Review and approve hall booking requests from organizers</p>
                </div>

                {/* Filter Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['pending', 'approved', 'rejected', 'all'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === status
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
                </div>
            ) : bookings.length === 0 ? (
                <EmptyState
                    icon={Inbox}
                    title="No bookings found"
                    description={`There are no ${filter !== 'all' ? filter : ''} booking requests to display at this time.`}
                    actionText={filter !== 'all' ? "View All Requests" : null}
                    onAction={() => setFilter('all')}
                />
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking) => (
                        <div key={booking._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                                {/* Info Section */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between md:justify-start gap-4">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                            <Building2 className="w-5 h-5 mr-2 text-teal-600" />
                                            {booking.hall?.name || 'Deleted Hall'}
                                        </h3>
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${booking.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                            booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {booking.status.toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                                <span className="font-medium mr-1.5">Start:</span>
                                                {new Date(booking.startDate).toLocaleString()}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                                <span className="font-medium mr-1.5">End:</span>
                                                {new Date(booking.endDate).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                                <span className="font-medium mr-1.5">Organizer:</span>
                                                {booking.organizer?.name || 'Unknown'}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <span className="w-4 h-4 mr-2 text-gray-400 font-bold">$</span>
                                                <span className="font-medium mr-1.5">Total Cost:</span>
                                                ${booking.totalCost}
                                            </div>
                                        </div>
                                    </div>

                                    {booking.notes && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                                            <span className="font-medium block mb-1">Organizer Notes:</span>
                                            {booking.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Actions Section */}
                                {booking.status === 'pending' && (
                                    <div className="flex md:flex-col gap-3 pt-4 border-t md:pt-0 md:border-t-0 md:border-l md:pl-6 border-gray-100">
                                        <button
                                            onClick={() => handleAction(booking._id, 'approve')}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(booking._id, 'reject')}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {booking.status !== 'pending' && booking.reviewedBy && (
                                    <div className="text-sm text-gray-500 pt-4 border-t md:pt-0 md:border-t-0 md:border-l md:pl-6 border-gray-100 md:w-32 text-center md:text-left">
                                        Reviewed by<br />
                                        <span className="font-medium text-gray-900">{booking.reviewedBy.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BookingApproval;
