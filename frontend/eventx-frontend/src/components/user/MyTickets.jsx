import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  Heart
} from 'lucide-react';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
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
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(6);
  const [totalTickets, setTotalTickets] = useState(0);

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async (page = 1, status = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ticketsPerPage.toString(),
        ...(status !== 'all' && { status })
      });

      const response = await fetch(`${API_BASE_URL}/tickets/my-tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
        ticket.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
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
        headers: {
          'Authorization': `Bearer ${token}`,
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

  const downloadQrFromDataUrl = (dataUrl, filename) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      const cancelPromises = selectedTickets.map(ticketId =>
        fetch(`${API_BASE_URL}/tickets/${ticketId}/cancel`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
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
      if (ticket?.qrCodeImage) {
        downloadQrFromDataUrl(ticket.qrCodeImage, `ticket-${ticketId}.png`);
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
      'Ticket Number': ticket.ticketNumber || ticket._id.slice(-8),
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
    const savedFavorites = JSON.parse(localStorage.getItem('eventx_ticket_favorites') || '[]');
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
        <Card className={`hover:shadow-lg transition-all duration-200 pb-0 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
          <div className="flex">
            <div className="relative w-48 h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
              {thumbnail ? (
                <img src={thumbnail} alt={ticket.event?.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-2">
                    <Ticket className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-600">Event Image</p>
                    <p className="text-xs text-gray-400 mt-1">Not Available</p>
                  </div>
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Badge className={`${ticketStatus.color} shadow-sm text-xs`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {ticketStatus.label}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 w-8 h-8 p-0 bg-white/80 hover:bg-white"
                onClick={(e) => { e.stopPropagation(); toggleFavorite(ticket._id); }}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              </Button>
            </div>

            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectTicket(ticket._id)}
                      className="mt-1 w-5 h-5 border-2 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white"
                    />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {ticket.event?.title || 'Unknown Event'}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      Booked on {formatDate(ticket.bookingDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-green-600 mb-1">
                    {ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    #{ticket.ticketNumber || ticket._id.slice(-8)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(ticket.event?.date)}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {ticket.event?.venue ? `${ticket.event.venue.name}, ${ticket.event.venue.city}` : 'Venue TBA'}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Seat: {ticket.seatNumber || 'N/A'}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
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
                        className="h-8 px-3"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQrFromDataUrl(ticket.qrCodeImage, `ticket-${ticket._id}.png`)}
                        disabled={!ticket.qrCodeImage}
                        className="h-8 px-3"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </>
                  )}
                  {canCancelTicket(ticket) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelTicket(ticket._id)}
                      disabled={cancelLoadingId === ticket._id}
                      className="h-8 px-3"
                    >
                      {cancelLoadingId === ticket._id ? '...' : 'Cancel'}
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
      <Card className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
        <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
          {thumbnail ? (
            <img src={thumbnail} alt={ticket.event?.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-6">
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                <Ticket className="w-8 h-8 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Event Image</p>
                <p className="text-xs text-gray-400 mt-1">Not Available</p>
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge className={`${ticketStatus.color} shadow-sm`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {ticketStatus.label}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 w-8 h-8 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); toggleFavorite(ticket._id); }}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </Button>
          <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`}
          </div>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between mb-2">
            <div className="relative">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleSelectTicket(ticket._id)}
                className="mt-1 w-5 h-5 border-2 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white"
              />
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 font-mono">
                #{ticket.ticketNumber || ticket._id.slice(-8)}
              </span>
            </div>
          </div>
          <CardTitle className="text-base font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
            {ticket.event?.title || 'Unknown Event'}
          </CardTitle>
          <CardDescription className="text-sm">
            Booked on {formatDate(ticket.bookingDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-xs">{formatDate(ticket.event?.date)}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-xs truncate">
                {ticket.event?.venue ? `${ticket.event.venue.name}, ${ticket.event.venue.city}` : 'Venue TBA'}
              </span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-xs">Seat: {ticket.seatNumber || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {ticket.event?.category || 'General'}
              </Badge>
            </div>
            <div className="flex space-x-1">
              {ticket.status !== 'cancelled' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTicket(ticket)}
                    className="h-8 px-2 text-xs"
                  >
                    <QrCode className="h-3 w-3 mr-1" />
                    QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQrFromDataUrl(ticket.qrCodeImage, `ticket-${ticket._id}.png`)}
                    disabled={!ticket.qrCodeImage}
                    className="h-8 px-2 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                </>
              )}
              {canCancelTicket(ticket) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelTicket(ticket._id)}
                  disabled={cancelLoadingId === ticket._id}
                  className="h-8 px-2 text-xs"
                >
                  {cancelLoadingId === ticket._id ? '...' : 'Cancel'}
                </Button>
              )}
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
                onClick={() => downloadQrFromDataUrl(ticket.qrCodeImage, `ticket-${ticket._id}.png`)}
                disabled={!ticket.qrCodeImage}
                className="flex items-center justify-center h-12"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            Upcoming ({categorizedTickets.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({categorizedTickets.past.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({categorizedTickets.cancelled.length})
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

