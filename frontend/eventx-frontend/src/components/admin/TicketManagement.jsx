import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '../ui/dialog';
import { Ticket, Users, Calendar, QrCode, Search, Filter, Download, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, CreditCard, ChevronLeft, ChevronRight, MoreHorizontal, ArrowUpDown, ChevronDown } from 'lucide-react';
import QRCode from 'qrcode';

const TicketManagement = () => {
    const { } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(null);
    const [statusView, setStatusView] = useState('all');
    const [statistics, setStatistics] = useState({ statusCounts: {}, orphanCount: 0, total: 0 });
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [eventFilter, setEventFilter] = useState('');
    const [events, setEvents] = useState([]);
    
    // Modals
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [ticketToAssign, setTicketToAssign] = useState(null);
    const [selectedEventForAssign, setSelectedEventForAssign] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    
    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [activeDropdown, setActiveDropdown] = useState(null);

    useEffect(() => {
        fetchTickets(statusView, page, eventFilter);
    }, [statusView, page, eventFilter]);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/events?limit=50`, { credentials: 'include' });
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
            const res = await fetch(url, { credentials: 'include' });
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
        setActiveDropdown(null);
        try {
            const payload = JSON.stringify({ id: ticket._id, ticketId: ticket.ticketId });
            const dataUrl = await QRCode.toDataURL(payload, { margin: 1, scale: 6, color: { dark: '#0f172a', light: '#ffffff' } });
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
        setActiveDropdown(null);
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
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ eventId })
            });
            if (res.ok) {
                setShowAssignModal(false);
                setTicketToAssign(null);
                await fetchTickets(statusView, page, eventFilter);
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
        setActiveDropdown(null);
        if (!confirm('Cancel this orphan ticket?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/admin/orphans/${ticketId}/cancel`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                await fetchTickets(statusView);
            } else {
                const err = await res.json();
                alert(err.message || 'Failed to cancel ticket');
            }
        } catch (e) {
            console.error('Cancel orphan error', e);
            alert('Network error while cancelling ticket');
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.action-dropdown-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const exportAsCSV = () => {
        if (!processedTickets || processedTickets.length === 0) {
            alert("No tickets to export with current filters.");
            return;
        }

        const headers = ['Ticket ID', 'Attendee Name', 'Attendee Email', 'Event Title', 'Event Date', 'Seat Number', 'Status', 'Payment Amount', 'Payment Status', 'Booking Date'];
        
        const rows = processedTickets.map(t => [
            t.ticketId || t._id,
            t.user?.name || 'Guest User',
            t.user?.email || 'N/A',
            t.event?.title || 'Unassigned Event',
            t.event?.date ? new Date(t.event.date).toLocaleDateString() : 'TBD',
            t.seatNumber || 'N/A',
            t.status,
            t.payment?.amount || 0,
            t.payment?.status || 'N/A',
            new Date(t.createdAt || t.bookingDate).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ticket_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const bulkQRGenerate = async () => {
        if (!processedTickets || processedTickets.length === 0) {
            alert("No tickets available for QR generation.");
            return;
        }

        const oldLabel = document.getElementById('bulk-btn-label').innerText;
        document.getElementById('bulk-btn-label').innerText = 'Generating...';
        
        try {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Bulk Ticket QR Codes</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; }
                        .ticket-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
                        .ticket-card { border: 1px dashed #ccc; padding: 20px; border-radius: 12px; text-align: center; page-break-inside: avoid; }
                        .ticket-card img { max-width: 150px; height: auto; margin-bottom: 10px; }
                        .ticket-title { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
                        .ticket-info { font-size: 12px; color: #555; margin-bottom: 2px; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; padding: 0; }
                            button { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2>Bulk QR Generation (${processedTickets.length} tickets)</h2>
                        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Print / Save as PDF</button>
                    </div>
                    <div class="ticket-grid">
            `);

            // Generate QR codes for visible tickets
            for (const ticket of processedTickets) {
                const payload = JSON.stringify({ id: ticket._id, ticketId: ticket.ticketId });
                const base64QR = await QRCode.toDataURL(payload, { margin: 1, scale: 4 });
                
                printWindow.document.write(`
                    <div class="ticket-card">
                        <img src="${base64QR}" alt="QR Code" />
                        <div class="ticket-title">${ticket.event?.title || 'Unknown Event'}</div>
                        <div class="ticket-info">Ticket ID: ${ticket.ticketId ? ticket.ticketId.substring(0,8).toUpperCase() : ticket._id.substring(8, 16).toUpperCase()}</div>
                        <div class="ticket-info">Attendee: ${ticket.user?.name || 'Guest'}</div>
                        ${ticket.seatNumber ? `<div class="ticket-info">Seat: ${ticket.seatNumber}</div>` : ''}
                    </div>
                `);
            }

            printWindow.document.write(`
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            
        } catch (e) {
            console.error('Bulk QR Error:', e);
            alert("An error occurred while generating bulk QR codes.");
        } finally {
            document.getElementById('bulk-btn-label').innerText = oldLabel;
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // Process data for table filtering (local search on fetched page)
    const processedTickets = useMemo(() => {
        let result = [...tickets];
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(t => 
                t.ticketId?.toLowerCase().includes(lowerSearch) || 
                t.user?.name?.toLowerCase().includes(lowerSearch) ||
                t.user?.email?.toLowerCase().includes(lowerSearch) ||
                t._id.toLowerCase().includes(lowerSearch)
            );
        }

        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                if (sortConfig.key === 'user') {
                    aVal = a.user?.name || '';
                    bVal = b.user?.name || '';
                } else if (sortConfig.key === 'event') {
                    aVal = a.event?.title || '';
                    bVal = b.event?.title || '';
                } else if (sortConfig.key === 'date') {
                    aVal = new Date(a.createdAt || 0).getTime();
                    bVal = new Date(b.createdAt || 0).getTime();
                } else if (sortConfig.key === 'amount') {
                    aVal = a.payment?.amount || 0;
                    bVal = b.payment?.amount || 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [tickets, searchTerm, sortConfig]);

    const getStatusStyles = (status) => {
        switch (status) {
            case 'booked': return { label: 'Booked', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle };
            case 'used': return { label: 'Used', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Users };
            case 'cancelled': return { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle };
            case 'expired': return { label: 'Expired', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock };
            default: return { label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: AlertCircle };
        }
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'pending': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'failed': return 'text-red-600 bg-red-50 border-red-100';
            case 'refunded': return 'text-gray-600 bg-gray-50 border-gray-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const GlassCard = ({ children, className = '' }) => (
        <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-gray-900">Ticket Management</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Manage ticket bookings, generate QR codes, and track attendance</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={exportAsCSV} className="bg-white/60 backdrop-blur-md border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm rounded-xl transition-all">
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                    <Button onClick={bulkQRGenerate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 rounded-xl transition-all duration-300 transform hover:scale-[1.02]">
                        <QrCode className="w-4 h-4 mr-2" /> <span id="bulk-btn-label">Bulk QR Generate</span>
                    </Button>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {[
                    { label: 'Total Tickets', val: statistics.total || 0, icon: Ticket, gradient: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50 text-blue-600' },
                    { label: 'Active Bookings', val: statistics.statusCounts?.booked || 0, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500', lightBg: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Used Tickets', val: statistics.statusCounts?.used || 0, icon: Users, gradient: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50 text-violet-600' },
                    { label: 'Orphan Tickets', val: statistics.orphanCount || 0, icon: AlertCircle, gradient: 'from-amber-400 to-orange-500', lightBg: 'bg-amber-50 text-amber-600' }
                ].map((stat, i) => (
                    <div key={i} className={`group bg-white rounded-3xl p-6 flex flex-col justify-center h-[120px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}>
                        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>
                        
                        <div className="relative z-10 flex justify-between items-center">
                            <div className="flex-1 pr-3">
                                <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1.5">{stat.label}</p>
                                <h3 className={`text-[28px] font-black tracking-tight leading-none truncate capitalize text-gray-900`}>{stat.val}</h3>
                            </div>
                            <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${stat.lightBg} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        
                        <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    </div>
                ))}
            </div>

            {/* Main Table Container */}
            <GlassCard className="flex flex-col">
                {/* Tabs & Filters */}
                <div className="flex flex-col border-b border-gray-100 bg-gray-50/50">
                    <div className="flex overflow-x-auto hide-scrollbar px-4 pt-4 gap-6 text-sm font-semibold text-gray-500">
                        {[
                            { id: 'all', label: 'All Tickets' },
                            { id: 'booked', label: 'Booked' },
                            { id: 'used', label: 'Used' },
                            { id: 'cancelled', label: 'Cancelled' },
                            { id: 'expired', label: 'Expired' },
                            ...(statistics.orphanCount > 0 ? [{ id: 'orphan', label: 'Orphans' }] : [])
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setStatusView(tab.id); setPage(1); }}
                                className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
                                    statusView === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent hover:text-gray-900 hover:border-gray-200'
                                }`}
                            >
                                {tab.label}
                                {tab.id === 'orphan' && <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs">{statistics.orphanCount}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Toolbar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative flex-1 lg:max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            placeholder="Search by Ticket ID or User..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={eventFilter}
                                onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
                                className="w-full appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700 font-medium cursor-pointer"
                            >
                                <option value="">All Events</option>
                                {events.map((ev) => (
                                    <option key={ev._id} value={ev._id} className="truncate">{ev.title}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-8 flex items-center justify-center h-full">
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-gray-500 font-medium">Loading tickets...</p>
                            </div>
                        </div>
                    ) : processedTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-[400px]">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Ticket className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No tickets found</h3>
                            <p className="text-sm text-gray-500 max-w-sm mb-6">
                                No tickets match your current filters. Try adjusting your search criteria or selecting a different tab.
                            </p>
                            {(statusView !== 'all' || eventFilter) && (
                                <Button variant="outline" className="border-gray-200 rounded-xl" onClick={() => { setStatusView('all'); setEventFilter(''); setSearchTerm(''); }}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('ticketId')}>
                                        <div className="flex items-center gap-2">Ticket ID <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('user')}>
                                        <div className="flex items-center gap-2">Attendee <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('event')}>
                                        <div className="flex items-center gap-2">Event <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('status')}>
                                        <div className="flex items-center gap-2">Status <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('amount')}>
                                        <div className="flex items-center gap-2">Payment <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedTickets.map((t) => {
                                    const style = getStatusStyles(t.status);
                                    const StatusIcon = style.icon;
                                    const isOrphan = !t.event || !t.event?.title;
                                    
                                    return (
                                        <tr key={t._id} className={`bg-white hover:bg-blue-50/30 transition-all duration-200 group border-b border-gray-50 last:border-0 relative ${isOrphan ? 'bg-amber-50/30' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${style.color.split(' ')[0]} bg-opacity-30`}>
                                                        <StatusIcon className={`w-4 h-4 ${style.color.split(' ')[1]}`} />
                                                    </div>
                                                    <div>
                                                        <div className="font-mono text-sm font-bold text-gray-900">{t.ticketId ? t.ticketId.substring(0,8).toUpperCase() : t._id.substring(8, 16).toUpperCase()}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono tracking-wider">{t.ticketId || t._id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{t.user?.name || 'Guest User'}</div>
                                                <div className="text-xs text-gray-500 mt-0.5 max-w-[150px] truncate" title={t.user?.email}>{t.user?.email || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900 truncate max-w-[200px]" title={t.event?.title || 'Unassigned Event'}>
                                                    {t.event?.title || 'Unassigned Event'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    {t.event?.date ? new Date(t.event.date).toLocaleDateString() : 'TBD'}
                                                    {t.seatNumber && <span className="ml-2 font-bold bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">Seat: {t.seatNumber}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${style.color}`}>
                                                        {style.label.toUpperCase()}
                                                    </span>
                                                    {isOrphan && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                                                            ORPHAN
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-900">
                                                    {!t.payment || t.payment.amount === 0 ? (
                                                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 text-xs">FREE</span>
                                                    ) : (
                                                        `${t.payment.currency || 'USD'} ${t.payment.amount}`
                                                    )}
                                                </div>
                                                {t.payment && t.payment.amount > 0 && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPaymentStatusColor(t.payment.status)} uppercase tracking-wider`}>
                                                            {t.payment.status || 'PENDING'}
                                                        </span>
                                                        <CreditCard className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="relative inline-block text-left action-dropdown-container">
                                                    <button 
                                                        onClick={() => setActiveDropdown(activeDropdown === t._id ? null : t._id)}
                                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                    >
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {activeDropdown === t._id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                                            <button onClick={() => generateQrForTicket(t)} disabled={generating === t._id} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-medium">
                                                                <QrCode className="w-4 h-4 mr-2" /> View QR Code
                                                            </button>
                                                            <button onClick={() => { setActiveDropdown(null); navigator.clipboard.writeText(t.ticketId || t._id); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-medium">
                                                                <Search className="w-4 h-4 mr-2" /> Copy Ticket ID
                                                            </button>
                                                            
                                                            {isOrphan && (
                                                                <>
                                                                    <div className="h-px bg-gray-100 my-1"></div>
                                                                    <button onClick={() => openAssignModal(t)} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center font-medium">
                                                                        <Calendar className="w-4 h-4 mr-2" /> Assign to Event
                                                                    </button>
                                                                    <button onClick={() => cancelOrphan(t._id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center font-medium">
                                                                        <XCircle className="w-4 h-4 mr-2" /> Cancel Orphan
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!loading && processedTickets.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-sm text-gray-500 font-medium">
                            Showing page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{pages}</span>
                        </span>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors flex items-center"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                            </button>
                            <span className="px-3 py-1.5 text-sm font-semibold text-gray-700">
                                {page}
                            </span>
                            <button
                                disabled={page === pages || pages === 0}
                                onClick={() => setPage(p => Math.min(pages, p + 1))}
                                className="px-3 py-1.5 rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors flex items-center"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>

            {/* QR Code Modal Dialog */}
            <Dialog open={showQrModal} onOpenChange={(open) => { if (!open) { setShowQrModal(false); setSelectedTicket(null); setQrCodeDataUrl(''); } }}>
                <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center text-white relative">
                        <DialogTitle className="text-2xl font-extrabold tracking-tight">Access Ticket</DialogTitle>
                        <DialogDescription className="text-blue-100 font-medium mt-1">
                            {selectedTicket?.event?.title || 'Unknown Event'}
                        </DialogDescription>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-600 rotate-45 -mt-4 rounded-sm"></div>
                    </div>

                    <div className="flex flex-col items-center bg-white pt-10 pb-8 px-6 space-y-6">
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                            {qrCodeDataUrl && (
                                <img src={qrCodeDataUrl} alt="Ticket QR Code" className="w-56 h-56 object-contain" />
                            )}
                        </div>

                        <div className="text-center w-full space-y-3 px-4">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Ticket ID / Hash</p>
                                <p className="text-sm font-mono font-bold text-gray-800 break-all">
                                    {selectedTicket?.ticketId || selectedTicket?._id}
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date & Time</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-1">
                                        {selectedTicket?.event?.date ? new Date(selectedTicket.event.date).toLocaleDateString() : 'TBD'}
                                        <br/>
                                        {selectedTicket?.event?.date ? new Date(selectedTicket.event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                    </p>
                                </div>
                                <div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attendee</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-1 truncate">
                                        {selectedTicket?.user?.name || 'Guest User'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Seat: {selectedTicket?.seatNumber || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-3">
                        <Button variant="outline" onClick={downloadQrCode} className="flex-1 bg-white border-gray-200 hover:bg-gray-50 rounded-xl">
                            <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                        <Button onClick={() => setShowQrModal(false)} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-xl">
                            <CheckCircle className="w-4 h-4 mr-2" /> Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Assign Modal Dialog */}
            <Dialog open={showAssignModal} onOpenChange={(open) => { if (!open) { setShowAssignModal(false); setTicketToAssign(null); } }}>
                <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">Assign Orphan Ticket</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            Choose an event to assign ticket <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">{ticketToAssign?.ticketId?.substring(0,8) || ticketToAssign?._id?.substring(0,8)}</span> to.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Active Event</label>
                        <div className="relative">
                            <select 
                                value={selectedEventForAssign} 
                                onChange={(e) => setSelectedEventForAssign(e.target.value)} 
                                className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700 font-medium cursor-pointer"
                            >
                                <option value="">-- Click to choose event --</option>
                                {events.map((ev) => (
                                    <option key={ev._id} value={ev._id}>{ev.title} — {new Date(ev.date).toLocaleDateString()}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {events.length === 0 && (
                            <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> No events available for assignment.
                            </p>
                        )}
                    </div>

                    <DialogFooter className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowAssignModal(false)} className="border-gray-200 rounded-xl flex-1 text-gray-600 font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={assignOrphan} disabled={!selectedEventForAssign} className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1 text-white shadow-lg shadow-blue-500/20 font-semibold">
                            Assign Ticket
                        </Button>
                    </DialogFooter>
                    <DialogClose />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicketManagement;
