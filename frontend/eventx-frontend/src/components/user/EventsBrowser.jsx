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
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 border border-indigo-500/20 rounded-t-3xl p-8 shadow-xl relative overflow-hidden pb-16">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20 -ml-20 -mb-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-inner">
              <Grid3X3 className="w-7 h-7 text-indigo-100" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Discover Events</h1>
              <p className="text-indigo-200 mt-1 font-medium text-lg">Find your next unforgettable experience</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-indigo-100 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl shadow-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>{pagination.total} Events Available</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-9 w-9 p-0 ${viewMode === 'grid' ? 'bg-white text-indigo-900 hover:bg-white/90' : 'text-white hover:bg-white/20 hover:text-white'}`}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-9 w-9 p-0 ${viewMode === 'list' ? 'bg-white text-indigo-900 hover:bg-white/90' : 'text-white hover:bg-white/20 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters - Overlapping design */}
      <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-xl bg-white rounded-2xl relative z-20 -mt-10 mx-4 md:mx-8">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Search & Filters</h3>
              {getActiveFiltersCount() > 0 && (
                <Badge className="ml-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm border-0 font-bold px-2 py-0.5">
                  {getActiveFiltersCount()} active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold shadow-sm rounded-xl h-10 px-4"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Advanced
              </Button>
              {getActiveFiltersCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 px-4 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Main Search Bar */}
          <div className="flex flex-col xl:flex-row gap-4 items-start mb-2">
            <div className="flex-1 w-full">
              <div className="relative group shadow-sm">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                  <Search className="h-5 w-5" />
                </div>
                <Input
                  placeholder="Search for amazing events, venues, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 rounded-xl bg-gray-50/50 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-lg transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 h-14 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl bg-gray-50/50 shadow-inner font-medium text-gray-700">
                  <Filter className="h-4 w-4 mr-2 text-indigo-500" />
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
                <SelectTrigger className="w-44 h-14 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl bg-gray-50/50 shadow-inner font-medium text-gray-700">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
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
                <SelectTrigger className="w-44 h-14 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl bg-gray-50/50 shadow-inner font-medium text-gray-700">
                  <TrendingUp className="h-4 w-4 mr-2 text-indigo-500" />
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

              <div className="relative group shadow-sm">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="pl-12 pr-4 h-14 w-auto min-w-[176px] bg-gray-50/50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none font-medium text-gray-700 shadow-inner"
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
                    className="group cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 pb-0 rounded-2xl bg-white"
                    onClick={() => onEventSelect(event)}
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="relative w-full md:w-64 h-48 md:h-auto overflow-hidden flex-shrink-0">
                        {thumbnail ? (
                          <img src={thumbnail} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4 bg-gradient-to-br from-indigo-50 to-purple-50">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                              <Grid3X3 className="w-6 h-6 text-indigo-300" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-indigo-900">Event Image</p>
                              <p className="text-xs text-indigo-400 mt-1">Not Available</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <Badge className={`${eventStatus.color} shadow-md text-xs font-bold border-0 px-2.5 py-1 backdrop-blur-md bg-opacity-90`}>
                            {eventStatus.label}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-3 right-3 w-9 h-9 p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm rounded-full transition-all"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(event._id); }}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'} transition-transform`} />
                        </Button>
                      </div>

                      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 pr-6">
                              <h3 className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 tracking-tight">
                                {event.title}
                              </h3>
                              <p className="text-gray-600 text-sm md:text-base line-clamp-2 leading-relaxed">
                                {event.description}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xl md:text-2xl font-extrabold text-indigo-600 mb-1">
                                {formatPrice(event)}
                              </div>
                              <div className="flex items-center justify-end text-xs font-medium text-gray-500">
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                {event.analytics?.views || 0} views
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600 mt-6 mb-4">
                            <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                              <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                              {formatDate(event.date)}
                            </div>
                            <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg max-w-[200px] truncate">
                              <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                              <span className="truncate">{event?.venue?.city || event?.location?.address || 'Unknown city'}</span>
                            </div>
                            <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                              <Users className="h-4 w-4 mr-2 text-indigo-500" />
                              {(event?.seating?.availableSeats ?? 0)} left
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-semibold bg-white border-gray-200 text-gray-600 px-3 py-1 rounded-full">
                              {event.category}
                            </Badge>
                          </div>
                          <Button
                            onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                            disabled={eventStatus.status === 'past' || eventStatus.status === 'sold-out'}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-semibold px-6 rounded-xl transition-all group-hover:shadow-lg group-hover:-translate-y-0.5"
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
                  className="group cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white flex flex-col h-full rounded-2xl"
                  onClick={() => onEventSelect(event)}
                >
                  <div className="relative w-full h-56 bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden">
                    {thumbnail ? (
                      <img src={thumbnail} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6 group-hover:scale-105 transition-transform duration-700">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                          <Grid3X3 className="w-8 h-8 text-indigo-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-indigo-900">Event Image</p>
                          <p className="text-xs text-indigo-400 mt-1">Not Available</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${eventStatus.color} shadow-lg text-xs font-bold border-0 px-2.5 py-1 backdrop-blur-md bg-opacity-90`}>{eventStatus.label}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 right-3 w-9 h-9 p-0 bg-white/90 backdrop-blur-sm hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm rounded-full translate-y-2 group-hover:translate-y-0"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(event._id); }}
                    >
                      <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'} transition-transform`} />
                    </Button>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-indigo-900 font-extrabold px-3 py-1.5 rounded-lg shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      {formatPrice(event)}
                    </div>
                  </div>

                  <CardHeader className="pb-3 pt-5 flex-shrink-0">
                    <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-indigo-600 transition-colors tracking-tight text-gray-900">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-gray-500 text-sm leading-relaxed mt-1">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col justify-end">
                    <div className="space-y-3 text-sm font-medium text-gray-600 mb-5">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-indigo-400" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-indigo-400" />
                        <span className="truncate">{event?.venue?.city || event?.location?.address || 'Unknown city'}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-indigo-400" />
                        <span>{(event?.seating?.availableSeats ?? 0)} seats left</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto min-h-[52px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold bg-gray-50 border-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full">
                          {event.category}
                        </Badge>
                        <div className="flex items-center text-xs font-medium text-gray-400">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          {event.analytics?.views || 0}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-indigo-600 group-hover:hidden transition-all duration-300">
                        {formatPrice(event)}
                      </div>
                      <Button
                        onClick={(e) => { e.stopPropagation(); onEventSelect(event); }}
                        disabled={eventStatus.status === 'past' || eventStatus.status === 'sold-out'}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-4 rounded-lg hidden group-hover:flex transition-all duration-300 animate-in fade-in zoom-in-95"
                      >
                        {eventStatus.status === 'past' ? 'Past' :
                          eventStatus.status === 'sold-out' ? 'Sold Out' : 'View Event'}
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

