import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Ticket,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

const AdvancedAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      } else {
        setError('Failed to load analytics data');
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setError('Unable to connect to analytics service');
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const StatCard = ({ title, value, change = 0, icon: Icon }) => {
    const isUp = Number(change) >= 0;
    const pct = Math.abs(Number(change)).toFixed(1);
    return (
      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
              <div className={`flex items-center mt-3 text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                {isUp ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {pct}% from last period
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center">
              <Icon className="h-7 w-7 text-black" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-black rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
                <p className="text-gray-300">Loading analytics data...</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-black rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
                <p className="text-gray-300">Comprehensive insights into your events</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={fetchAnalytics}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data Available</h3>
            <p className="text-gray-600 mb-4">
              {error || 'Unable to load analytics data. Please check your connection and try again.'}
            </p>
            <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Safe defaults to avoid runtime errors if backend omits fields
  const safeOverview = {
    totalEvents: analytics?.overview?.totalEvents ?? 0,
    totalTicketsSold: analytics?.overview?.totalTicketsSold ?? 0,
    totalRevenue: analytics?.overview?.totalRevenue ?? 0,
    totalAttendees: analytics?.overview?.totalAttendees ?? 0,
    growthRate: {
      events: analytics?.overview?.growthRate?.events ?? 0,
      tickets: analytics?.overview?.growthRate?.tickets ?? 0,
      revenue: analytics?.overview?.growthRate?.revenue ?? 0,
      attendees: analytics?.overview?.growthRate?.attendees ?? 0,
    },
  };
  const safeRevenueData = analytics?.revenueData ?? [];
  const safeEventCategories = analytics?.eventCategories ?? [];
  const safeAgeGroups = analytics?.attendeeDemographics?.ageGroups ?? [];
  const safeLocations = analytics?.attendeeDemographics?.locations ?? [];
  const safeTopEvents = analytics?.topEvents ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-black rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
              <p className="text-gray-300">Comprehensive insights into your events</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={fetchAnalytics}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value={formatNumber(safeOverview.totalEvents)}
          change={safeOverview.growthRate.events}
          icon={Calendar}
        />
        <StatCard
          title="Tickets Sold"
          value={formatNumber(safeOverview.totalTicketsSold)}
          change={safeOverview.growthRate.tickets}
          icon={Ticket}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(safeOverview.totalRevenue)}
          change={safeOverview.growthRate.revenue}
          icon={DollarSign}
        />
        <StatCard
          title="Total Attendees"
          value={formatNumber(safeOverview.totalAttendees)}
          change={safeOverview.growthRate.attendees}
          icon={Users}
        />
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="revenue" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Revenue & Sales</TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Event Categories</TabsTrigger>
          <TabsTrigger value="demographics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Demographics</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Top Events</TabsTrigger>
        </TabsList>

        {/* Revenue & Sales Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                <CardTitle className="flex items-center text-gray-900">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Monthly Revenue
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Revenue trends over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={safeRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                <CardTitle className="flex items-center text-gray-900">
                  <Activity className="h-5 w-5 mr-2" />
                  Tickets Sold
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Ticket sales volume over time
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={safeRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="tickets"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Event Categories Tab */}
        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                <CardTitle className="flex items-center text-gray-900">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Events by Category
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Distribution of events across different categories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={safeEventCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {safeEventCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
                  {(() => {
                    const total = safeEventCategories.reduce((sum, c) => sum + (c.value || 0), 0) || 1;
                    return safeEventCategories.map((c, i) => (
                      <div key={c.name} className="flex items-center space-x-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-700">{c.name}</span>
                        <Badge variant="secondary">{Math.round(((c.value || 0) / total) * 100)}%</Badge>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                <CardTitle className="text-gray-900">Category Performance</CardTitle>
                <CardDescription className="text-gray-600">
                  Event count and performance by category
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {safeEventCategories.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="secondary">
                          {category.count} events
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {category.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                <CardTitle className="text-gray-900">Age Distribution</CardTitle>
                <CardDescription className="text-gray-600">
                  Attendee age groups breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={safeAgeGroups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                <CardTitle className="text-gray-900">Geographic Distribution</CardTitle>
                <CardDescription className="text-gray-600">
                  Top cities by attendee count
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {safeLocations.map((location, index) => (
                    <div key={location.city} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <span className="font-medium">{location.city}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${safeLocations.length ? (location.count / safeLocations[0].count) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {location.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Events Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
              <CardTitle className="text-gray-900">Top Performing Events</CardTitle>
              <CardDescription className="text-gray-600">
                Events ranked by tickets sold and revenue generated
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {safeTopEvents.map((event, index) => (
                  <div key={event.name} className="flex items-center justify-between p-6 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-lg font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{event.name}</h4>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {event.attendees} attendees
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8 text-sm">
                      <div className="text-center bg-blue-50 px-4 py-2 rounded-lg">
                        <p className="font-bold text-blue-900 text-lg">{event.tickets}</p>
                        <p className="text-blue-600 font-medium">Tickets</p>
                      </div>
                      <div className="text-center bg-green-50 px-4 py-2 rounded-lg">
                        <p className="font-bold text-green-900 text-lg">{formatCurrency(event.revenue)}</p>
                        <p className="text-green-600 font-medium">Revenue</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;

