import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
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
        console.log('Dashboard API response:', data);
        console.log('Overview data:', data.data?.overview);
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
      description: `Avg $${(overview?.averageTicketPrice || 0).toFixed(0)}/ticket`,
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
  const latestEvent = events.reduce((latest, e) => {
    const d = e?.date ? new Date(e.date) : null;
    const ld = latest?.date ? new Date(latest.date) : null;
    if (!d) return latest;
    if (!ld) return e;
    return d > ld ? e : latest;
  }, null);

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
                <p className="text-lg font-bold text-purple-600">${(overview?.averageTicketPrice || 0).toFixed(0)}</p>
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
                        <Cell key={`cell-${index}`} fill={['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
                  {eventCategories.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4'][index % 6] }} />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Event */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>Latest Event</span>
            </CardTitle>
            {latestEvent ? (
              <div className="bg-purple-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-purple-700">Event:</span>
                  <span className="text-sm text-purple-600">{latestEvent.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-purple-700">Date:</span>
                  <span className="text-sm text-purple-600">{latestEvent.date ? new Date(latestEvent.date).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            ) : (
              <CardDescription>No events available</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {latestEvent?.seating ? (
              <>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Seat Allocation</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Seats</p>
                      <p className="text-lg font-bold text-blue-600">{latestEvent.seating.totalSeats || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Available</p>
                      <p className="text-lg font-bold text-green-600">{latestEvent.seating.availableSeats || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600">Booked</p>
                      <p className="text-lg font-bold text-orange-600">{(latestEvent.seating.totalSeats || 0) - (latestEvent.seating.availableSeats || 0)}</p>
                    </div>
                  </div>
                  {latestEvent.seating.seatMap && Array.isArray(latestEvent.seating.seatMap) && latestEvent.seating.seatMap.length > 0 && (
                    <>
                      <div className="grid grid-cols-10 gap-1 mb-4">
                        {latestEvent.seating.seatMap.slice(0, 50).map((s, i) => (
                          <div 
                            key={i} 
                            className={`w-4 h-4 rounded-sm ${
                              s.isBooked ? 'bg-orange-500' : 'bg-green-500'
                            }`} 
                            title={`Seat ${s.seatNumber}: ${s.isBooked ? 'Booked' : 'Available'}`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                          <span>Booked</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-sm" />
                          <span>Available</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No seating data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Upcoming Events and Notifications */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
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
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No upcoming events</p>
                  <p className="text-xs text-gray-400">Create an event to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((ev) => (
                    <div key={ev._id || ev.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{ev.title}</p>
                        <p className="text-xs text-gray-500">{ev.date ? new Date(ev.date).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="link" 
                className="w-full mt-4 text-blue-600 hover:text-blue-700"
                onClick={() => onTabChange && onTabChange('events')}
              >
                View All Events
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                  <p className="text-xs text-gray-400">Activity will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Bell className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-sm text-gray-700 flex-1">{notification.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="link" 
                className="w-full mt-4 text-orange-600 hover:text-orange-700"
                onClick={() => onTabChange && onTabChange('notifications')}
              >
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

