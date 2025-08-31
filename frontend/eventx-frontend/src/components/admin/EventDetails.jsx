import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Edit,
  Users,
  Ticket,
  Star,
  QrCode
} from 'lucide-react';

const EventDetails = ({ eventId, onBack, onEdit }) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvent(data.data);
      } else {
        setError('Failed to load event details');
      }
    } catch (error) {
      console.error('Event details fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeatColor = (seat) => {
    if (seat.isBooked) return 'bg-purple-600';
    return 'bg-gray-200';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const endDate = new Date(date.getTime() + 4 * 60 * 60 * 1000); // Add 4 hours
    return `${date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    })} - ${endDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  };

  const formatPrice = (event) => {
    if (event?.pricing?.type === 'free') {
      return 'Free';
    }
    return `$${event?.pricing?.amount || 0}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Event not found</h3>
          <p className="text-gray-500 mb-4">The requested event could not be found.</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const totalSeats = event?.seating?.totalSeats || 0;
  const availableSeats = event?.seating?.availableSeats || 0;
  const soldSeats = Math.max(0, totalSeats - availableSeats);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Event Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Information */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={event.title}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => onEdit(event)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={formatDate(event.date)}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm">
                      <Calendar className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Venue
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={`${event.venue?.name || 'Unknown venue'}, ${event.venue?.city || 'Unknown city'}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm">
                      <MapPin className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Time
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={formatTime(event.date)}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm">
                      <Clock className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Description */}
          <Card>
            <CardContent className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Description
              </label>
              <textarea 
                value={event.description}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32 text-sm"
              />
            </CardContent>
          </Card>

          {/* Event Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Ticket className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600">Ticket Price</p>
                <p className="text-lg font-bold">{formatPrice(event)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Seat Amount</p>
                <p className="text-lg font-bold">{totalSeats}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">Available Seats</p>
                <p className="text-lg font-bold">{availableSeats}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-sm font-bold text-yellow-600">{event.status || 'Draft'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Seat Allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Seat Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    <span className="text-sm">Booked Seats</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span className="text-sm">Available</span>
                  </div>
                </div>
              </div>
              
              {event.seating?.seatMap && event.seating.seatMap.length > 0 ? (
                <div className="grid grid-cols-12 gap-1 max-w-md">
                  {event.seating.seatMap.slice(0, 64).map((seat, index) => (
                    <div
                      key={seat.seatNumber || index}
                      className={`w-6 h-6 rounded ${getSeatColor(seat)} cursor-pointer hover:opacity-80 transition-opacity`}
                      title={`${seat.seatNumber} - ${seat.isBooked ? 'Booked' : 'Available'}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Seat map not available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Tags and Category */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-gray-100">
                      {event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : 'Other'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(event)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {event.tags && event.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-2">
                        {event.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="bg-gray-100">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Attendance
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={`${soldSeats}/${totalSeats}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm">
                      <Users className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Analytics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Views</span>
                  <span className="text-sm font-semibold">{event.analytics?.views || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Bookings</span>
                  <span className="text-sm font-semibold">{event.analytics?.bookings || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="text-sm font-semibold">${event.analytics?.revenue || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Scan QR code for easy payments</p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => onEdit(event)}
            >
              EDIT
            </Button>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Attendee Insights
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
