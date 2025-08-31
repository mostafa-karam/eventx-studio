import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Search,
  Filter,
  Clock,
  Star,
  TrendingUp,
  Grid3X3,
  SlidersHorizontal
} from 'lucide-react';

const EventsBrowser = ({ onEventSelect }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [filters, setFilters] = useState({
    categories: [],
    cities: []
  });
  const [cityFilter, setCityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [specificDate, setSpecificDate] = useState('');

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, categoryFilter, sortBy, cityFilter, dateFrom, dateTo]);

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
      if (sortBy) params.append('sort', sortBy);
      if (cityFilter && cityFilter !== 'all') params.append('city', cityFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);


      const response = await fetch(`${API_BASE_URL}/events?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events);
        setFilters(data.data.filters);
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
      return { status: 'past', label: 'Past Event', color: 'bg-gray-100 text-gray-600' };
    } else if ((event?.seating?.availableSeats ?? 0) === 0) {
      return { status: 'sold-out', label: 'Sold Out', color: 'bg-red-100 text-red-600' };
    } else if ((event?.seating?.availableSeats ?? 0) < ((event?.seating?.totalSeats ?? 0) * 0.1)) {
      return { status: 'limited', label: 'Limited Seats', color: 'bg-orange-100 text-orange-600' };
    } else {
      return { status: 'available', label: 'Available', color: 'bg-green-100 text-green-600' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
      {/* Header - flat, consistent with layout */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Browse Events</h1>
              <p className="text-gray-500">Find and book tickets for events around you</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{events.length} Events Available</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400"><Search className="h-5 w-5" /></div>
                <Input
                  placeholder="Search events, venues, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-11 rounded-lg bg-white border-gray-200 focus:border-blue-600 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 border-gray-200 focus:border-blue-600">
                  <Filter className="h-4 w-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(filters.categories || [])
                    .filter((category) => typeof category === 'string' && category.trim().length > 0)
                    .map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-40 border-gray-200 focus:border-blue-600">
                  <MapPin className="h-4 w-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {(filters.cities || [])
                    .filter((city) => typeof city === 'string' && city.trim().length > 0)
                    .map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 border-gray-200 focus:border-blue-600">
                  <TrendingUp className="h-4 w-4 mr-2 text-gray-600" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Events Grid */}
      {events.length === 0 && !loading ? (
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => {
            const eventStatus = getEventStatus(event);
            const thumbnail = (event?.images && event.images[0]?.url) || null;
            return (
              <Card
                key={event._id}
                className="group cursor-pointer overflow-hidden border hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
                onClick={() => onEventSelect(event)}
              >
                <div className="relative w-full h-48 bg-gray-100">
                  {thumbnail ? (
                    <img src={thumbnail} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Grid3X3 className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className={`${eventStatus.color} shadow-sm`}>{eventStatus.label}</Badge>
                  </div>
                  
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-1 text-gray-600">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {event?.venue?.city || 'Unknown city'}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {(event?.seating?.availableSeats ?? 0)} left
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-sm font-semibold">
                      {formatPrice(event)}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center text-xs text-gray-500">
                        <Star className="h-3 w-3 mr-1 text-yellow-500" />
                        {event.analytics?.views || 0}
                      </div>
                      <Button
                        onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                        disabled={eventStatus.status === 'past' || eventStatus.status === 'sold-out'}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {eventStatus.status === 'past' ? 'Past Event' :
                          eventStatus.status === 'sold-out' ? 'Sold Out' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsBrowser;

