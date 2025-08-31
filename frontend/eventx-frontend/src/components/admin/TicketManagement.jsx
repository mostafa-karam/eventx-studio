import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose, DialogTrigger } from '../ui/dialog';
import { Ticket, Users, Calendar, QrCode, Search, Filter, Download, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, CreditCard } from 'lucide-react';
import QRCode from 'qrcode';

const TicketManagement = () => {
    const { token } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(null);
    const [statusView, setStatusView] = useState('all'); // 'all' | 'active' | 'booked' | 'used' | 'cancelled' | 'expired'
    const [statistics, setStatistics] = useState({ statusCounts: {}, orphanCount: 0, total: 0 });
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [eventFilter, setEventFilter] = useState('');
    const [events, setEvents] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [ticketToAssign, setTicketToAssign] = useState(null);
    const [selectedEventForAssign, setSelectedEventForAssign] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

    useEffect(() => {
        fetchTickets(statusView, page, eventFilter);
    }, [statusView, page, eventFilter]);

    useEffect(() => {
        // prefetch a short events list for the assign modal and for filtering
        const loadEvents = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/events?limit=50`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data.data?.events || []);
                }
            } catch (e) {
                console.warn('Failed to fetch events for admin:', e);
            }
        };
        loadEvents();
    }, []);

    const fetchTickets = async (status = '', pageParam = 1, eventId = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.set('status', status === 'orphan' ? 'orphan' : status);
            if (pageParam) params.set('page', String(pageParam));
            if (eventId) params.set('eventId', eventId);
            const url = `${API_BASE_URL}/tickets/admin${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data.data.tickets || []);
                if (data.data.statistics) setStatistics(data.data.statistics);
                if (data.data.pagination) {
                    setPage(data.data.pagination.current || pageParam);
                    setPages(data.data.pagination.pages || 1);
                }
            } else {
                setTickets([]);
            }
        } catch (e) {
            console.error('Tickets fetch error', e);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const generateQrForTicket = async (ticket) => {
        setGenerating(ticket._id);
        try {
            const payload = JSON.stringify({ id: ticket._id, ticketId: ticket.ticketId });
            const dataUrl = await QRCode.toDataURL(payload, { margin: 1, scale: 6 });
            setQrCodeDataUrl(dataUrl);
            setSelectedTicket(ticket);
            setShowQrModal(true);
        } catch (e) {
            console.error('QR generation error', e);
            alert('Failed to generate QR code');
        } finally {
            setGenerating(null);
        }
    };

    const downloadQrCode = () => {
        if (!qrCodeDataUrl || !selectedTicket) return;
        
        const link = document.createElement('a');
        link.download = `ticket-qr-${selectedTicket.ticketId || selectedTicket._id}.png`;
        link.href = qrCodeDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openAssignModal = (ticket) => {
        setTicketToAssign(ticket);
        setSelectedEventForAssign('');
        setShowAssignModal(true);
    };

    const assignOrphan = async () => {
        const ticketId = ticketToAssign?._id;
        const eventId = selectedEventForAssign;
        if (!ticketId || !eventId) return alert('Please choose an event');
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/admin/orphans/${ticketId}/assign`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            if (res.ok) {
                setShowAssignModal(false);
                setTicketToAssign(null);
                await fetchTickets(statusView, page, eventFilter);
                alert('Ticket assigned');
            } else {
                const err = await res.json();
                alert(err.message || 'Failed to assign ticket');
            }
        } catch (e) {
            console.error('Assign orphan error', e);
            alert('Network error while assigning ticket');
        }
    };

    const cancelOrphan = async (ticketId) => {
        if (!confirm('Cancel this orphan ticket?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/admin/orphans/${ticketId}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                await fetchTickets(statusView);
                alert('Ticket cancelled');
            } else {
                const err = await res.json();
                alert(err.message || 'Failed to cancel ticket');
            }
        } catch (e) {
            console.error('Cancel orphan error', e);
            alert('Network error while cancelling ticket');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'booked':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'used':
                return <CheckCircle className="w-4 h-4 text-blue-500" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'expired':
                return <Clock className="w-4 h-4 text-gray-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'booked':
                return 'bg-green-100 text-green-800';
            case 'used':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            case 'expired':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'refunded':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatPaymentAmount = (payment) => {
        if (!payment || payment.amount === 0) return 'Free';
        return `${payment.currency || 'USD'} ${payment.amount || 0}`;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Ticket className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking & Tickets</h1>
                        <p className="text-gray-600">Manage ticket bookings, generate QR codes, and track attendance</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <QrCode className="w-4 h-4 mr-2" />
                        Bulk QR Generate
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                                <p className="text-3xl font-bold text-gray-900">{statistics.total || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Ticket className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                                <p className="text-3xl font-bold text-green-600">{statistics.statusCounts?.booked || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Used Tickets</p>
                                <p className="text-3xl font-bold text-blue-600">{statistics.statusCounts?.used || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Orphan Tickets</p>
                                <p className="text-3xl font-bold text-yellow-600">{statistics.orphanCount || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select 
                        value={eventFilter} 
                        onChange={(e) => setEventFilter(e.target.value)} 
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Events</option>
                        {events.map((ev) => (
                            <option key={ev._id} value={ev._id}>{ev.title}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center space-x-2">
                    {['all', 'booked', 'used', 'cancelled', 'expired'].map((status) => (
                        <Button
                            key={status}
                            variant={statusView === status ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setStatusView(status); setPage(1); }}
                            className="capitalize"
                        >
                            {status === 'all' ? 'All' : status}
                        </Button>
                    ))}
                    {statistics.orphanCount > 0 && (
                        <Button
                            variant={statusView === 'orphan' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setStatusView('orphan'); setPage(1); }}
                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                        >
                            Orphans ({statistics.orphanCount})
                        </Button>
                    )}
                </div>
            </div>

            {/* Tickets List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Ticket className="w-5 h-5" />
                        <span>Ticket Management</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-12">
                            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                            <p className="text-gray-600">No tickets match your current filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tickets
                                .filter((t) => {
                                    if (statusView === 'all') return true;
                                    if (statusView === 'active') return t.status !== 'cancelled';
                                    return t.status === statusView;
                                })
                                .map((t) => (
                                    <div key={t._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-4">
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    {getStatusIcon(t.status)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h3 className="font-semibold text-gray-900">
                                                            {t.event?.title || 'Unassigned Event'}
                                                        </h3>
                                                        <Badge className={getStatusColor(t.status)}>
                                                            {t.status}
                                                        </Badge>
                                                        {(!t.event || !t.event?.title) && (
                                                            <Badge className="bg-yellow-100 text-yellow-800">
                                                                Orphan
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <div className="flex items-center space-x-4">
                                                            <span className="flex items-center space-x-1">
                                                                <Users className="w-4 h-4" />
                                                                <span>{t.user?.name || 'Unassigned User'}</span>
                                                            </span>
                                                            <span className="flex items-center space-x-1">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>Seat: {t.seatNumber || 'N/A'}</span>
                                                            </span>
                                                            <span className="flex items-center space-x-1">
                                                                <DollarSign className="w-4 h-4" />
                                                                <span>{formatPaymentAmount(t.payment)}</span>
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-4">
                                                            <div className="text-xs text-gray-500">
                                                                Ticket ID: {t.ticketId || t._id}
                                                            </div>
                                                            {t.payment && (
                                                                <div className="flex items-center space-x-2">
                                                                    <Badge className={`text-xs ${getPaymentStatusColor(t.payment.status)}`}>
                                                                        <CreditCard className="w-3 h-3 mr-1" />
                                                                        {t.payment.status || 'pending'}
                                                                    </Badge>
                                                                    {t.payment.paymentMethod && t.payment.paymentMethod !== 'free' && (
                                                                        <span className="text-xs text-gray-500">
                                                                            via {t.payment.paymentMethod}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {t.event?.date && (
                                                            <div className="text-xs text-gray-500">
                                                                Event Date: {new Date(t.event.date).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                        {t.payment?.paymentDate && (
                                                            <div className="text-xs text-gray-500">
                                                                Paid: {new Date(t.payment.paymentDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                        {t.payment?.transactionId && (
                                                            <div className="text-xs text-gray-500">
                                                                Transaction: {t.payment.transactionId}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => generateQrForTicket(t)} 
                                                    disabled={generating === t._id}
                                                >
                                                    <QrCode className="w-4 h-4 mr-1" />
                                                    {generating === t._id ? 'Generating...' : 'QR Code'}
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => navigator.clipboard.writeText(t.ticketId || t._id || '')}
                                                >
                                                    Copy ID
                                                </Button>
                                                {(!t.event || statusView === 'orphan' || !t.event?.title) && (
                                                    <>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => openAssignModal(t)}
                                                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                                        >
                                                            Assign Event
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => cancelOrphan(t._id)}
                                                            className="text-red-600 border-red-600 hover:bg-red-50"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            
                            {/* Pagination */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Showing page {page} of {pages} ({tickets.length} tickets)
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))} 
                                        disabled={page <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setPage((p) => Math.min(pages, p + 1))} 
                                        disabled={page >= pages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* QR Code Modal */}
            <Dialog open={showQrModal} onOpenChange={(open) => { if (!open) { setShowQrModal(false); setSelectedTicket(null); setQrCodeDataUrl(''); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-xl font-semibold text-gray-900">Your Ticket QR Code</DialogTitle>
                        <DialogDescription className="text-gray-600 font-medium">
                            {selectedTicket?.event?.title || 'MAIM'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center space-y-6 py-6">
                        {/* QR Code */}
                        <div className="bg-white p-6 rounded-lg border-2 border-gray-100">
                            {qrCodeDataUrl && (
                                <img 
                                    src={qrCodeDataUrl} 
                                    alt="Ticket QR Code" 
                                    className="w-48 h-48 object-contain"
                                />
                            )}
                        </div>

                        {/* Event Details */}
                        <div className="text-center space-y-1">
                            <h3 className="font-semibold text-gray-900">
                                {selectedTicket?.event?.title || 'MAIM'}
                            </h3>
                            <p className="text-gray-600">
                                {selectedTicket?.event?.date 
                                    ? new Date(selectedTicket.event.date).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : 'Wed, Oct 1, 2025, 01:00 PM'
                                }
                            </p>
                            <p className="text-sm text-gray-500">
                                Ticket # {selectedTicket?.ticketId || selectedTicket?._id}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button 
                            variant="outline" 
                            onClick={downloadQrCode}
                            className="flex items-center space-x-2"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download QR</span>
                        </Button>
                        <Button 
                            onClick={() => setShowQrModal(false)}
                            className="bg-gray-900 hover:bg-gray-800 text-white px-8"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Modal (Dialog primitive) */}
            <Dialog open={showAssignModal} onOpenChange={(open) => { if (!open) { setShowAssignModal(false); setTicketToAssign(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Ticket</DialogTitle>
                        <DialogDescription>Assign ticket <strong>{ticketToAssign?.ticketId || ticketToAssign?._id}</strong> to an event.</DialogDescription>
                    </DialogHeader>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-700 mb-1">Event</label>
                        <select value={selectedEventForAssign} onChange={(e) => setSelectedEventForAssign(e.target.value)} className="w-full input">
                            <option value="">-- choose event --</option>
                            {events.map((ev) => (
                                <option key={ev._id} value={ev._id}>{ev.title} — {new Date(ev.date).toLocaleDateString()}</option>
                            ))}
                        </select>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setShowAssignModal(false); }}>Cancel</Button>
                        <Button onClick={assignOrphan} disabled={!selectedEventForAssign}>Assign</Button>
                    </DialogFooter>
                    <DialogClose />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicketManagement;
