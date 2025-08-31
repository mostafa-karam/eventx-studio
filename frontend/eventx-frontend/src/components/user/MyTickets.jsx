import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import {
  Calendar,
  MapPin,
  Ticket,
  Download,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.data.tickets);
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

  const categorizeTickets = () => {
    const now = new Date();
    return {
      upcoming: tickets.filter(ticket =>
        ticket.event && ticket.event.date && new Date(ticket.event.date) > now &&
        ticket.status !== 'cancelled'
      ),
      past: tickets.filter(ticket =>
        (!ticket.event) || (ticket.event && ticket.event.date && new Date(ticket.event.date) <= now) ||
        (ticket.checkIn && ticket.checkIn.isCheckedIn)
      ),
      cancelled: tickets.filter(ticket => ticket.status === 'cancelled')
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

  const TicketCard = ({ ticket }) => {
    const ticketStatus = getTicketStatus(ticket);
    const StatusIcon = ticketStatus.icon;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Badge className={ticketStatus.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {ticketStatus.label}
            </Badge>
            <span className="text-sm text-gray-500">
              #{ticket.ticketNumber || ticket.ticketId || ticket._id}
            </span>
          </div>
          <CardTitle className="text-lg">{ticket.event?.title || 'Unknown Event'}</CardTitle>
          <CardDescription>
            Booked on {formatDate(ticket.bookingDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              {formatDate(ticket.event?.date)}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              {ticket.event?.venue ? `${ticket.event.venue.name}, ${ticket.event.venue.city}` : 'Venue TBA'}
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="text-lg font-bold">
                {ticket.payment?.amount === 0 || !ticket.payment?.amount ? 'Free' : `$${ticket.payment.amount}`}
              </div>

              <div className="flex space-x-2">
                {ticket.status !== 'cancelled' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      QR Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQrFromDataUrl(ticket.qrCodeImage, `ticket-${ticket._id}.png`)}
                      disabled={!ticket.qrCodeImage}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download QR
                    </Button>
                  </>
                )}
                {canCancelTicket(ticket) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelTicket(ticket._id)}
                    disabled={cancelLoadingId === ticket._id}
                  >
                    {cancelLoadingId === ticket._id ? 'Cancelling...' : 'Cancel'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const QRCodeModal = ({ ticket, onClose }) => {
    if (!ticket) return null;

    return (
      <Dialog open={!!ticket} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Ticket QR Code</DialogTitle>
            <DialogDescription>{ticket.event?.title}</DialogDescription>
          </DialogHeader>

          <div className="text-center py-4">
            {ticket.qrCodeImage ? (
              <img src={ticket.qrCodeImage} alt="Ticket QR Code" className="w-48 h-48 mx-auto mb-4" />
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">QR Code</p>
                  <p className="text-xs text-gray-400">{ticket.qrCode}</p>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 mb-4">
              <p className="font-medium">{ticket.event?.title}</p>
              <p>{formatDate(ticket.event?.date)}</p>
              <p>Ticket #{ticket.ticketNumber}</p>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => downloadQrFromDataUrl(ticket.qrCodeImage, `ticket-${ticket._id}.png`)}
                className="flex-1"
                disabled={!ticket.qrCodeImage}
              >
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              <Button onClick={onClose} className="flex-1">Close</Button>
            </div>
          </div>
          <DialogClose />
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Tickets</CardTitle>
              <CardDescription>Manage and view all your event tickets in one place.</CardDescription>
            </div>
            <div className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
              {tickets?.length || 0} total
            </div>
          </div>
        </CardHeader>
      </Card>

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
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
              <p className="text-gray-500">Book tickets for events to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categorizedTickets.upcoming.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          {categorizedTickets.past.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No past events</h3>
              <p className="text-gray-500">Your attended events will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categorizedTickets.past.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-6">
          {categorizedTickets.cancelled.length === 0 ? (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cancelled tickets</h3>
              <p className="text-gray-500">Cancelled tickets will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categorizedTickets.cancelled.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

