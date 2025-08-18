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
  const API_BASE_URL = 'http://localhost:5000/api';

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
        // Mock data for demonstration since backend isn't connected
        setAnalytics(generateMockAnalytics());
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      // Use mock data when backend is not available
      setAnalytics(generateMockAnalytics());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockAnalytics = () => {
    return {
      overview: {
        totalEvents: 24,
        totalTicketsSold: 1847,
        totalRevenue: 45680,
        totalAttendees: 1623,
        growthRate: {
          events: 12.5,
          tickets: 8.3,
          revenue: 15.7,
          attendees: 6.9
        }
      },
      revenueData: [
        { month: 'Jan', revenue: 4200, tickets: 168 },
        { month: 'Feb', revenue: 3800, tickets: 152 },
        { month: 'Mar', revenue: 5200, tickets: 208 },
        { month: 'Apr', revenue: 4600, tickets: 184 },
        { month: 'May', revenue: 6100, tickets: 244 },
        { month: 'Jun', revenue: 5800, tickets: 232 },
        { month: 'Jul', revenue: 7200, tickets: 288 },
        { month: 'Aug', revenue: 6800, tickets: 272 },
        { month: 'Sep', revenue: 8100, tickets: 324 },
        { month: 'Oct', revenue: 7600, tickets: 304 },
        { month: 'Nov', revenue: 9200, tickets: 368 },
        { month: 'Dec', revenue: 8900, tickets: 356 }
      ],
      eventCategories: [
        { name: 'Technology', value: 35, count: 8 },
        { name: 'Business', value: 25, count: 6 },
        { name: 'Arts', value: 20, count: 5 },
        { name: 'Sports', value: 12, count: 3 },
        { name: 'Education', value: 8, count: 2 }
      ],
      attendeeDemographics: {
        ageGroups: [
          { age: '18-25', count: 324, percentage: 20 },
          { age: '26-35', count: 487, percentage: 30 },
          { age: '36-45', count: 406, percentage: 25 },
          { age: '46-55', count: 243, percentage: 15 },
          { age: '55+', count: 163, percentage: 10 }
        ],
        locations: [
          { city: 'New York', count: 423 },
          { city: 'Los Angeles', count: 312 },
          { city: 'Chicago', count: 287 },
          { city: 'Houston', count: 234 },
          { city: 'Phoenix', count: 189 },
          { city: 'Others', count: 178 }
        ]
      },
      topEvents: [
        { name: 'Tech Summit 2024', tickets: 450, revenue: 22500, attendees: 420 },
        { name: 'Business Innovation', tickets: 320, revenue: 16000, attendees: 298 },
        { name: 'Art & Design Expo', tickets: 280, revenue: 8400, attendees: 265 },
        { name: 'Sports Analytics', tickets: 200, revenue: 12000, attendees: 185 },
        { name: 'Education Forum', tickets: 150, revenue: 4500, attendees: 142 }
      ]
    };
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

  const StatCard = ({ title, value, change, icon: Icon, trend }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className={`flex items-center mt-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {change}% from last period
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600 mt-2">
            Comprehensive insights into your events performance and audience.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
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
            onClick={fetchAnalytics}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value={formatNumber(analytics.overview.totalEvents)}
          change={analytics.overview.growthRate.events}
          trend="up"
          icon={Calendar}
        />
        <StatCard
          title="Tickets Sold"
          value={formatNumber(analytics.overview.totalTicketsSold)}
          change={analytics.overview.growthRate.tickets}
          trend="up"
          icon={Ticket}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.overview.totalRevenue)}
          change={analytics.overview.growthRate.revenue}
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Total Attendees"
          value={formatNumber(analytics.overview.totalAttendees)}
          change={analytics.overview.growthRate.attendees}
          trend="up"
          icon={Users}
        />
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue & Sales</TabsTrigger>
          <TabsTrigger value="events">Event Categories</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="performance">Top Events</TabsTrigger>
        </TabsList>

        {/* Revenue & Sales Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Monthly Revenue
                </CardTitle>
                <CardDescription>
                  Revenue trends over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.revenueData}>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Tickets Sold
                </CardTitle>
                <CardDescription>
                  Ticket sales volume over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.revenueData}>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Events by Category
                </CardTitle>
                <CardDescription>
                  Distribution of events across different categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.eventCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.eventCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>
                  Event count and performance by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.eventCategories.map((category, index) => (
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
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>
                  Attendee age groups breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.attendeeDemographics.ageGroups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>
                  Top cities by attendee count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.attendeeDemographics.locations.map((location, index) => (
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
                              width: `${(location.count / analytics.attendeeDemographics.locations[0].count) * 100}%`
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
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Events</CardTitle>
              <CardDescription>
                Events ranked by tickets sold and revenue generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topEvents.map((event, index) => (
                  <div key={event.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{event.name}</h4>
                        <p className="text-sm text-gray-600">
                          {event.attendees} attendees
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{event.tickets}</p>
                        <p className="text-gray-600">Tickets</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{formatCurrency(event.revenue)}</p>
                        <p className="text-gray-600">Revenue</p>
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

