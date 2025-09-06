import React, { useState, useEffect, useCallback } from 'react';
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
  SlidersHorizontal,
  Heart,
  List,
  Grid,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Bookmark
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

  // New state for enhanced features
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [favorites, setFavorites] = useState(new Set());
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
    setFavorites(new Set(savedFavorites));
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter, sortBy, cityFilter, dateFrom, dateTo, priceRange, pagination.current]);

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
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (sortBy) params.append('sort', sortBy);
      if (cityFilter && cityFilter !== 'all') params.append('city', cityFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (priceRange.min) params.append('priceMin', priceRange.min);
      if (priceRange.max) params.append('priceMax', priceRange.max);
      params.append('page', pagination.current);
      params.append('limit', 12);

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
        setPagination(data.data.pagination);
        setError('');
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

  const toggleFavorite = (eventId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(eventId)) {
      newFavorites.delete(eventId);
    } else {
      newFavorites.add(eventId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('eventx_favorites', JSON.stringify([...newFavorites]));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setCityFilter('all');
    setDateFrom('');
    setDateTo('');
    setSpecificDate('');
    setPriceRange({ min: '', max: '' });
    setPagination({ current: 1, pages: 1, total: 0 });
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current: newPage }));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (categoryFilter !== 'all') count++;
    if (cityFilter !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (priceRange.min || priceRange.max) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div>
                <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 h-11 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex gap-3">
                <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-300 rounded-xl animate-pulse"></div>
              </div>
              <CardHeader className="pb-2">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
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
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Grid3X3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Browse Events</h1>
              <p className="text-gray-600">Discover amazing events and book your tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{pagination.total} Events Available</span>
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
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
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
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
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
                  placeholder="Search events, venues, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-xl bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-base"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 h-12 border-gray-200 focus:border-blue-500 rounded-xl">
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
                <SelectTrigger className="w-44 h-12 border-gray-200 focus:border-blue-500 rounded-xl">
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
                <SelectTrigger className="w-44 h-12 border-gray-200 focus:border-blue-500 rounded-xl">
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
                  className="pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 focus:outline-none h-12"
                />
              </div>
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
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                      className="h-10 rounded-lg"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                      className="h-10 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Events Display */}
      {events.length === 0 && !loading ? (
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search criteria or check back later.</p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Events Grid/List */}
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {events.map((event) => {
              const eventStatus = getEventStatus(event);
              const thumbnail = (event?.images && event.images[0]?.url) || null;
              const isFavorite = favorites.has(event._id);

              if (viewMode === 'list') {
                return (
                  <Card
                    key={event._id}
                    className="group cursor-pointer overflow-hidden border hover:shadow-lg transition-all duration-200 pb-2"
                    onClick={() => onEventSelect(event)}
                  >
                    <div className="flex">
                      <div className="relative w-48 h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                        {thumbnail ? (
                          <img src={thumbnail} alt={event.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4">
                            <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-2">
                              <Grid3X3 className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-medium text-gray-600">Event Image</p>
                              <p className="text-xs text-gray-400 mt-1">Not Available</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge className={`${eventStatus.color} shadow-sm text-xs`}>{eventStatus.label}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 w-8 h-8 p-0 bg-white/80 hover:bg-white"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(event._id); }}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                        </Button>
                      </div>

                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                              {event.title}
                            </h3>
                            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                              {event.description}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-blue-600 mb-1">
                              {formatPrice(event)}
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Eye className="h-3 w-3 mr-1" />
                              {event.analytics?.views || 0} views
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
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

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {event.category}
                            </Badge>
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
                    </div>
                  </Card>
                );
              }

              // Grid view
              return (
                <Card
                  key={event._id}
                  className="group cursor-pointer overflow-hidden border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  onClick={() => onEventSelect(event)}
                >
                  <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                    {thumbnail ? (
                      <img src={thumbnail} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-6">
                        <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                          <Grid3X3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-600">Event Image</p>
                          <p className="text-xs text-gray-400 mt-1">Not Available</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${eventStatus.color} shadow-sm`}>{eventStatus.label}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 right-3 w-8 h-8 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(event._id); }}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    </Button>
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      {formatPrice(event)}
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-gray-600 text-sm">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-xs">{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-xs">{event?.venue?.city || 'Unknown city'}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-xs">{(event?.seating?.availableSeats ?? 0)} seats left</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {event.category}
                        </Badge>
                        <div className="flex items-center text-xs text-gray-500">
                          <Eye className="h-3 w-3 mr-1" />
                          {event.analytics?.views || 0}
                        </div>
                      </div>
                      <Button
                        onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                        disabled={eventStatus.status === 'past' || eventStatus.status === 'sold-out'}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-xs"
                      >
                        {eventStatus.status === 'past' ? 'Past' :
                          eventStatus.status === 'sold-out' ? 'Sold Out' : 'View'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current - 1)}
                disabled={pagination.current === 1}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.current === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current + 1)}
                disabled={pagination.current === pagination.pages}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventsBrowser;

