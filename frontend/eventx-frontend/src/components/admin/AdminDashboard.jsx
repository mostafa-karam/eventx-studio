import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Calendar,
  Users,
  DollarSign,
  Ticket,
  Bell,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = ({ onTabChange }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState(null);

  const { token, user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const { overview } = dashboardData || {};

  // Use API-provided series when available; otherwise render empty states
  const revenueData = Array.isArray(dashboardData?.revenueData) && dashboardData.revenueData.length > 0
    ? dashboardData.revenueData
    : null;
  const eventCategories = Array.isArray(dashboardData?.eventCategories) && dashboardData.eventCategories.length > 0
    ? dashboardData.eventCategories
    : null;
  const notifications = Array.isArray(dashboardData?.notifications)
    ? dashboardData.notifications
    : [];

  // Filter notifications based on selected filter
  const filteredNotifications = activityFilter === 'all'
    ? notifications
    : notifications.filter(notification => notification.type === activityFilter);

  // Match Figma KPIs: Events, Bookings, Revenue
  const stats = [
    {
      title: 'Events',
      value: `${overview?.totalEvents || 0} Events`,
      icon: Calendar,
      description: `${overview?.activeEvents || 0} active`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Bookings',
      value: (overview?.totalTicketsSold || 0).toLocaleString(),
      icon: Ticket,
      description: 'Total tickets',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Revenue',
      value: `$${(overview?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      description: `Avg ${(overview?.averageTicketPrice || 0) > 0 ? `$${(overview?.averageTicketPrice || 0).toFixed(0)}` : 'Free'}/ticket`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  // Events derived from API
  const events = Array.isArray(dashboardData?.topPerformers?.events)
    ? dashboardData.topPerformers.events
    : [];
  const upcomingEvents = events
    .filter((e) => (e?.date ? new Date(e.date) > new Date() : false))
    .slice(0, 5);

  // Get all events for selection
  const allEvents = dashboardData?.allEvents || events || [];

  // Get selected event or default to latest
  const selectedEvent = selectedEventId
    ? allEvents.find(e => e._id === selectedEventId)
    : (dashboardData?.latestEventAnalytics || allEvents.reduce((latest, e) => {
      const d = e?.date ? new Date(e.date) : null;
      const ld = latest?.date ? new Date(latest.date) : null;
      if (!d) return latest;
      if (!ld) return e;
      return d > ld ? e : latest;
    }, null));

  const latestEvent = selectedEvent;

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section (Figma style) */}
      <div className="bg-black text-white p-5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-white">Welcome {user?.name || 'Admin'}</h1>
              <p className="text-xs md:text-sm text-gray-300">{user?.role ? String(user.role).replace(/\b\w/g, c => c.toUpperCase()) : 'System Administrator'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => onTabChange && onTabChange('notifications')}>
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.title}</p>
                    <p className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NET SALES (line chart) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <span className="font-bold">NET SALES</span>
              </CardTitle>
              <div className="space-x-2">
                <Button variant="outline" size="sm">Filter</Button>
                <Button variant="outline" size="sm">Weekly</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-lg font-bold text-green-600">{`$${(overview?.totalRevenue || 0).toLocaleString()}`}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Tickets</p>
                <p className="text-lg font-bold text-blue-600">{overview?.totalTicketsSold || 0}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg. Price</p>
                <p className="text-lg font-bold text-purple-600">{(overview?.averageTicketPrice || 0) > 0 ? `$${(overview?.averageTicketPrice || 0).toFixed(0)}` : 'Free'}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueData ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#DC2626' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
                <TrendingUp className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm">No revenue data available</p>
                <p className="text-xs">Data will appear once you have events with sales</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Engagement (donut) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Customer Engagement</CardTitle>
            <CardDescription className="text-center">Engagement distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {eventCategories ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={eventCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {eventCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
                  {eventCategories.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][index % 6] }} />
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <Calendar className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm">No engagement data available</p>
                <p className="text-xs">Create events to see engagement distribution</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Event, Upcoming Events & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[750px]">
        {/* Latest Event - Enhanced */}
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Event Details</span>
              </CardTitle>
              {latestEvent && (
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${latestEvent.date && new Date(latestEvent.date) > new Date()
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                    }`}>
                    {latestEvent.date && new Date(latestEvent.date) > new Date() ? 'Upcoming' : 'Past'}
                  </div>
                </div>
              )}
            </div>
            {allEvents.length > 1 && (
              <div className="mt-3">
                <Select value={selectedEventId || ''} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an event to view details" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEvents.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{event.title}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            {latestEvent ? (
              <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                {/* Event Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{latestEvent.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{latestEvent.date ? new Date(latestEvent.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '—'}</span>
                        </div>
                        {latestEvent.venue?.name && (
                          <div className="flex items-center space-x-1">
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>{latestEvent.venue.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTabChange && onTabChange('events')}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Tickets Sold</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {latestEvent.analytics?.ticketsSold || (latestEvent.seating ? (latestEvent.seating.totalSeats || 0) - (latestEvent.seating.availableSeats || 0) : 0)}
                        </p>
                        {latestEvent.analytics?.totalRevenue !== undefined && (
                          <p className="text-xs text-blue-600 mt-1">
                            {(latestEvent.analytics.totalRevenue || 0) > 0 ? `$${latestEvent.analytics.totalRevenue.toLocaleString()} revenue` : 'Free event'}
                          </p>
                        )}
                      </div>
                      <Ticket className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Occupancy Rate</p>
                        <p className="text-2xl font-bold text-green-800">
                          {latestEvent.analytics?.occupancyRate || (latestEvent.seating && latestEvent.seating.totalSeats > 0
                            ? Math.round(((latestEvent.seating.totalSeats - latestEvent.seating.availableSeats) / latestEvent.seating.totalSeats) * 100)
                            : 0)}%
                        </p>
                        {latestEvent.analytics?.views > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            {latestEvent.analytics.views} views
                          </p>
                        )}
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Additional Analytics */}
                {latestEvent.analytics && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Revenue</p>
                      <p className="text-lg font-bold text-purple-800">
                        {(latestEvent.analytics.totalRevenue || 0) > 0 ? `$${latestEvent.analytics.totalRevenue?.toLocaleString() || '0'}` : 'Free'}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Avg Price</p>
                      <p className="text-lg font-bold text-indigo-800">
                        {(latestEvent.analytics.averageTicketPrice || 0) > 0 ? `$${latestEvent.analytics.averageTicketPrice?.toFixed(0) || '0'}` : 'Free'}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg border border-pink-200">
                      <p className="text-xs font-medium text-pink-600 uppercase tracking-wide">Views</p>
                      <p className="text-lg font-bold text-pink-800">
                        {latestEvent.analytics.views?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Seating Visualization */}
                {latestEvent.seating && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Seat Allocation</h4>
                      <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                          <span className="text-gray-600">Booked</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-500 rounded-sm" />
                          <span className="text-gray-600">Available</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Seats</p>
                        <p className="text-xl font-bold text-blue-800">{latestEvent.seating.totalSeats || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Available</p>
                        <p className="text-xl font-bold text-green-800">{latestEvent.seating.availableSeats || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Booked</p>
                        <p className="text-xl font-bold text-orange-800">
                          {(latestEvent.seating.totalSeats || 0) - (latestEvent.seating.availableSeats || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Seat Map Visualization */}
                    {latestEvent.seating.seatMap && Array.isArray(latestEvent.seating.seatMap) && latestEvent.seating.seatMap.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-10 gap-1 mb-3">
                          {latestEvent.seating.seatMap.slice(0, 50).map((s, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-sm transition-all duration-200 hover:scale-110 ${s.isBooked ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                                }`}
                              title={`Seat ${s.seatNumber}: ${s.isBooked ? 'Booked' : 'Available'}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Showing first 50 seats • Hover for details
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex space-x-2 pt-2 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={() => onTabChange && onTabChange('events')}
                  >
                    Manage Event
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => onTabChange && onTabChange('analytics')}
                  >
                    View Analytics
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Yet</h3>
                <p className="text-sm text-gray-500 mb-4">Create your first event to get started with EventX</p>
                <Button
                  onClick={() => onTabChange && onTabChange('events')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Create Event
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Upcoming Events and Notifications */}
        <div className="flex flex-col gap-4 h-[750px]">
          <Card className="flex flex-col overflow-hidden pb-4">
            <CardHeader className="flex-shrink-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>Upcoming Events</span>
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No upcoming events</p>
                    <p className="text-xs text-gray-400">Create an event to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((ev) => (
                      <div key={ev._id || ev.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{ev.title}</p>
                          <p className="text-xs text-gray-500">{ev.date ? new Date(ev.date).toLocaleDateString() : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="link"
                className="w-full text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center pt-5"
                onClick={() => onTabChange && onTabChange('events')}
              >
                View All Events
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col overflow-hidden  max-h-[400px] pb-4">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-black">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="px-2 py-1 bg-green-800 bg-opacity-20 rounded-full text-xs font-medium text-white">
                    {filteredNotifications.length} items
                  </div>
                  <Button variant="ghost" size="sm" className="text-green-800 hover:bg-green-800/20">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {notifications.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                  <p className="text-sm text-gray-500 mb-4">Activity from bookings, registrations, and events will appear here</p>
                  <Button
                    variant="outline"
                    onClick={() => onTabChange && onTabChange('events')}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    Create Event
                  </Button>
                </div>
              ) : (
                <>
                  {/* Activity Filter Buttons */}
                  <div className="px-6 py-4 bg-white flex-shrink-0">
                    <div className="flex space-x-2">
                      <Button
                        variant={activityFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityFilter('all')}
                        className={activityFilter === 'all'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                        }
                      >
                        All ({notifications.length})
                      </Button>
                      <Button
                        variant={activityFilter === 'booking' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityFilter('booking')}
                        className={activityFilter === 'booking'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                        }
                      >
                        Bookings ({notifications.filter(n => n.type === 'booking').length})
                      </Button>
                      <Button
                        variant={activityFilter === 'registration' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityFilter('registration')}
                        className={activityFilter === 'registration'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                        }
                      >
                        Users ({notifications.filter(n => n.type === 'registration').length})
                      </Button>
                      <Button
                        variant={activityFilter === 'event' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityFilter('event')}
                        className={activityFilter === 'event'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                        }
                      >
                        Events ({notifications.filter(n => n.type === 'event').length})
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 recent-activity-scroll">
                    {filteredNotifications.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No {activityFilter === 'all' ? '' : activityFilter} activity found</p>
                          <p className="text-xs text-gray-400">Try selecting a different filter</p>
                        </div>
                      </div>
                    ) : (
                      filteredNotifications.map((notification, index) => {
                        const getActivityIcon = (type) => {
                          switch (type) {
                            case 'booking':
                              return <Ticket className="w-4 h-4" />;
                            case 'registration':
                              return <Users className="w-4 h-4" />;
                            case 'event':
                              return <Calendar className="w-4 h-4" />;
                            default:
                              return <Bell className="w-4 h-4" />;
                          }
                        };

                        const getActivityColor = (type) => {
                          switch (type) {
                            case 'booking':
                              return 'bg-green-100 text-green-600';
                            case 'registration':
                              return 'bg-blue-100 text-blue-600';
                            case 'event':
                              return 'bg-purple-100 text-purple-600';
                            default:
                              return 'bg-orange-100 text-orange-600';
                          }
                        };

                        const getTimeAgo = (timestamp) => {
                          if (!timestamp) return 'Just now';
                          const now = new Date();
                          const time = new Date(timestamp);
                          const diffInMinutes = Math.floor((now - time) / (1000 * 60));

                          if (diffInMinutes < 1) return 'Just now';
                          if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                          if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
                          return `${Math.floor(diffInMinutes / 1440)}d ago`;
                        };

                        return (
                          <div key={notification.id || index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(notification.type)} group-hover:scale-105 transition-transform`}>
                              {getActivityIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                    {notification.message}
                                  </p>
                                  {notification.description && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {notification.description}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-xs text-gray-500">
                                      {getTimeAgo(notification.timestamp)}
                                    </span>
                                    {notification.type && (
                                      <>
                                        <span className="text-xs text-gray-300">•</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${notification.type === 'booking' ? 'bg-green-100 text-green-700' :
                                          notification.type === 'registration' ? 'bg-blue-100 text-blue-700' :
                                            notification.type === 'event' ? 'bg-purple-100 text-purple-700' :
                                              'bg-orange-100 text-orange-700'
                                          }`}>
                                          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                                        </span>
                                      </>
                                    )}
                                    {notification.metadata?.amount !== undefined && (
                                      <>
                                        <span className="text-xs text-gray-300">•</span>
                                        <span className="text-xs text-green-600 font-medium">
                                          {(notification.metadata.amount || 0) > 0 ? `$${notification.metadata.amount}` : 'Free'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {notification.metadata?.ticketId && (
                                  <div className="text-right">
                                    <span className="text-xs text-gray-400 font-mono">
                                      #{notification.metadata.ticketId}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <Button
                      variant="link"
                      className="w-full text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center pt-5"
                      onClick={() => onTabChange && onTabChange('notifications')}
                    >
                      View All Activity
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

