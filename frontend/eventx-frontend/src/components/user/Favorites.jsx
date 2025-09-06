import React, { useState, useEffect } from 'react';
import { Heart, Calendar, MapPin, Users, Clock, Star, TrendingUp, Grid3X3, Grid, List, Eye, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const Favorites = ({ onEventSelect }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      // Get favorites from localStorage - check both possible keys
      const eventFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
      const ticketFavorites = JSON.parse(localStorage.getItem('eventx_ticket_favorites') || '[]');

      // Combine both types of favorites
      const allFavorites = [...new Set([...eventFavorites, ...ticketFavorites])];

      if (allFavorites.length > 0) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('token');

        // Fetch full event details for favorited events
        const eventPromises = allFavorites.map(async (eventId) => {
          try {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (response.ok) {
              const data = await response.json();
              return data.data.event;
            }
            return null;
          } catch (error) {
            console.error('Error fetching event:', error);
            return null;
          }
        });

        const events = await Promise.all(eventPromises);
        setFavorites(events.filter(event => event !== null));
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (eventId) => {
    // Remove from both localStorage keys
    const eventFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
    const ticketFavorites = JSON.parse(localStorage.getItem('eventx_ticket_favorites') || '[]');

    const updatedEventFavorites = eventFavorites.filter(id => id !== eventId);
    const updatedTicketFavorites = ticketFavorites.filter(id => id !== eventId);

    localStorage.setItem('eventx_favorites', JSON.stringify(updatedEventFavorites));
    localStorage.setItem('eventx_ticket_favorites', JSON.stringify(updatedTicketFavorites));

    setFavorites(favorites.filter(event => event._id !== eventId));
  };

  const toggleFavorite = (eventId) => {
    const savedFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
    const isFavorited = savedFavorites.includes(eventId);

    if (isFavorited) {
      removeFavorite(eventId);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventEmoji = (category) => {
    const emojiMap = {
      'music': '🎵',
      'sports': '🏆',
      'conference': '💼',
      'workshop': '🛠️',
      'festival': '🎪',
      'theater': '🎭',
      'comedy': '😂',
      'food': '🍽️',
      'art': '🎨',
      'technology': '💻',
      'business': '📊',
      'education': '📚'
    };
    return emojiMap[category?.toLowerCase()] || '🎉';
  };

  // Filter and sort favorites
  const filteredAndSortedFavorites = favorites.filter(event => {
    if (!searchQuery) return true;
    return event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title?.localeCompare(b.title);
      case 'date':
        return new Date(a.date) - new Date(b.date);
      case 'price':
        return (a.pricing?.amount || 0) - (b.pricing?.amount || 0);
      default:
        return new Date(a.date) - new Date(b.date);
    }
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('date');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (sortBy !== 'date') count++;
    return count;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Enhanced Header Skeleton */}
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-xl p-6">
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

        {/* Enhanced Event Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-300 rounded-xl animate-pulse"></div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="flex justify-between items-center pt-3">
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
                <p className="text-gray-600">Events you've saved for later</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm">
              <Heart className="w-4 h-4" />
              <span className="font-medium">0 saved events</span>
            </div>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Favorite Events Yet</h3>
          <p className="text-gray-500 mb-6">
            Start exploring events and add them to your favorites by clicking the heart icon!
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
              <p className="text-gray-600">Events you've saved for later</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm">
              <Heart className="w-4 h-4" />
              <span className="font-medium">{favorites.length} saved events</span>
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
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white hover:bg-gray-50"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Controls */}
      {showFilters && (
        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-pink-600" />
                <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFiltersCount()} active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
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
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
                    <Eye className="h-5 w-5" />
                  </div>
                  <Input
                    placeholder="Search your favorite events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl bg-white border-gray-200 focus:border-pink-500 focus:ring-pink-500 text-base"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44 h-12 border-gray-200 focus:border-pink-500 rounded-xl">
                    <TrendingUp className="h-4 w-4 mr-2 text-gray-600" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Event Date</SelectItem>
                    <SelectItem value="title">Event Title</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Display */}
      {filteredAndSortedFavorites.length === 0 ? (
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matching favorites</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search criteria.</p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
        }>
          {filteredAndSortedFavorites.map((event) => {
            const thumbnail = (event?.images && event.images[0]?.url) || null;

            if (viewMode === 'list') {
              return (
                <Card key={event._id} className="hover:shadow-lg transition-all duration-200">
                  <div className="flex">
                    <div className="relative w-48 h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                      {thumbnail ? (
                        <img src={thumbnail} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4">
                          <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-2">
                            <span className="text-2xl">{getEventEmoji(event.category)}</span>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-600">Event Image</p>
                            <p className="text-xs text-gray-400 mt-1">Not Available</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-pink-100 text-pink-600 shadow-sm text-xs">
                          <Heart className="h-3 w-3 mr-1 fill-current" />
                          Favorite
                        </Badge>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(event._id);
                        }}
                        className="absolute top-2 right-2 w-8 h-8 p-0 bg-white/80 hover:bg-white rounded-full shadow-sm"
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </button>
                    </div>

                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-pink-600 transition-colors mb-1">
                            {event.title}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {event.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-green-600 mb-1">
                            {event.pricing?.type === 'free' ? 'Free' : `$${event.pricing?.amount}`}
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
                          {formatDate(event.date)} at {formatTime(event.date)}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.venue?.name}, {event.venue?.city}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          {event.seating?.availableSeats || 0} seats
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.category || 'General'}
                          </Badge>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventSelect(event);
                          }}
                          size="sm"
                          className="bg-pink-600 hover:bg-pink-700"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            }

            // Grid view
            return (
              <Card key={event._id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                  {thumbnail ? (
                    <img src={thumbnail} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-6">
                      <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                        <span className="text-3xl">{getEventEmoji(event.category)}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Event Image</p>
                        <p className="text-xs text-gray-400 mt-1">Not Available</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-pink-100 text-pink-600 shadow-sm">
                      <Heart className="h-3 w-3 mr-1 fill-current" />
                      Favorite
                    </Badge>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(event._id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-sm"
                  >
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {event.pricing?.type === 'free' ? 'Free' : `$${event.pricing?.amount}`}
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-pink-600 transition-colors">
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
                      <span className="text-xs">{formatDate(event.date)} at {formatTime(event.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-xs truncate">
                        {event.venue?.name}, {event.venue?.city}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-xs">{event.seating?.availableSeats || 0} seats available</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {event.category || 'General'}
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <Eye className="h-3 w-3 mr-1" />
                        {event.analytics?.views || 0}
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventSelect(event);
                      }}
                      size="sm"
                      className="bg-pink-600 hover:bg-pink-700 text-xs"
                    >
                      View
                    </Button>
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

export default Favorites;
