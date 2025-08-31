import React, { useState, useEffect } from 'react';
import { Heart, Calendar, MapPin, Users, Clock, Star, TrendingUp, Grid3X3 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const Favorites = ({ onEventSelect }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      // Get favorites from localStorage for now
      const savedFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
      
      if (savedFavorites.length > 0) {
        // Fetch full event details for favorited events
        const eventPromises = savedFavorites.map(async (eventId) => {
          try {
            const response = await fetch(`/api/events/${eventId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (eventId) => {
    const savedFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
    const updatedFavorites = savedFavorites.filter(id => id !== eventId);
    localStorage.setItem('eventx_favorites', JSON.stringify(updatedFavorites));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Favorites</CardTitle>
                <p className="text-sm text-gray-500">Events you've saved for later</p>
              </div>
              <div className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
                0 saved
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="text-center py-12">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Favorite Events Yet</h2>
          <p className="text-gray-600 mb-6">
            Start exploring events and add them to your favorites by clicking the heart icon!
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Favorites</CardTitle>
              <p className="text-sm text-gray-500">Events you've saved for later</p>
            </div>
            <div className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
              {favorites.length} saved
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((event) => (
          <Card key={event._id} className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-0">
              <div className="relative">
                {/* Event Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-4xl">{getEventEmoji(event.category)}</span>
                </div>
                
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(event._id);
                  }}
                  className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Heart className="w-5 h-5 text-red-500 fill-current" />
                </button>

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status === 'published' ? 'Live' : event.status}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {event.description}
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(event.date)} at {formatTime(event.date)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.venue?.name}, {event.venue?.city}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{event.seating?.availableSeats || 0} seats available</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-green-600">
                    {event.pricing?.type === 'free' ? 'Free' : `$${event.pricing?.amount}`}
                  </div>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventSelect(event);
                    }}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    View Details
                  </Button>
                </div>

                {/* Event Stats */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-500">
                    <Star className="w-3 h-3 mr-1" />
                    <span>{event.analytics?.views || 0} views</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Added to favorites</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Favorites;
