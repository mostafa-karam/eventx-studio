import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Eye,
  Ticket
} from 'lucide-react';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { token } = useAuth();
  const API_BASE_URL = 'http://localhost:5000/api';

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

  const stats = [
    {
      title: 'Total Events',
      value: overview?.totalEvents || 0,
      icon: Calendar,
      description: `${overview?.activeEvents || 0} active events`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Revenue',
      value: `$${(overview?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      description: `Avg: $${(overview?.averageTicketPrice || 0).toFixed(2)} per ticket`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tickets Sold',
      value: overview?.totalTicketsSold || 0,
      icon: Ticket,
      description: 'All time sales',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Users',
      value: overview?.totalUsers || 0,
      icon: Users,
      description: 'Registered attendees',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-2">
          Welcome to your EventX Studio admin dashboard. Here's an overview of your events and performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>Your latest created events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.topPerformers?.events?.length > 0 ? (
                dashboardData.topPerformers.events.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {event.venue?.name}, {event.venue?.city}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${event.analytics?.revenue || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.analytics?.bookings || 0} tickets
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No events created yet</p>
                  <p className="text-sm text-gray-400">Create your first event to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900">Total Views</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {dashboardData?.topPerformers?.events?.reduce((sum, event) => sum + (event.analytics?.views || 0), 0) || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900">Conversion Rate</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {overview?.totalTicketsSold && dashboardData?.topPerformers?.events?.reduce((sum, event) => sum + (event.analytics?.views || 0), 0) 
                    ? ((overview.totalTicketsSold / dashboardData.topPerformers.events.reduce((sum, event) => sum + (event.analytics?.views || 0), 0)) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="font-medium text-gray-900">Avg Event Revenue</span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  ${overview?.totalEvents ? ((overview?.totalRevenue || 0) / overview.totalEvents).toFixed(0) : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

