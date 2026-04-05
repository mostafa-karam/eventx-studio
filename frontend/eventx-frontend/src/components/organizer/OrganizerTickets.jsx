import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Ticket, Search, Filter, Eye, Loader2, Download, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const statusConfig = {
    booked: { label: 'Booked', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
    used: { label: 'Used', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

const OrganizerTickets = () => {
    useAuth();
    const [tickets, setTickets] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEvent, statusFilter, page]);

    const fetchEvents = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/events/admin/my-events`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.success) {
                setEvents(data.data?.events || []);
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
        }
    };

    const fetchTickets = async () => {
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/tickets/organizer?page=${page}&limit=20`;
            if (selectedEvent !== 'all') url += `&eventId=${selectedEvent}`;
            if (statusFilter !== 'all') url += `&status=${statusFilter}`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.success) {
                setTickets(data.data?.tickets || []);
                setTotalPages(data.data?.pagination?.pages || 1);
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (ticketId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/checkin`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Ticket checked in successfully');
                fetchTickets();
            } else {
                toast.error(data.message || 'Check-in failed');
            }
        } catch {
            toast.error('Failed to check in ticket');
        }
    };

    const filtered = tickets.filter(t => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                t.ticketId?.toLowerCase().includes(q) ||
                t.user?.name?.toLowerCase().includes(q) ||
                t.user?.email?.toLowerCase().includes(q) ||
                t.seatNumber?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    if (loading && tickets.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Ticket className="h-6 w-6 text-blue-600" />
                        Ticket Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage tickets for your events</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by ticket ID, name, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={selectedEvent}
                    onChange={(e) => { setSelectedEvent(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Events</option>
                    {events.map(e => (
                        <option key={e._id} value={e._id}>{e.title}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Statuses</option>
                    <option value="booked">Booked</option>
                    <option value="used">Used</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            {/* Tickets Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">No tickets found</h3>
                        <p className="text-sm text-gray-400 mt-1">Tickets will appear here when customers purchase them</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                                    <th className="text-left px-5 py-3 font-medium">Ticket ID</th>
                                    <th className="text-left px-5 py-3 font-medium">Attendee</th>
                                    <th className="text-left px-5 py-3 font-medium">Event</th>
                                    <th className="text-left px-5 py-3 font-medium">Seat</th>
                                    <th className="text-left px-5 py-3 font-medium">Status</th>
                                    <th className="text-left px-5 py-3 font-medium">Booked</th>
                                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(ticket => {
                                    const config = statusConfig[ticket.status] || statusConfig.booked;
                                    return (
                                        <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4 text-sm font-mono text-gray-700">{ticket.ticketId}</td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-gray-900">{ticket.user?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{ticket.user?.email || ''}</p>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-700">{ticket.event?.title || 'Unknown Event'}</td>
                                            <td className="px-5 py-4 text-sm text-gray-700">{ticket.seatNumber}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                                                    <config.icon className="h-3 w-3" />
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-500">
                                                {new Date(ticket.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {ticket.status === 'booked' && !ticket.checkIn?.isCheckedIn && (
                                                    <button
                                                        onClick={() => handleCheckIn(ticket._id)}
                                                        className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        Check In
                                                    </button>
                                                )}
                                                {ticket.checkIn?.isCheckedIn && (
                                                    <span className="text-xs text-green-600 font-medium">✓ Checked In</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizerTickets;
