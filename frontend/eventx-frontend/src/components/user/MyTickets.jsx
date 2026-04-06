import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import {
  Calendar,
  MapPin,
  Ticket,
  Download,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Eye,
  Share2,
  FileText,
  Grid,
  List,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  X,
  SlidersHorizontal,
  Bookmark,
  Heart,
  UserPlus
} from 'lucide-react';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [waitlists, setWaitlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);

  // Search and filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('bookingDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Enhanced UI states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  //   const [searchSuggestions] = useState([]);
  //   const [showSuggestions] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(6);
  const [totalTickets, setTotalTickets] = useState(0);


  // //   const { user, fetchCsrfToken } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchMyTickets();
    fetchMyWaitlists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyWaitlists = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/waitlists/my`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setWaitlists(data.data?.waitlists || []);
      }
    } catch (error) {
      console.error('Waitlists fetch error:', error);
    }
  };

  const fetchMyTickets = async (page = 1, status = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ticketsPerPage.toString(),
        ...(status !== 'all' && { status })
      });

      const response = await fetch(`${API_BASE_URL}/tickets/my-tickets?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.data.tickets);
        setTotalTickets(data.data.pagination.total);
        setCurrentPage(page);
      } else {
        setError('Failed to load tickets');
      }
    } catch (error) {
      console.error('Tickets fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'TBA';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTicketStatus = (ticket) => {
    const now = new Date();
    const eventDate = ticket?.event?.date ? new Date(ticket.event.date) : null;

    if (ticket.status === 'cancelled') {
      return {
        status: 'cancelled',
        label: 'Cancelled',
        color: 'bg-red-100 text-red-600',
        icon: XCircle
      };
    } else if (ticket.checkIn && ticket.checkIn.isCheckedIn) {
      return {
        status: 'checked-in',
        label: 'Checked In',
        color: 'bg-green-100 text-green-600',
        icon: CheckCircle
      };
    } else if (eventDate && eventDate < now) {
      return {
        status: 'expired',
        label: 'Expired',
        color: 'bg-gray-100 text-gray-600',
        icon: Clock
      };
    } else {
      return {
        status: 'active',
        label: 'Active',
        color: 'bg-blue-100 text-blue-600',
        icon: Ticket
      };
    }
  };

  // Filter and sort tickets
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(ticket =>
        ticket.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.event?.venue?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const ticketStatus = getTicketStatus(ticket);
        return ticketStatus.status === statusFilter;
      });
    }

    // Sort tickets
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'eventTitle':
          aValue = a.event?.title || '';
          bValue = b.event?.title || '';
          break;
        case 'eventDate':
          aValue = new Date(a.event?.date || 0);
          bValue = new Date(b.event?.date || 0);
          break;
        case 'price':
          aValue = a.payment?.amount || 0;
          bValue = b.payment?.amount || 0;
          break;
        case 'status':
          aValue = getTicketStatus(a).status;
          bValue = getTicketStatus(b).status;
          break;
        default:
          aValue = new Date(a.bookingDate || 0);
          bValue = new Date(b.bookingDate || 0);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tickets, searchQuery, statusFilter, sortBy, sortOrder]);

  const categorizeTickets = () => {
    const now = new Date();
    return {
      upcoming: filteredAndSortedTickets.filter(ticket =>
        ticket.event && ticket.event.date && new Date(ticket.event.date) > now &&
        ticket.status !== 'cancelled'
      ),
      past: filteredAndSortedTickets.filter(ticket =>
        (!ticket.event) || (ticket.event && ticket.event.date && new Date(ticket.event.date) <= now) ||
        (ticket.checkIn && ticket.checkIn.isCheckedIn)
      ),
      cancelled: filteredAndSortedTickets.filter(ticket => ticket.status === 'cancelled')
    };
  };

  const canCancelTicket = (ticket) => {
    const now = new Date();
    const eventDate = ticket?.event?.date ? new Date(ticket.event.date) : null;
    if (ticket.status === 'cancelled') return false;
    if (ticket.status === 'used') return false;
    if (!eventDate) return false;
    if (eventDate < now) return false;
    return true;
  };

  const handleCancelTicket = async (ticketId) => {
    try {
      setError('');
      setCancelLoadingId(ticketId);
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/cancel`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to cancel ticket');
      }

      // Update local state
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? { ...t, status: 'cancelled' } : t)));
    } catch (e) {
      console.error('Cancel ticket error:', e);
      setError(e.message || 'Failed to cancel ticket');
    } finally {
      setCancelLoadingId(null);
    }
  };

  const generatePDFTicket = async (ticket) => {
    if (!ticket) return;
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [200, 100] // Custom ticket size
      });

      // Background color
      doc.setFillColor(245, 247, 250);
      doc.rect(0, 0, 200, 100, 'F');

      // Left Panel (Dark Blue/Indigo)
      doc.setFillColor(49, 46, 129); // indigo-900 equivalent
      doc.rect(0, 0, 60, 100, 'F');

      // QR Code on Left Panel
      if (ticket.qrCodeImage) {
        doc.addImage(ticket.qrCodeImage, 'PNG', 15, 15, 30, 30);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("SCAN FOR ENTRY", 30, 55, { align: "center" });

      doc.setFontSize(8);
      doc.text(ticket.ticketId || ticket._id.slice(-8), 30, 65, { align: "center" });

      // Right Panel text
      doc.setTextColor(31, 41, 55); // gray-800
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");

      const title = ticket.event?.title || 'Event Ticket';
      const splitTitle = doc.splitTextToSize(title, 120);
      doc.text(splitTitle, 70, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99); // gray-600

      doc.text(`Date: ${formatDate(ticket.event?.date)}`, 70, 45);
      doc.text(`Venue: ${ticket.event?.venue?.name || 'TBA'}, ${ticket.event?.venue?.city || ''}`, 70, 55);

      // Divider
      doc.setDrawColor(209, 213, 219);
      doc.line(70, 65, 190, 65);

      // Bottom Details
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("SEAT", 70, 75);
      doc.text("TYPE", 110, 75);
      doc.text("PRICE", 150, 75);

      doc.setFont("helvetica", "normal");
      doc.text(ticket.seatNumber || 'General', 70, 82);
      doc.text(ticket.event?.category || 'Standard', 110, 82);
      const price = ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`;
      doc.text(price, 150, 82);

      doc.save(`Event-Ticket-${ticket.ticketId || ticket._id.slice(-8)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF ticket.");
    }
  };

  // Bulk actions
  const handleSelectTicket = (ticketId) => {
    setSelectedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === filteredAndSortedTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredAndSortedTickets.map(ticket => ticket._id));
    }
  };

  const handleBulkCancel = async () => {
    if (selectedTickets.length === 0) return;

    try {
      setError('');
      const cancelPromises = selectedTickets.map(async (ticketId) =>
        fetch(`${API_BASE_URL}/tickets/${ticketId}/cancel`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      await Promise.all(cancelPromises);
      setTickets(prev => prev.map(ticket =>
        selectedTickets.includes(ticket._id)
          ? { ...ticket, status: 'cancelled' }
          : ticket
      ));
      setSelectedTickets([]);
    } catch (error) {
      console.error('Bulk cancel error:', error);
      setError('Failed to cancel some tickets');
    }
  };

  const handleBulkDownload = () => {
    selectedTickets.forEach(ticketId => {
      const ticket = tickets.find(t => t._id === ticketId);
      if (ticket) {
        generatePDFTicket(ticket);
      }
    });
  };

  // Pagination
  const totalPages = Math.ceil(totalTickets / ticketsPerPage);
  const handlePageChange = (page) => {
    fetchMyTickets(page, statusFilter);
  };

  // Export functionality
  const handleExportTickets = () => {
    const exportData = filteredAndSortedTickets.map(ticket => ({
      'Ticket Number': ticket.ticketId || ticket._id.slice(-8),
      'Event Title': ticket.event?.title || 'Unknown Event',
      'Event Date': formatDate(ticket.event?.date),
      'Venue': ticket.event?.venue ? `${ticket.event.venue.name}, ${ticket.event.venue.city}` : 'TBA',
      'Seat Number': ticket.seatNumber || 'N/A',
      'Price': ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`,
      'Status': getTicketStatus(ticket).label,
      'Booking Date': formatDate(ticket.bookingDate),
      'QR Code': ticket.qrCode
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my-tickets-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enhanced utility functions
  const toggleFavorite = (ticketId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(ticketId)) {
      newFavorites.delete(ticketId);
    } else {
      newFavorites.add(ticketId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('eventx_ticket_favorites', JSON.stringify([...newFavorites]));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('bookingDate');
    setSortOrder('desc');
    setSelectedTickets([]);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter !== 'all') count++;
    return count;
  };

  // Load favorites from localStorage on component mount
  useEffect(() => {
    let savedFavorites = [];
    try { savedFavorites = JSON.parse(localStorage.getItem('eventx_ticket_favorites') || '[]'); } catch { /* corrupted */ }
    setFavorites(new Set(savedFavorites));
  }, []);

  const TicketCard = ({ ticket }) => {
    const ticketStatus = getTicketStatus(ticket);
    const StatusIcon = ticketStatus.icon;
    const isSelected = selectedTickets.includes(ticket._id);
    const isFavorite = favorites.has(ticket._id);
    const thumbnail = (ticket?.event?.images && ticket.event.images[0]?.url) || null;

    if (viewMode === 'list') {
      return (
        <Card className={`group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 pb-0 rounded-2xl bg-white ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}`}>
          <div className="flex flex-col md:flex-row">
            <div className="relative w-full md:w-56 h-48 md:h-auto bg-gradient-to-br from-indigo-50 to-purple-50 flex-shrink-0 overflow-hidden">
              {thumbnail ? (
                <img src={thumbnail} alt={ticket.event?.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                    <Ticket className="w-6 h-6 text-indigo-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-indigo-900">Event Image</p>
                    <p className="text-xs text-indigo-400 mt-1">Not Available</p>
                  </div>
                </div>
              )}
              <div className="absolute top-3 left-3">
                <Badge className={`${ticketStatus.color} shadow-md text-xs font-bold border-0 px-2.5 py-1 backdrop-blur-md bg-opacity-90`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {ticketStatus.label}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 w-9 h-9 p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm rounded-full transition-all"
                onClick={(e) => { e.stopPropagation(); toggleFavorite(ticket._id); }}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'} transition-transform`} />
              </Button>
            </div>

            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="relative mt-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectTicket(ticket._id)}
                        className="w-5 h-5 border-2 border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white rounded"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>
                      )}
                    </div>
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 tracking-tight">
                        {ticket.event?.title || 'Unknown Event'}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium">
                        Booked on {formatDate(ticket.bookingDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl md:text-2xl font-extrabold text-indigo-600 mb-1">
                      {ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`}
                    </div>
                    <div className="text-xs text-gray-400 font-mono font-medium tracking-wide">
                      #{ticket.ticketNumber || ticket._id.slice(-8)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600 mb-6">
                  <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                    {formatDate(ticket.event?.date)}
                  </div>
                  <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg max-w-[200px] truncate">
                    <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                    <span className="truncate">{ticket.event?.venue ? `${ticket.event.venue.name}, ${ticket.event.venue.city}` : 'Venue TBA'}</span>
                  </div>
                  <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Users className="h-4 w-4 mr-2 text-indigo-500" />
                    Seat: {ticket.seatNumber || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold bg-white border-gray-200 text-gray-600 px-3 py-1 rounded-full">
                    {ticket.event?.category || 'General'}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  {ticket.status !== 'cancelled' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm font-semibold transition-all hover:border-indigo-200"
                      >
                        <QrCode className="h-4 w-4 mr-1.5" />
                        Show QR
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => generatePDFTicket(ticket)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-semibold transition-all group-hover:shadow-lg"
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        Download PDF
                      </Button>
                    </>
                  )}
                  {canCancelTicket(ticket) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to cancel this ticket? This action cannot be undone.")) {
                          handleCancelTicket(ticket._id);
                        }
                      }}
                      disabled={cancelLoadingId === ticket._id}
                      className="shadow-sm font-semibold"
                    >
                      {cancelLoadingId === ticket._id ? '...' : 'Cancel Ticket'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // Grid view
    return (
      <Card className={`group overflow-hidden border-0 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white flex flex-col h-full rounded-2xl ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}>
        <div className="relative w-full h-56 bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden">
          {thumbnail ? (
            <img src={thumbnail} alt={ticket.event?.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6 group-hover:scale-105 transition-transform duration-700">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                <Ticket className="w-8 h-8 text-indigo-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-indigo-900">Event Image</p>
                <p className="text-xs text-indigo-400 mt-1">Not Available</p>
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge className={`${ticketStatus.color} shadow-lg text-xs font-bold border-0 px-2.5 py-1 backdrop-blur-md bg-opacity-90`}>
              <StatusIcon className="h-3.5 w-3.5 mr-1" />
              {ticketStatus.label}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 w-9 h-9 p-0 bg-white/90 backdrop-blur-sm hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm rounded-full translate-y-2 group-hover:translate-y-0"
            onClick={(e) => { e.stopPropagation(); toggleFavorite(ticket._id); }}
          >
            <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'} transition-transform`} />
          </Button>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-indigo-900 font-extrabold px-3 py-1.5 rounded-lg shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            {ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`}
          </div>
        </div>

        <CardHeader className="pb-3 pt-5 flex-shrink-0 relative">
          <div className="flex items-start justify-between mt-1 mb-3">
            <div className="relative">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleSelectTicket(ticket._id)}
                className="w-5 h-5 border-2 border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white rounded"
              />
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 font-mono font-medium tracking-wide">
                #{ticket.ticketNumber || ticket._id.slice(-8)}
              </span>
            </div>
          </div>
          <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-indigo-600 transition-colors tracking-tight text-gray-900">
            {ticket.event?.title || 'Unknown Event'}
          </CardTitle>
          <CardDescription className="text-sm font-medium mt-1">
            Booked on {formatDate(ticket.bookingDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex-1 flex flex-col justify-end">
          <div className="space-y-3 text-sm font-medium text-gray-600 mb-5">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-indigo-400" />
              <span>{formatDate(ticket.event?.date)}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-indigo-400" />
              <span className="truncate">
                {ticket.event?.venue ? `${ticket.event.venue.name}, ${ticket.event.venue.city}` : 'Venue TBA'}
              </span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-indigo-400" />
              <span>Seat: {ticket.seatNumber || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto min-h-[52px]">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold bg-gray-50 border-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full">
                {ticket.event?.category || 'General'}
              </Badge>
            </div>
            <div className="flex space-x-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {ticket.status !== 'cancelled' && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedTicket(ticket)}
                    className="h-8 w-8 bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm transition-all rounded-lg"
                    title="Show QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => generatePDFTicket(ticket)}
                    className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all rounded-lg"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              {canCancelTicket(ticket) && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to cancel this ticket? This action cannot be undone.")) {
                      handleCancelTicket(ticket._id);
                    }
                  }}
                  disabled={cancelLoadingId === ticket._id}
                  className="h-8 w-8 shadow-sm rounded-lg relative group/btn"
                  title="Cancel Ticket"
                >
                  {cancelLoadingId === ticket._id ? <span className="animate-spin text-xs">...</span> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <div className="text-lg font-bold text-indigo-600 lg:group-hover:hidden transition-all duration-300 lg:block hidden">
              {ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const QRCodeModal = ({ ticket, onClose }) => {
    if (!ticket) return null;

    const handleShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Ticket for ${ticket.event?.title}`,
            text: `Check out my ticket for ${ticket.event?.title} on ${formatDate(ticket.event?.date)}`,
            url: window.location.href
          });
        } catch (error) {
          console.log('Error sharing:', error);
        }
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    };

    return (
      <Dialog open={!!ticket} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold">Your Ticket QR Code</DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">{ticket.event?.title}</DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* QR Code Display */}
            <div className="text-center">
              {ticket.qrCodeImage ? (
                <div className="inline-block p-6 bg-white border-2 border-gray-200 rounded-xl shadow-lg">
                  <img
                    src={ticket.qrCodeImage}
                    alt="Ticket QR Code"
                    className="w-56 h-56 mx-auto"
                  />
                </div>
              ) : (
                <div className="w-56 h-56 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-500 font-medium">QR Code</p>
                    <p className="text-xs text-gray-400 font-mono break-all px-2 mt-2">{ticket.qrCode}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Ticket Details */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event</span>
                  <p className="text-sm font-semibold text-gray-900">{ticket.event?.title}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</span>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(ticket.event?.date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ticket #</span>
                  <p className="text-sm font-mono font-semibold text-gray-900">{ticket.ticketNumber || ticket._id.slice(-8)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seat</span>
                  <p className="text-sm font-semibold text-gray-900">{ticket.seatNumber || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total Paid</span>
                  <span className="text-lg font-bold text-green-600">
                    {ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => generatePDFTicket(ticket)}
                className="flex items-center justify-center h-12"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex items-center justify-center h-12"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <Button onClick={onClose} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Enhanced Header Skeleton */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              <div>
                <div className="h-8 bg-gray-200 rounded w-40 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="flex items-center gap-2 bg-white rounded-lg p-1">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center animate-pulse">
                  <div className="p-3 bg-gray-200 rounded-xl w-12 h-12"></div>
                  <div className="ml-4">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Ticket Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-300 rounded-xl animate-pulse"></div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-gray-200 rounded border-2 border-gray-300 animate-pulse"></div>
                    <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="flex space-x-1">
                    <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const categorizedTickets = categorizeTickets();

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
              <p className="text-gray-600">Manage and view all your event tickets in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm">
              <Ticket className="w-4 h-4" />
              <span className="font-medium">{totalTickets} total tickets</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTickets}
              disabled={filteredAndSortedTickets.length === 0}
              className="bg-white hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Ticket Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                <Ticket className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{totalTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categorizedTickets.upcoming.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Past Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categorizedTickets.past.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 rounded-xl">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categorizedTickets.cancelled.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filter Controls */}
      {showFilters && (
        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFiltersCount()} active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Advanced
                </Button>
                {getActiveFiltersCount() > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Main Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start mb-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
                    <Search className="h-5 w-5" />
                  </div>
                  <Input
                    placeholder="Search tickets, events, or venues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl bg-white border-gray-200 focus:border-green-500 focus:ring-green-500 text-base"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44 h-12 border-gray-200 focus:border-green-500 rounded-xl">
                    <Filter className="h-4 w-4 mr-2 text-gray-600" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="checked-in">Checked In</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44 h-12 border-gray-200 focus:border-green-500 rounded-xl">
                    <TrendingUp className="h-4 w-4 mr-2 text-gray-600" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bookingDate">Booking Date</SelectItem>
                    <SelectItem value="eventDate">Event Date</SelectItem>
                    <SelectItem value="eventTitle">Event Title</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center justify-center h-12 px-4 rounded-xl"
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                  <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                  <span className="sm:hidden">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        className="h-10 rounded-lg"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        className="h-10 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Category</label>
                    <Select>
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Location</label>
                    <Input
                      placeholder="City or venue name"
                      className="h-10 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Bulk Actions */}
      {selectedTickets.length > 0 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-green-700 font-semibold">
                    {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Checkbox
                      checked={selectedTickets.length === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="w-4 h-4 border-2 border-green-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white"
                    />
                    {selectedTickets.length === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white shadow-sm"></div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="border-green-200 text-green-700 hover:bg-green-50"
                  >
                    {selectedTickets.length === filteredAndSortedTickets.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                  disabled={selectedTickets.some(id => !tickets.find(t => t._id === id)?.qrCodeImage)}
                  className="w-full sm:w-auto border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Download QR Codes</span>
                  <span className="sm:hidden">Download</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkCancel}
                  disabled={selectedTickets.some(id => !canCancelTicket(tickets.find(t => t._id === id)))}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Cancel Selected</span>
                  <span className="sm:hidden">Cancel</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tickets Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">
            Upcoming ({categorizedTickets.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({categorizedTickets.past.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({categorizedTickets.cancelled.length})
          </TabsTrigger>
          <TabsTrigger value="waitlists">
            Waitlists ({waitlists.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {categorizedTickets.upcoming.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ticket className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming events</h3>
              <p className="text-gray-500 mb-6">Book tickets for events to see them here.</p>
              <Button variant="outline">
                Browse Events
              </Button>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {categorizedTickets.upcoming.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          {categorizedTickets.past.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No past events</h3>
              <p className="text-gray-500 mb-6">Your attended events will appear here.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {categorizedTickets.past.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-6">
          {categorizedTickets.cancelled.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No cancelled tickets</h3>
              <p className="text-gray-500 mb-6">Cancelled tickets will appear here.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {categorizedTickets.cancelled.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="waitlists" className="space-y-6">
          {waitlists.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Not on any waitlists</h3>
              <p className="text-gray-500 mb-6">Join waitlists for sold-out events to get notified.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {waitlists.map((wl) => (
                <Card key={wl._id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-100 shadow-md group bg-white flex flex-col h-full rounded-2xl relative">
                  {wl.event?.images?.[0] && (
                    <div className="h-48 relative overflow-hidden bg-gray-100">
                      <img src={wl.event.images[0].url} alt={wl.event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    </div>
                  )}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 mb-3 border-0">On Waitlist</Badge>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                        {wl.event?.title || 'Unknown Event'}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4">
                        Status: <span className="font-semibold capitalize text-gray-900">{wl.status}</span>
                      </p>
                      {wl.status === 'notified' && (
                        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800 py-2">
                          <AlertDescription>Your spot has been secured! Check your email or events page to book.</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                Showing {((currentPage - 1) * ticketsPerPage) + 1} to {Math.min(currentPage * ticketsPerPage, totalTickets)} of {totalTickets} tickets
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0 text-xs sm:text-sm"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-gray-400 px-1">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className="w-8 h-8 p-0 text-xs sm:text-sm"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      {selectedTicket && (
        <QRCodeModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};

export default MyTickets;

