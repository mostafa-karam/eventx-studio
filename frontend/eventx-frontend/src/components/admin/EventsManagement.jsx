import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Filter,
  ArrowRight,
  Clock,
  Ticket
} from 'lucide-react';

const EventsManagement = ({ onCreateEvent, onEditEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [specificDate, setSpecificDate] = useState('');

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, categoryFilter, dateFrom, dateTo]);

  // When specificDate changes, constrain the range to that exact day
  useEffect(() => {
    if (specificDate) {
      setDateFrom(specificDate);
      setDateTo(specificDate);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  }, [specificDate]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`${API_BASE_URL}/events/admin/my-events?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events);
      } else {
        setError('Failed to load events');
      }
    } catch (error) {
      console.error('Events fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (evt) => {
    const current = evt.status || 'draft';
    const nextStatus = current === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`${API_BASE_URL}/events/${evt._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update status');
      }
      setEvents((prev) => prev.map((e) => (e._id === evt._id ? { ...e, status: nextStatus } : e)));
    } catch (e) {
      console.error('Publish toggle error:', e);
      setError(e.message || 'Failed to update status');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(eventId);
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setEvents(events.filter(event => event._id !== eventId));
      } else {
        setError('Failed to delete event');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Network error. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (event) => {
    if (event?.pricing?.type === 'free') {
      return 'Free';
    }
    return `$${event?.pricing?.amount ?? 0}`;
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);

    if (eventDate < now) {
      return { status: 'past', label: 'Past', color: 'bg-gray-100 text-gray-600' };
    } else if ((event?.seating?.availableSeats ?? 0) === 0) {
      return { status: 'sold-out', label: 'Sold Out', color: 'bg-red-100 text-red-600' };
    } else {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-600' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
            <p className="text-gray-600">Create, manage, and track your events</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview Mode
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={onCreateEvent}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{events.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-3xl font-bold text-green-600">{events.filter(e => e.status === 'published').length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Draft Events</p>
                <p className="text-3xl font-bold text-yellow-600">{events.filter(e => e.status === 'draft' || !e.status).length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Edit className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-3xl font-bold text-purple-600">{events.reduce((sum, e) => sum + (e.seating?.totalSeats || 0), 0)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Ticket className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Search events..." 
              className="pl-10 w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="music">🎵 Music</option>
            <option value="sports">🏆 Sports</option>
            <option value="conference">💼 Conference</option>
            <option value="workshop">🛠️ Workshop</option>
            <option value="festival">🎪 Festival</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>


      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Events Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first event to get started.'}
              </p>
              {!searchTerm && (
                <Button onClick={onCreateEvent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Event
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const eventStatus = getEventStatus(event);
                const totalSeats = event?.seating?.totalSeats ?? 0;
                const availableSeats = event?.seating?.availableSeats ?? 0;
                const soldSeats = Math.max(0, totalSeats - availableSeats);
                const eventEmoji = event.category === 'music' ? '🎵' : 
                                  event.category === 'sports' ? '🏆' : 
                                  event.category === 'conference' ? '💼' : 
                                  event.category === 'workshop' ? '🛠️' : 
                                  event.category === 'festival' ? '🎪' : '📅';
                
                return (
                  <div key={event._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                          {eventEmoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                            <Badge className={event.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {event.status === 'published' ? 'Published' : 'Draft'}
                            </Badge>
                            <Badge className={eventStatus.color}>
                              {eventStatus.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{event?.venue?.name || 'TBD'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{formatDate(event.date)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-green-600">{formatPrice(event)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-purple-500" />
                              <span className="text-sm text-gray-600">{soldSeats}/{totalSeats} tickets</span>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${totalSeats > 0 ? (soldSeats / totalSeats) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {soldSeats} of {totalSeats} tickets sold ({totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0}%)
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => togglePublish(event)}
                          className={event.status === 'published' ? 'text-yellow-600 border-yellow-600 hover:bg-yellow-50' : 'text-green-600 border-green-600 hover:bg-green-50'}
                        >
                          {event.status === 'published' ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onEditEvent(event)}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteEvent(event._id)}
                          disabled={deleteLoading === event._id}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {deleteLoading === event._id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsManagement;

