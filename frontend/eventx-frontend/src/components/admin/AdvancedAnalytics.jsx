import React, { useState, useEffect } from 'react';

import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Calendar, DollarSign, Ticket, Download,
  RefreshCw, BarChart3, PieChart as PieChartIcon, Activity, AlertCircle, MapPin
} from 'lucide-react';

const AdvancedAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const months = timeRange === '7d' ? 1 : timeRange === '30d' ? 1 : timeRange === '90d' ? 3 : 12;
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard?months=${months}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
        {children}
    </div>
  );

  // eslint-disable-next-line no-unused-vars
  const StatCard = ({ title, value, change = 0, icon: Icon, colorClass }) => {
    const isUp = Number(change) >= 0;
    const pct = Math.abs(Number(change)).toFixed(1);
    
    // Mapping base colors to gradient and icon colors
    const styleMap = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', grad: 'from-blue-600 to-indigo-600' },
      green: { bg: 'bg-emerald-50', text: 'text-emerald-600', grad: 'from-emerald-500 to-teal-500' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', grad: 'from-purple-500 to-fuchsia-500' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', grad: 'from-amber-500 to-orange-500' }
    };
    const style = styleMap[colorClass] || styleMap.blue;

    return (
      <div className={`group bg-white rounded-3xl p-6 flex flex-col justify-between h-full border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}>
        {/* Decorative background glow */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${style.grad} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>
        
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div className="flex-1 pr-3">
            <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1">{title}</p>
            <h3 className="text-[28px] font-black text-gray-900 tracking-tight leading-none truncate capitalize">{value}</h3>
          </div>
          <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${style.bg} ${style.text} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between mt-auto pt-4 border-t border-gray-50/80">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {pct}%
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">vs last period</span>
          </div>
        </div>
        
        {/* Bottom decorative line */}
        <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${style.grad} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-4 rounded-xl shadow-xl">
          <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}: <span className="text-gray-900 ml-1">{prefix}{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !analytics) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl blur-sm opacity-50"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl blur-sm opacity-50"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 w-full flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load analytics</h2>
        <p className="text-gray-500 mb-6 text-center max-w-md">
          {error || 'There was a problem communicating with the analytics server. Please try again.'}
        </p>
        <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
        </Button>
      </div>
    );
  }

  // Safe defaults
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
  // Backend returns locations as [{ city, count }] inside attendeeDemographics.locations
  const safeLocations = (analytics?.attendeeDemographics?.locations ?? []).map(l => ({ city: l.city || l.country || l.location, count: l.count }));
  const safeTopEvents = analytics?.topEvents ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="text-gray-900">Advanced Analytics</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">Deep insights and comprehensive reports for your platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36 bg-white border-gray-200 text-gray-700 rounded-xl font-medium focus:ring-blue-500 focus:border-blue-500 shadow-sm">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-100 shadow-xl">
                <SelectItem value="7d" className="font-medium cursor-pointer">Last 7 days</SelectItem>
                <SelectItem value="30d" className="font-medium cursor-pointer">Last 30 days</SelectItem>
                <SelectItem value="90d" className="font-medium cursor-pointer">Last 90 days</SelectItem>
                <SelectItem value="1y" className="font-medium cursor-pointer">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="bg-white/60 backdrop-blur-md border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
            Refresh
          </Button>
          
          <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Revenue" value={formatCurrency(safeOverview.totalRevenue)} change={safeOverview.growthRate.revenue} icon={DollarSign} colorClass="blue" />
        <StatCard title="Tickets Sold" value={formatNumber(safeOverview.totalTicketsSold)} change={safeOverview.growthRate.tickets} icon={Ticket} colorClass="green" />
        <StatCard title="Total Events" value={formatNumber(safeOverview.totalEvents)} change={safeOverview.growthRate.events} icon={Calendar} colorClass="purple" />
        <StatCard title="Total Attendees" value={formatNumber(safeOverview.totalAttendees)} change={safeOverview.growthRate.attendees} icon={Users} colorClass="amber" />
      </div>

      {/* Interactive Tabs */}
      <GlassCard className="p-1">
        <Tabs defaultValue="revenue" className="w-full">
          <div className="p-3 border-b border-gray-100/50 flex overflow-x-auto hide-scrollbar">
            <TabsList className="bg-gray-100/50 p-1.5 rounded-xl gap-2 w-max">
              {[
                { id: 'revenue', icon: BarChart3, label: 'Revenue & Sales' },
                { id: 'events', icon: PieChartIcon, label: 'Categories' },
                { id: 'demographics', icon: Users, label: 'Demographics' },
                { id: 'performance', icon: Activity, label: 'Top Performers' }
              ].map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="rounded-lg px-4 py-2 font-semibold text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm hover:bg-gray-50"
                >
                  <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="p-5 sm:p-6 bg-gray-50/20">
            {/* Revenue & Sales Tab */}
            <TabsContent value="revenue" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                      Revenue Over Time
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={safeRevenueData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} tickFormatter={(val) => `$${val}`} />
                        <Tooltip content={<CustomTooltip prefix="$" />} />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Ticket className="w-4 h-4 text-emerald-600" />
                      </div>
                      Ticket Volume
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={safeRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="tickets" name="Tickets Sold" stroke="#10B981" strokeWidth={4} dot={{ fill: '#10B981', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Event Categories Tab */}
            <TabsContent value="events" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center">
                  <div className="w-full mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Category Make-up</h3>
                    <p className="text-sm text-gray-500">Distribution of event types</p>
                  </div>
                  <div className="w-full flex-1 min-h-[320px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={safeEventCategories}
                          cx="50%" cy="50%"
                          labelLine={false}
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {safeEventCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-transparent outline-none hover:opacity-80 transition-opacity" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                       <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total</p>
                       <p className="text-3xl font-black text-gray-900">{safeOverview.totalEvents}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Breakdown Metrics</h3>
                    <p className="text-sm text-gray-500">Detailed category breakdown</p>
                  </div>
                  <div className="space-y-5">
                    {safeEventCategories.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No category data available.</p>
                    )}
                    {safeEventCategories.map((category, index) => {
                      const pct = Math.round(category.value);
                      return (
                        <div key={category.name} className="flex flex-col gap-2 relative group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="font-bold text-gray-800">{category.name}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-bold text-gray-500">{category.value} events</span>
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-bold">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }}
                              />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Demographics Tab */}
            <TabsContent value="demographics" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                        <Users className="w-4 h-4 text-pink-600" />
                      </div>
                      Age Demographics
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={safeAgeGroups}>
                        <defs>
                          <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.9}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
                        <Bar dataKey="count" name="Users" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      Top Locations
                    </h3>
                  </div>
                  <div className="space-y-4 pt-2">
                    {safeLocations.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No location data available.</p>
                    )}
                    {safeLocations.map((location, index) => {
                       const maxCount = Math.max(...safeLocations.map(l => l.count)) || 1;
                       const pct = (location.count / maxCount) * 100;
                       
                       return (
                         <div key={location.city} className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 bg-gradient-to-br border border-white">
                             #{index + 1}
                           </div>
                           <div className="flex-1">
                             <div className="flex justify-between items-end mb-1">
                               <span className="font-bold text-gray-800">{location.city}</span>
                               <span className="text-sm font-bold text-gray-500">{location.count} users</span>
                             </div>
                             <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                                  style={{ width: `${pct}%` }}
                                />
                             </div>
                           </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Top Events Tab */}
            <TabsContent value="performance" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Leaderboard: Top Performing Events</h3>
                    <p className="text-sm text-gray-500">Ranked by overall platform revenue and ticket sales</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {safeTopEvents.length === 0 && (
                         <p className="text-sm text-gray-500 italic p-6">No top events data available.</p>
                    )}
                    {safeTopEvents.map((event, index) => (
                      <div key={event.name} className="flex flex-col sm:flex-row items-center justify-between p-6 hover:bg-gray-50/50 transition-colors gap-4">
                        <div className="flex items-center space-x-4 w-full sm:w-auto">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 shadow-sm
                            ${index === 0 ? 'bg-amber-100 text-amber-600 border-amber-200' :
                              index === 1 ? 'bg-gray-200 text-gray-600 border-gray-300' :
                              index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                              'bg-gray-50 text-gray-400 border-gray-100'
                            }
                          `}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{event.name}</h4>
                            <p className="text-sm text-gray-500 flex items-center mt-0.5">
                              <Users className="w-3.5 h-3.5 mr-1" /> {event.attendees} registered attendees
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0 justify-end">
                           <div className="text-right px-4 py-2 border border-gray-100 rounded-xl bg-gray-50/50">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tickets Sold</p>
                             <p className="font-black text-gray-900 text-lg leading-none">{event.tickets}</p>
                           </div>
                           <div className="text-right px-4 py-2 border border-emerald-100 rounded-xl bg-emerald-50/50">
                             <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Gross Revenue</p>
                             <p className="font-black text-emerald-800 text-lg leading-none">{formatCurrency(event.revenue)}</p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </TabsContent>

          </div>
        </Tabs>
      </GlassCard>
    </div>
  );
};

export default AdvancedAnalytics;
