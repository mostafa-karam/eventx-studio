import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock,
  ArrowLeft,
  Share2,
  Heart,
  Ticket,
  Info,
  Star,
  CheckCircle
} from 'lucide-react';

const EventDetails = ({ event, onBack, onBookTicket }) => {
  const [loading, setLoading] = useState(false);
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showSeatSelection, setShowSeatSelection] = useState(false);

  const { user, token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (event) => {
    if (event.pricing.type === 'free') {
      return 'Free';
    }
    return `$${event.pricing.amount}`;
  };

  const getTotalPrice = () => {
    if (event.pricing.type === 'free') {
      return 0;
    }
    return event.pricing.amount * bookingQuantity;
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);
    
    if (eventDate < now) {
      return { status: 'past', label: 'Past Event', color: 'bg-gray-100 text-gray-600' };
    } else if (event.seating.availableSeats === 0) {
      return { status: 'sold-out', label: 'Sold Out', color: 'bg-red-100 text-red-600' };
    } else if (event.seating.availableSeats < event.seating.totalSeats * 0.1) {
      return { status: 'limited', label: 'Limited Seats', color: 'bg-orange-100 text-orange-600' };
    } else {
      return { status: 'available', label: 'Available', color: 'bg-green-100 text-green-600' };
    }
  };

  const handleBooking = async () => {
    if (!user) {
      alert('Please log in to book tickets');
      return;
    }

    setLoading(true);
    try {
      // Ensure we have seat map to select seat numbers
      let eventDetails = event;
      if (!event?.seating?.seatMap || !Array.isArray(event.seating.seatMap)) {
        const res = await fetch(`${API_BASE_URL}/events/${event._id}`);
        if (!res.ok) throw new Error('Failed to load event details for booking');
        const data = await res.json();
        eventDetails = data?.data?.event || event;
      }

      const seatMap = eventDetails?.seating?.seatMap || [];
      if (!seatMap.length) throw new Error('No seats available for booking');

      // Pick seats: if user selected seats, use first; else pick first available
      const seatsToBook = selectedSeats?.length
        ? [selectedSeats[0]]
        : (seatMap.find(s => !s.isBooked)?.seatNumber ? [seatMap.find(s => !s.isBooked).seatNumber] : []);

      if (!seatsToBook.length) throw new Error('No available seats to book');

      const response = await fetch(`${API_BASE_URL}/tickets/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId: event._id,
          seatNumber: seatsToBook[0],
          paymentMethod: event.pricing.type === 'free' ? 'free' : 'card'
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Booking failed');
      }

      // Navigate to My Tickets tab
      onBookTicket?.({ ticket: result?.data?.ticket });
    } catch (error) {
      console.error('Booking error:', error);
      alert(error.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const eventStatus = getEventStatus(event);
  const canBook = eventStatus.status === 'available' || eventStatus.status === 'limited';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Heart className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <Badge className={eventStatus.color}>
                  {eventStatus.label}
                </Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Star className="h-4 w-4 mr-1" />
                  {event.analytics?.views || 0} views
                </div>
              </div>
              
              <CardTitle className="text-3xl font-bold">{event.title}</CardTitle>
              <CardDescription className="text-lg">
                {event.description}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-blue-600" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-3 text-red-600" />
                  <div>
                    <p className="font-medium">Venue</p>
                    <p className="text-sm text-gray-600">
                      {event.venue.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {event.venue.address}, {event.venue.city}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3 text-green-600" />
                  <div>
                    <p className="font-medium">Capacity</p>
                    <p className="text-sm text-gray-600">
                      {event.seating.availableSeats} of {event.seating.totalSeats} seats available
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-3 text-purple-600" />
                  <div>
                    <p className="font-medium">Price</p>
                    <p className="text-sm text-gray-600">{formatPrice(event)}</p>
                  </div>
                </div>
              </div>
              
              {event.category && (
                <div className="pt-4">
                  <p className="font-medium mb-2">Category</p>
                  <Badge variant="secondary">{event.category}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organizer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Event Organizer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{event.organizer?.name || 'EventX Studio'}</p>
                  <p className="text-sm text-gray-600">Event Organizer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ticket className="h-5 w-5 mr-2" />
                Book Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user && (
                <Alert>
                  <AlertDescription>
                    Please log in to book tickets for this event.
                  </AlertDescription>
                </Alert>
              )}

              {canBook && user && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Number of Tickets
                    </label>
                    <select
                      value={bookingQuantity}
                      onChange={(e) => setBookingQuantity(parseInt(e.target.value))}
                      className="w-full p-2 border rounded-md"
                      max={Math.min(10, event.seating.availableSeats)}
                    >
                      {[...Array(Math.min(10, event.seating.availableSeats))].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'ticket' : 'tickets'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Ticket Price:</span>
                      <span>{formatPrice(event)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{bookingQuantity}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>
                        {event.pricing.type === 'free' ? 'Free' : `$${getTotalPrice()}`}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleBooking}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Processing...' : 'Book Now'}
                  </Button>

                  <div className="text-xs text-gray-500 text-center">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Secure booking with instant confirmation
                  </div>
                </>
              )}

              {!canBook && (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-2">
                    {eventStatus.status === 'past' ? 'This event has already passed' : 'This event is sold out'}
                  </p>
                  <Button disabled className="w-full">
                    {eventStatus.status === 'past' ? 'Event Ended' : 'Sold Out'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Event Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Views:</span>
                <span className="font-medium">{event.analytics?.views || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tickets Sold:</span>
                <span className="font-medium">
                  {event.seating.totalSeats - event.seating.availableSeats}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Availability:</span>
                <span className="font-medium">
                  {Math.round((event.seating.availableSeats / event.seating.totalSeats) * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

