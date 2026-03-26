import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Calendar, Users, DollarSign, Ticket, Bell, ArrowRight, TrendingUp, MapPin, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [revenueFilter, setRevenueFilter] = useState('This Year');

  const { user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenueFilter]);

  const fetchDashboardData = async () => {
    try {
      const months = revenueFilter === 'This Year' ? 12 : 6;
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard?months=${months}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative ${className}`}>
      {children}
    </div>
  );

  const SkeletonLoader = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <GlassCard key={i}>
            <div className="p-6">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="rounded-xl bg-gray-200 h-12 w-12"></div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 rounded-2xl">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const { overview } = dashboardData || {};

  const revenueData = Array.isArray(dashboardData?.revenueData) && dashboardData.revenueData.length > 0
    ? dashboardData.revenueData
    : null;
  // revenueData is null when there are no bookings yet → shows empty state instead of blank chart
  const eventCategories = Array.isArray(dashboardData?.eventCategories) && dashboardData.eventCategories.length > 0
    ? dashboardData.eventCategories
    : null;
  const notifications = Array.isArray(dashboardData?.notifications)
    ? dashboardData.notifications
    : [];

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${(overview?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: `${overview?.growthRate?.revenue > 0 ? '+' : ''}${overview?.growthRate?.revenue || 0}%`,
      isPositive: (overview?.growthRate?.revenue || 0) >= 0,
      color: 'from-emerald-500 to-green-600',
      lightColor: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Active Events',
      value: overview?.activeEvents || 0,
      icon: Calendar,
      trend: `${overview?.totalEvents || 0} total`,
      isPositive: true,
      color: 'from-blue-500 to-indigo-600',
      lightColor: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Tickets Sold',
      value: (overview?.totalTicketsSold || 0).toLocaleString(),
      icon: Ticket,
      trend: `${overview?.growthRate?.tickets > 0 ? '+' : ''}${overview?.growthRate?.tickets || 0}%`,
      isPositive: (overview?.growthRate?.tickets || 0) >= 0,
      color: 'from-violet-500 to-purple-600',
      lightColor: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Avg Ticket Price',
      value: (overview?.averageTicketPrice || 0) > 0 ? `$${(overview?.averageTicketPrice || 0).toFixed(0)}` : 'Free',
      icon: Activity,
      trend: 'Per user',
      isPositive: true,
      color: 'from-amber-500 to-orange-600',
      lightColor: 'bg-amber-50 text-amber-600',
    },
  ];

  const events = Array.isArray(dashboardData?.topPerformers?.events)
    ? dashboardData.topPerformers.events
    : [];

  const allEvents = dashboardData?.allEvents || events || [];
  const selectedEvent = selectedEventId
    ? allEvents.find(e => e._id === selectedEventId)
    : (dashboardData?.latestEventAnalytics || allEvents.reduce((latest, e) => {
      const d = e?.date ? new Date(e.date) : null;
      const ld = latest?.date ? new Date(latest.date) : null;
      if (!d) return latest;
      if (!ld) return e;
      return d > ld ? e : latest;
    }, null));

  const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-3 rounded-xl shadow-xl">
          <p className="font-semibold text-gray-800 mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">${payload[0].value.toLocaleString()}</span> revenue
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }}></div>
          <p className="text-sm font-medium text-gray-800">{payload[0].name}: <span className="font-bold">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 p-8 sm:p-10 shadow-2xl text-white border border-indigo-700/50">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-indigo-200 text-lg font-medium max-w-2xl">
              Here's what's happening with your events today. You have <span className="text-white font-bold">{overview?.activeEvents || 0}</span> active events running.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-white hover:bg-gray-50 text-indigo-900 font-bold rounded-xl px-6 transition-all shadow-lg text-sm h-11" onClick={() => navigate('/admin/events')}>
              <Calendar className="w-4 h-4 mr-2" />
              Manage Events
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`group bg-white rounded-3xl p-6 flex flex-col justify-between h-full border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}>
              {/* Decorative background glow */}
              <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${stat.color} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>
              
              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="flex-1 pr-3">
                  <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1">{stat.title}</p>
                  <h3 className="text-[28px] font-black text-gray-900 tracking-tight leading-none truncate capitalize">{stat.value}</h3>
                </div>
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${stat.lightColor} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="relative z-10 flex items-end justify-between mt-auto pt-4 border-t border-gray-50/80">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${stat.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : (stat.title !== 'Avg Ticket Price' && <TrendingDown className="w-3 h-3" />)}
                    {stat.trend}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{stat.title === 'Avg Ticket Price' ? 'vs free events' : 'vs last month'}</span>
                </div>
              </div>
              
              {/* Bottom decorative line */}
              <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Revenue Overview</h3>
              <p className="text-sm text-gray-500 font-medium">Monthly revenue performance</p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
              <select 
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 outline-none font-medium"
                value={revenueFilter}
                onChange={(e) => setRevenueFilter(e.target.value)}
              >
                <option value="This Year">This Year</option>
                <option value="Last 6 Months">Last 6 Months</option>
              </select>
            </div>
          </div>
          
          <div className="h-[300px] w-full mt-4">
            {revenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dx={-10} tickFormatter={(val) => `$${val}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <TrendingUp className="w-10 h-10 mb-3 text-gray-300" />
                <p className="font-medium text-sm">No revenue data available</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Categories Donut Chart */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Event Distribution</h3>
          <p className="text-sm text-gray-500 font-medium mb-6">Events by category</p>
          
          <div className="h-[240px] w-full relative">
            {eventCategories ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {eventCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="focus:outline-none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <PieChart className="w-10 h-10 mb-3 text-gray-300" />
                <p className="font-medium text-sm">No categories available</p>
              </div>
            )}
            
            {/* Center Label */}
            {eventCategories && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-sm text-gray-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-900 text-center -mt-1">
                  {eventCategories.reduce((acc, curr) => acc + curr.value, 0)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {eventCategories?.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-gray-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latest Event Spotlight */}
        <GlassCard className="lg:col-span-2 p-0 flex flex-col">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Event Spotlight</h3>
              <p className="text-sm text-gray-500 font-medium">Performance of selected event</p>
            </div>
            {allEvents.length > 0 && (
              <Select value={selectedEventId || ''} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-[200px] h-9 bg-white border-gray-200 rounded-xl outline-none ring-0 focus:ring-2 focus:ring-blue-100 font-medium text-gray-700">
                  <SelectValue placeholder="Select event..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl min-w-[200px]">
                  {allEvents.map((event) => (
                    <SelectItem key={event._id} value={event._id} className="cursor-pointer font-medium">
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col">
            {selectedEvent ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight mb-2">{selectedEvent.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                        <Calendar className="w-3.5 h-3.5" />
                        {selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : 'TBD'}
                      </span>
                      {selectedEvent.venue?.name && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{selectedEvent.venue.name}</span>
                        </span>
                      )}
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                        selectedEvent.date && new Date(selectedEvent.date) > new Date() 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedEvent.date && new Date(selectedEvent.date) > new Date() ? 'UPCOMING' : 'PAST'}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl border-gray-200 shadow-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0" onClick={() => navigate(`/admin/events/${selectedEvent._id}`)}>
                    Manage Event
                  </Button>
                </div>

                {/* Sub-metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all cursor-default">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                    <p className="text-2xl font-black text-gray-900">
                       {(selectedEvent.analytics?.totalRevenue || 0) > 0 ? `$${selectedEvent.analytics.totalRevenue.toLocaleString()}` : 'Free'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:bg-white hover:shadow-md hover:border-emerald-100 transition-all cursor-default">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Tickets Sold</p>
                    <p className="text-2xl font-black text-gray-900">
                      {selectedEvent.analytics?.ticketsSold || (selectedEvent.seating ? (selectedEvent.seating.totalSeats || 0) - (selectedEvent.seating.availableSeats || 0) : 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:bg-white hover:shadow-md hover:border-purple-100 transition-all cursor-default">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Occupancy</p>
                    <p className="text-2xl font-black text-gray-900">
                      {selectedEvent.analytics?.occupancyRate || (selectedEvent.seating && selectedEvent.seating.totalSeats > 0
                        ? Math.round(((selectedEvent.seating.totalSeats - selectedEvent.seating.availableSeats) / selectedEvent.seating.totalSeats) * 100)
                        : 0)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:bg-white hover:shadow-md hover:border-amber-100 transition-all cursor-default">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Page Views</p>
                    <p className="text-2xl font-black text-gray-900">
                      {selectedEvent.analytics?.views?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>

                {/* Additional Event Details to fill space */}
                <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                       <Activity className="w-4 h-4 text-blue-500" /> Ticket Sales Velocity
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Visual Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-bold text-gray-700">Sales Progress</span>
                          <span className="font-bold text-blue-600">
                            {selectedEvent.analytics?.occupancyRate || (selectedEvent.seating && selectedEvent.seating.totalSeats > 0 ? Math.round(((selectedEvent.seating.totalSeats - selectedEvent.seating.availableSeats) / selectedEvent.seating.totalSeats) * 100) : 0)}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" 
                            style={{ width: `${selectedEvent.analytics?.occupancyRate || (selectedEvent.seating && selectedEvent.seating.totalSeats > 0 ? Math.round(((selectedEvent.seating.totalSeats - selectedEvent.seating.availableSeats) / selectedEvent.seating.totalSeats) * 100) : 0)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 font-medium">
                          {selectedEvent.seating?.availableSeats || 0} seats remaining out of {selectedEvent.seating?.totalSeats || 0} total capacity.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                     <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                       <DollarSign className="w-4 h-4 text-emerald-500" /> Revenue Flow
                     </h4>
                     <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                       <div>
                         <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Average Ticket Value</p>
                         <p className="text-2xl font-black text-emerald-900">
                           {selectedEvent.analytics?.totalRevenue > 0 && selectedEvent.analytics?.ticketsSold > 0
                             ? `$${Math.round(selectedEvent.analytics.totalRevenue / selectedEvent.analytics.ticketsSold)}` 
                             : 'Free'
                           }
                         </p>
                       </div>
                       <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 bg-white"  onClick={() => navigate('/admin/analytics')}>
                          Full Report
                       </Button>
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No Events Found</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Create your first event to see insights</p>
                <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30" onClick={() => navigate('/admin/events/create')}>
                  Create Event
                </Button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Activity Feed (Timeline) */}
        <GlassCard className="p-0 flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Recent Activity</h3>
              <p className="text-sm text-gray-500 font-medium">Latest system events</p>
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{notifications.length}</span>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-200">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Bell className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
                {notifications.slice(0, 5).map((notification, idx) => {
                  let Icon = Bell;
                  let colorClass = "bg-orange-100 text-orange-600 ring-orange-100";
                  
                  if (notification.type === 'booking') { Icon = Ticket; colorClass = "bg-emerald-100 text-emerald-600 ring-emerald-100"; }
                  if (notification.type === 'registration') { Icon = Users; colorClass = "bg-blue-100 text-blue-600 ring-blue-100"; }
                  if (notification.type === 'event') { Icon = Calendar; colorClass = "bg-purple-100 text-purple-600 ring-purple-100"; }

                  return (
                    <div key={notification.id || idx} className="relative pl-6 sm:pl-8 group">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[17px] top-1 flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white ${colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <h4 className="text-sm font-bold text-gray-900 leading-tight">
                            {notification.message}
                          </h4>
                          <span className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded-full">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        
                        {notification.description && (
                          <p className="text-xs font-medium text-gray-500 leading-relaxed mb-2">
                            {notification.description}
                          </p>
                        )}
                        
                        {/* Meta Tags */}
                        {(notification.metadata?.amount || notification.metadata?.ticketId) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {notification.metadata.amount && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                                ${(notification.metadata.amount).toLocaleString()}
                              </span>
                            )}
                            {notification.metadata.ticketId && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                                #{notification.metadata.ticketId.substring(0,8)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {notifications.length > 5 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm font-semibold rounded-xl" onClick={() => navigate('/admin/notifications')}>
                View All Activity <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
