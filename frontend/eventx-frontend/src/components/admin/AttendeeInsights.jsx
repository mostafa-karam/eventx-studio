import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Users, Calendar, MapPin, Star, BarChart3, TrendingUp, TrendingDown,
  Filter, Search, ChevronDown, CheckCircle2, Globe, Activity
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area
} from 'recharts';

const AttendeeInsights = () => {
  const [viewType, setViewType] = useState('all'); // 'single' or 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insightsData, setInsightsData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventMeta, setEventMeta] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchInsightsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewType, selectedEvent]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/events/admin/my-events?limit=100`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setEvents(data.data?.events || []);
        }
      } catch (err) { console.error('Load events error:', err); }
    };
    loadEvents();
  }, [API_BASE_URL]);

  useEffect(() => {
    const loadEventMeta = async () => {
      if (viewType === 'single' && selectedEvent) {
        try {
          const res = await fetch(`${API_BASE_URL}/events/${selectedEvent}`, {
            credentials: 'include',
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) setEventMeta(data.data?.event || null);
          else setEventMeta(null);
        } catch (err) { console.error('Load event meta error:', err); setEventMeta(null); }
      } else {
        setEventMeta(null);
      }
    };
    loadEventMeta();
  }, [viewType, selectedEvent, API_BASE_URL]);

  const fetchInsightsData = async () => {
    try {
      setLoading(true);
      const endpoint = viewType === 'single'
        ? selectedEvent
          ? `/analytics/events/${selectedEvent}`
          : null
        : '/analytics/all-attendee-insights';

      if (!endpoint && viewType === 'single') {
        setInsightsData(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setInsightsData(data.data);
        setError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load attendee insights');
      }
    } catch (error) {
      console.error('Insights fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 relative ${className}`}>
      {children}
    </div>
  );

  const SkeletonLoader = () => (
    <div className="p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-24 bg-gray-200 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="h-48 bg-gray-200 rounded-2xl"></div>
          <div className="h-48 bg-gray-200 rounded-2xl"></div>
          <div className="h-48 bg-gray-200 rounded-2xl"></div>
          <div className="h-48 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="h-80 bg-gray-200 rounded-2xl w-full"></div>
      </div>
    </div>
  );

  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 rounded-2xl shadow-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { overview: apiOverview, ageData, locationData, interestData, trends } = insightsData || {};

  let dynamicDemographics = insightsData?.demographics;
  let dynamicTrends = trends || { registrationTrend: [] };
  let totalCount = insightsData?.totalAttendees || (viewType === 'single' ? insightsData?.tickets?.statistics?.total : 0) || 0;
  
  if (viewType === 'single' && insightsData) {
    dynamicTrends = { 
      registrationTrend: (insightsData?.tickets?.bookingTrend || []).map(t => ({ date: t.date, registrations: t.count })),
      categoryPreferences: [] 
    };
  }

  const computedLocations = (locationData && locationData.length)
    ? locationData.map(l => ({ country: l.country || l.location || l.city, count: l.count }))
    : ((dynamicDemographics?.locationDistribution || []).map(l => ({ country: l.country || l.location || l.city, count: l.count })));

  const computedInterests = ((interestData && interestData.length)
    ? interestData.map(i => ({ name: i.name || i.interest, value: i.value !== undefined ? i.value : i.count }))
    : ((dynamicDemographics?.interestDistribution || []).map(i => ({ name: i.name || i.interest, value: i.count })))).filter(i => i.value > 0);

  const computedAges = ((ageData && ageData.length)
    ? ageData.map(a => ({ name: a.name || a.age || a.group, value: a.value !== undefined ? a.value : a.count }))
    : ((dynamicDemographics?.ageGroups || []).map(a => ({ name: a.name || a.group || a.age, value: a.count })))).filter(a => a.value > 0);

  // Growth Calculation via API
  const growthRate = viewType === 'all' 
    ? (apiOverview?.interestStats?.trend || 0)
    : (insightsData?.growth?.percentage || 0);

  const overview = apiOverview || {
    totalAttendees: totalCount,
    dominantAgeGroup: computedAges.sort((a,b)=>b.value-a.value)[0]?.name || '—',
    dominantGender: (dynamicDemographics?.genderDistribution || []).sort((a,b)=>b.count-a.count)[0]?.gender || 'N/A',
    topLocation: computedLocations.sort((a,b)=>b.count-a.count)[0]?.country || 'N/A',
    topInterest: computedInterests.sort((a,b)=>b.value-a.value)[0]?.name || 'N/A',
    ageStats: { count: computedAges.sort((a,b)=>b.value-a.value)[0]?.value || null, trend: null },
    genderStats: { count: (dynamicDemographics?.genderDistribution || []).sort((a,b)=>b.count-a.count)[0]?.count || null, trend: null },
    locationStats: { count: computedLocations.sort((a,b)=>b.count-a.count)[0]?.count || null, trend: null },
    interestStats: { count: computedInterests.sort((a,b)=>b.value-a.value)[0]?.value || null, trend: null },
  };

  const formatNumber = (n) => (typeof n === 'number' ? n.toLocaleString() : (typeof n === 'string' && n.trim() !== '' ? n : '—'));
  const renderTrend = (trend) => {
    if (!trend || trend === 0) return null; // Hide badge completely if no trend exists
    const positive = trend > 0;
    return (
      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center gap-1`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(trend)}%
      </span>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-3 rounded-xl shadow-xl">
          <p className="font-semibold text-gray-800 mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].fill || payload[0].stroke || '#6366f1' }}></div>
            <p className="text-gray-600">
              <span className="font-bold text-gray-900">{payload[0].value.toLocaleString()}</span> attendees
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 p-8 shadow-2xl text-white border border-indigo-700/50">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white flex items-center gap-3">
              Attendee Insights
            </h1>
            <p className="text-indigo-200 text-lg font-medium max-w-2xl">
              Deep analytics on your audience demographics, locations, and behavioral interests.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="bg-white/10 border border-white/20 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-3 w-full sm:w-auto shadow-inner">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-200 flex items-center justify-center border border-blue-400/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-300 tracking-wider uppercase">Total Base</p>
                <p className="text-lg font-black text-white leading-tight">{formatNumber(overview?.totalAttendees)}</p>
              </div>
            </div>

            <div className="flex p-1 bg-black/20 backdrop-blur-md rounded-2xl w-full sm:w-auto border border-white/10">
              <button
                onClick={() => setViewType('all')}
                className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${viewType === 'all' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white'}`}
              >
                Global
              </button>
              <button
                onClick={() => setViewType('single')}
                className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${viewType === 'single' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white'}`}
              >
                Specific Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Single event meta strip */}
      {viewType === 'single' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none appearance-none"
              value={selectedEvent || ''}
              onChange={(e) => setSelectedEvent(e.target.value || null)}
            >
              <option value="">Select an event to analyze...</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>{ev.title}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {eventMeta && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {eventMeta.venue?.name || 'No Venue'}
              </span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                 {eventMeta.date ? new Date(eventMeta.date).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Stats KPIs */}
      {/* Main Stats KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: 'Dominant Age', 
            subtitle: 'Largest demographic segment',
            value: overview?.dominantAgeGroup || '—', 
            icon: Calendar, 
            trend: overview?.ageStats?.trend, 
            count: overview?.ageStats?.count, 
            gradient: 'from-blue-500 to-indigo-600', 
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600'
          },
          { 
            title: 'Primary Gender', 
            subtitle: 'Most frequent representation',
            value: overview?.dominantGender || '—', 
            icon: Users, 
            trend: overview?.genderStats?.trend, 
            count: overview?.genderStats?.count, 
            gradient: 'from-violet-500 to-purple-600', 
            iconBg: 'bg-violet-50',
            iconColor: 'text-violet-600'
          },
          { 
            title: 'Top Location', 
            subtitle: 'Highest attendee concentration',
            value: overview?.topLocation || '—', 
            icon: Globe, 
            trend: overview?.locationStats?.trend, 
            count: overview?.locationStats?.count, 
            gradient: 'from-teal-400 to-emerald-600', 
            iconBg: 'bg-teal-50',
            iconColor: 'text-teal-600'
          },
          { 
            title: 'Core Interest', 
            subtitle: 'Top engagement category',
            value: overview?.topInterest || '—', 
            icon: Star, 
            trend: overview?.interestStats?.trend, 
            count: overview?.interestStats?.count, 
            gradient: 'from-amber-400 to-orange-500', 
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600'
          }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`group bg-white rounded-3xl p-6 flex flex-col justify-between h-full border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}>
              {/* Decorative background glow */}
              <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${stat.gradient} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>
              
              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="flex-1 pr-3">
                  <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1">{stat.title}</p>
                  <h3 className="text-[28px] font-black text-gray-900 tracking-tight leading-none truncate capitalize">{stat.value}</h3>
                  <p className="text-[12px] text-gray-400/80 font-medium mt-1.5 line-clamp-1">{stat.subtitle}</p>
                </div>
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${stat.iconBg} ${stat.iconColor} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="relative z-10 flex items-end justify-between mt-auto pt-4 border-t border-gray-50/80">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total count</span>
                  <span className={`text-2xl font-black bg-gradient-to-br ${stat.gradient} text-transparent bg-clip-text leading-none`}>
                    {stat.count !== null && stat.count !== undefined ? formatNumber(stat.count) : '—'}
                  </span>
                </div>
                {stat.trend !== null && stat.trend !== undefined && (
                  <div className="mb-0.5">{renderTrend(stat.trend)}</div>
                )}
              </div>
              
              {/* Bottom decorative line */}
              <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            </div>
          );
        })}
      </div>

      {/* Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area (Location Bar / Age Trends) */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-0 flex flex-col pt-0">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  {viewType === 'all' ? 'Geographic Distribution' : 'Registration Trend'}
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  {viewType === 'all' ? 'Top cities where your audiences reside' : 'Historical shifts in registrations for this event'}
                </p>
              </div>
            </div>
            
            <div className="p-6 h-[400px]">
              {viewType === 'all' ? (
                /* All Locations Horizontal Bar Chart */
                computedLocations && computedLocations.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={computedLocations.slice(0, 7).map(l => ({ city: l.city || l.country || l.location, count: l.count }))} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                      <YAxis type="category" dataKey="city" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} width={110} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#4f46e5" radius={[0, 8, 8, 0]} barSize={24}>
                         {computedLocations.slice(0, 7).map((_, idx) => (
                           <Cell key={`cell-${idx}`} fill={idx === 0 ? '#4f46e5' : '#818cf8'} />
                         ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <MapPin className="w-10 h-10 mb-3 text-gray-300" />
                    <p className="font-medium text-sm">No geographic data logged</p>
                  </div>
                )
              ) : (
                /* Single Event Registration Trend */
                Array.isArray(dynamicTrends?.registrationTrend) && dynamicTrends.registrationTrend.filter(t => t.registrations > 0).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dynamicTrends.registrationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dx={-10} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="registrations" stroke="#3B82F6" fillOpacity={1} fill="url(#colorReg)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <Activity className="w-10 h-10 mb-3 text-gray-300" />
                    <p className="font-medium text-sm">No timeline trend data</p>
                  </div>
                )
              )}
            </div>
          </GlassCard>

          {/* Secondary Table underneath the large chart */}
          {computedLocations && computedLocations.length > 0 && (
            <div className="grid grid-cols-1 gap-6">
              <GlassCard className="p-0">
                 <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Location Breakdown</h3>
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-xl">Country / Region</th>
                        <th className="px-6 py-4 text-right">Registrations</th>
                        <th className="px-6 py-4 rounded-tr-xl">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {computedLocations.slice(0, 10).map((row, idx) => {
                        const total = computedLocations.reduce((s, curr) => s + (curr.count || 0), 0);
                        const pct = total > 0 ? Math.round(((row.count || 0) / total) * 100) : 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-900">{row.country || row.location || row.city}</td>
                            <td className="px-6 py-4 font-bold text-gray-700 text-right">{formatNumber(row.count)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-gray-500 w-8">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* NEW: Recent Registrations Table */}
              {insightsData?.recentRegistrations && viewType === 'all' && (
                <GlassCard className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Recent Registrations</h3>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium uppercase tracking-wider text-xs">
                        <tr>
                          <th className="px-6 py-4">Attendee</th>
                          <th className="px-6 py-4">Event</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {insightsData.recentRegistrations.map((reg, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-900">{reg.name}</td>
                            <td className="px-6 py-4 text-gray-600">{reg.eventTitle}</td>
                            <td className="px-6 py-4 text-gray-600">{reg.category}</td>
                            <td className="px-6 py-4 text-right font-medium">{new Date(reg.date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {viewType === 'single' && overview && (
             <div className="grid grid-cols-1 gap-6">
               <GlassCard className="p-0">
                 <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 pb-4">
                   <h2 className="text-lg font-bold text-gray-900 tracking-tight">Social Reach & Check-ins</h2>
                 </div>
                 <div className="p-6">
                   <div className="divide-y divide-gray-100">
                     {(overview?.socialBreakdown || overview?.engagementBreakdown || [
                       { label: 'Instagram Mentions', value: overview?.socialEngagement?.instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
                       { label: 'Facebook Shares', value: overview?.socialEngagement?.facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
                       { label: 'Twitter Analytics', value: overview?.socialEngagement?.twitter, color: 'text-sky-600', bg: 'bg-sky-50' },
                       { label: 'Event Check-ins (QR)', value: insightsData?.tickets?.statistics?.checkedIn || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                     ]).filter(Boolean).map((item, idx) => (
                       <div key={idx} className="py-4 flex items-center justify-between group">
                         <span className="text-sm font-bold text-gray-700 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${item.bg || 'bg-gray-100'} flex items-center justify-center`}>
                               <Activity className={`w-4 h-4 ${item.color || 'text-gray-500'}`} />
                            </div>
                            {item.label || item.name}
                         </span>
                         <span className="text-lg font-black text-gray-900 group-hover:scale-110 transition-transform">
                           {formatNumber(item.value ?? item.count)}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               </GlassCard>

               {/* NEW: Occupancy Insights for single event */}
               {viewType === 'single' && eventMeta && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Occupancy Insights</h3>
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-medium text-gray-500">Filled Seats</span>
                       <span className="text-sm font-bold text-gray-900">
                         {(eventMeta.seating?.totalSeats || 0) - (eventMeta.seating?.availableSeats || 0)} / {eventMeta.seating?.totalSeats || 0}
                       </span>
                    </div>
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-blue-600 rounded-full" 
                         style={{ width: `${(eventMeta.seating?.totalSeats || 0) > 0 ? Math.round(((eventMeta.seating.totalSeats - (eventMeta.seating.availableSeats || 0)) / eventMeta.seating.totalSeats) * 100) : 0}%` }}
                       ></div>
                    </div>
                  </GlassCard>
               )}
             </div>
          )}

        </div>

        {/* Sidebar Mini Charts (Interests & Ages) */}
        <div className="space-y-6">
          <GlassCard className="p-0">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Interests Profile</h3>
              <p className="text-sm text-gray-500 font-medium">Categorized user interests</p>
            </div>
            <div className="p-6">
              {(computedInterests && computedInterests.length > 0) ? (
                <>
                  <div className="h-[240px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={computedInterests}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {computedInterests.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="focus:outline-none" />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Ring Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tags</p>
                       <p className="text-xl font-black text-gray-900 leading-none">{overview?.dominantAgeGroup && overview.dominantAgeGroup !== '—' ? overview.dominantAgeGroup : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    {computedInterests.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-md" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                          <span className="font-bold text-gray-700">{item.name}</span>
                        </div>
                        <span className="font-black text-gray-900">{formatNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-gray-400">
                  <Star className="w-8 h-8 mb-3 text-gray-300" />
                  <span className="text-sm font-medium">No interest data available</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* NEW: Top Categories Component */}
          {trends?.categoryPreferences && viewType === 'all' && (
            <GlassCard className="p-0">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Category Preference</h3>
                <p className="text-sm text-gray-500 font-medium">Registration by event type</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {trends.categoryPreferences.slice(0, 4).map((cat, idx) => {
                     const total = trends.categoryPreferences.reduce((s, c) => s + c.count, 0);
                     const pct = Math.round((cat.count / total) * 100);
                     return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-gray-700">{cat.category}</span>
                          <span className="text-gray-900">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'][idx % 4]}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-0">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Age Demographics</h3>
              <p className="text-sm text-gray-500 font-medium">Participant age slices</p>
            </div>
            <div className="p-6">
              {(computedAges && computedAges.length > 0) ? (
                <>
                  <div className="h-[240px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={computedAges}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {computedAges.map((entry, index) => (
                            <Cell key={`cell-age-${index}`} fill={['#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'][index % 4]} className="focus:outline-none" />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-col gap-3">
                    {computedAges.map((item, index) => {
                      const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];
                      const ring = ['ring-emerald-100', 'ring-amber-100', 'ring-rose-100', 'ring-violet-100'];
                      return (
                        <div key={index} className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${colors[index % 4]} ring-4 ${ring[index % 4]}`} />
                            <span className="font-bold text-gray-700">{item.name || item.age}</span>
                          </div>
                          <span className="font-black text-gray-900">{formatNumber(item.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-gray-400">
                  <Calendar className="w-8 h-8 mb-3 text-gray-300" />
                  <span className="text-sm font-medium">No age data available</span>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default AttendeeInsights;
