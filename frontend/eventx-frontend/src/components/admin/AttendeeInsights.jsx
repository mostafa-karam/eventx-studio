import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Star, 
  BarChart3, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  Search 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const AttendeeInsights = ({ onBack }) => {
  const [viewType, setViewType] = useState('all'); // 'single' or 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insightsData, setInsightsData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [eventMeta, setEventMeta] = useState(null);

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchInsightsData();
  }, [viewType, selectedEvent]);

  useEffect(() => {
    // fetch admin events for selector
    const loadEvents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/events/admin/my-events?limit=100&search=${encodeURIComponent(search)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setEvents(data.data?.events || []);
        }
      } catch (_) {}
    };
    loadEvents();
  }, [search]);

  useEffect(() => {
    const loadEventMeta = async () => {
      if (viewType === 'single' && selectedEvent) {
        try {
          const res = await fetch(`${API_BASE_URL}/events/${selectedEvent}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) setEventMeta(data.data?.event || null);
          else setEventMeta(null);
        } catch (_) { setEventMeta(null); }
      } else {
        setEventMeta(null);
      }
    };
    loadEventMeta();
  }, [viewType, selectedEvent]);

  const fetchInsightsData = async () => {
    try {
      setLoading(true);
      const endpoint = viewType === 'single' 
        ? selectedEvent 
          ? `/analytics/attendee-insights?eventId=${selectedEvent}`
          : '/analytics/all-attendee-insights'
        : '/analytics/all-attendee-insights';
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInsightsData(data.data);
        setError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        setError(errorData.message || 'Failed to load attendee insights');
      }
    } catch (error) {
      console.error('Insights fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { overview, ageData, locationData, interestData, trends } = insightsData || {};

  // Normalize datasets across both endpoints
  const computedLocations = (locationData && locationData.length)
    ? locationData
    : (insightsData?.demographics?.locationDistribution || []).map(l => ({ city: l.city || l.location, location: l.location, count: l.count }));
  const computedInterests = (interestData && interestData.length)
    ? interestData
    : (insightsData?.demographics?.interestDistribution || []).map(i => ({ name: i.name || i.interest, value: i.count }));
  const computedAges = (ageData && ageData.length)
    ? ageData
    : (insightsData?.demographics?.ageGroups || []).map(a => ({ name: a.name || a.group, value: a.count }));

  const formatNumber = (n) => (typeof n === 'number' ? n.toLocaleString() : (typeof n === 'string' && n.trim() !== '' ? n : '—'));
  const renderTrend = (trend) => {
    if (trend === null || trend === undefined) return <span className="text-sm text-gray-400">—</span>;
    const positive = trend >= 0;
    return (
      <span className={`text-sm font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}>
        {Math.abs(trend)}% {positive ? 'increase' : 'decrease'}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header and controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold text-gray-900">{viewType === 'all' ? 'All Attendee Insights' : 'Attendee Insights'}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 px-4 py-2 rounded-lg flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Attendees: {formatNumber(overview?.totalAttendees)}</span>
          </div>
          <div className="hidden md:flex items-center rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewType('all')}
              className={`px-3 py-2 text-sm ${viewType === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
            >All events</button>
            <button
              onClick={() => setViewType('single')}
              className={`px-3 py-2 text-sm border-l ${viewType === 'single' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
            >Single event</button>
          </div>
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Single event meta strip */}
      {viewType === 'single' && eventMeta && (
        <div className="mb-6 rounded-xl border bg-white shadow-sm p-4 flex flex-wrap items-center gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{eventMeta.title}</h2>
            <ul className="text-sm text-gray-600 mt-1 space-y-0.5">
              <li>Event Venue : {eventMeta.venue?.name}{eventMeta.venue?.city ? `, ${eventMeta.venue.city}` : ''}</li>
              <li>Event Date : {eventMeta.date ? new Date(eventMeta.date).toLocaleDateString() : '—'}</li>
              <li>Time : {eventMeta.date ? new Date(eventMeta.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</li>
            </ul>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm">Attendees: {formatNumber(insightsData?.overview?.totalAttendees)}</div>
          </div>
        </div>
      )}

      {/* Event selector for single view */}
      {viewType === 'single' && (
        <div className="mb-4">
          <label className="text-sm text-gray-600 mr-2">Event</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedEvent || ''}
            onChange={(e)=>{ setSelectedEvent(e.target.value || null); }}
          >
            <option value="">Select an event</option>
            {events.map((ev)=> (
              <option key={ev._id} value={ev._id}>{ev.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Stats Cards */}
        <div className="space-y-4">
          {/* Attendee Age Card */}
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">ATTENDEE AGE</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {overview?.dominantAgeGroup || '—'}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {overview?.ageStats?.trend === undefined || overview?.ageStats?.trend === null ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : overview?.ageStats?.trend >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      {renderTrend(overview?.ageStats?.trend)}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      {renderTrend(overview?.ageStats?.trend)}
                    </>
                  )}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {formatNumber(overview?.ageStats?.count)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Attendee Gender Card */}
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">ATTENDEE GENDER</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {overview?.dominantGender || '—'}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {overview?.genderStats?.trend === undefined || overview?.genderStats?.trend === null ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : overview?.genderStats?.trend >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      {renderTrend(overview?.genderStats?.trend)}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      {renderTrend(overview?.genderStats?.trend)}
                    </>
                  )}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {formatNumber(overview?.genderStats?.count)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Attendee Location Card */}
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">ATTENDEE LOCATION</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {overview?.topLocation || '—'}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {overview?.locationStats?.trend === undefined || overview?.locationStats?.trend === null ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : overview?.locationStats?.trend >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      {renderTrend(overview?.locationStats?.trend)}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      {renderTrend(overview?.locationStats?.trend)}
                    </>
                  )}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {formatNumber(overview?.locationStats?.count)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Attendee Interests Card */}
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">ATTENDEE INTERESTS</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {overview?.topInterest || '—'}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {overview?.interestStats?.trend === undefined || overview?.interestStats?.trend === null ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : overview?.interestStats?.trend >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      {renderTrend(overview?.interestStats?.trend)}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      {renderTrend(overview?.interestStats?.trend)}
                    </>
                  )}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {formatNumber(overview?.interestStats?.count)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Engagement Card */}
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">TOTAL ENGAGEMENT</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {overview?.socialEngagement?.platform || '—'}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {overview?.socialEngagement?.trend === undefined || overview?.socialEngagement?.trend === null ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : overview?.socialEngagement?.trend >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      {renderTrend(overview?.socialEngagement?.trend)}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      {renderTrend(overview?.socialEngagement?.trend)}
                    </>
                  )}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {formatNumber(overview?.socialEngagement?.count)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Charts / Content */}
        <div className="lg:col-span-3 space-y-6">
          {viewType === 'all' ? (
            <>
              {/* All Attendee Locations Bar Chart */}
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ALL ATTENDEE LOCATIONS</CardTitle>
                </CardHeader>
                <CardContent>
                  {(computedLocations && computedLocations.length > 0) ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={computedLocations.map(l => ({ city: l.city || l.location, count: l.count }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis 
                          dataKey="city" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm">No location data available</p>
                        <p className="text-xs text-gray-400">Data will appear once attendees register</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bottom Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendee Interests Pie Chart */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ATTENDEE INTERESTS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(computedInterests && computedInterests.length > 0) ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={computedInterests}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={40}
                              dataKey="value"
                              stroke="none"
                            >
                              {computedInterests.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || ['#8B5CF6','#3B82F6','#F59E0B','#10B981','#EF4444'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          {computedInterests.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color || ['#8B5CF6','#3B82F6','#F59E0B','#10B981','#EF4444'][index % 5] }}
                              ></div>
                              <span>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Star className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm">No interest data available</p>
                          <p className="text-xs text-gray-400">Data will appear once attendees register</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Attendee Ages Pie Chart */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ATTENDEE AGES</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(computedAges && computedAges.length > 0) ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={computedAges}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={40}
                              dataKey="value"
                              stroke="none"
                            >
                              {computedAges.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || ['#8B5CF6','#7C2D12','#10B981','#EAB308'][index % 4]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          {computedAges.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color || ['#8B5CF6','#7C2D12','#10B981','#EAB308'][index % 4] }}
                              ></div>
                              <span>{item.name || item.age}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm">No age data available</p>
                          <p className="text-xs text-gray-400">Data will appear once attendees register</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Locations table */}
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ATTENDEE LOCATIONS</CardTitle>
                </CardHeader>
                <CardContent>
                  {computedLocations && computedLocations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-2 pr-4">Location</th>
                            <th className="py-2">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {computedLocations.slice(0, 8).map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2 pr-4">{row.location || row.city}</td>
                              <td className="py-2">{formatNumber(row.count)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No location data available</div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* SINGLE EVENT LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendee Age Over Time (col-span-2) */}
                <Card className="bg-white shadow-sm lg:col-span-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ATTENDEE AGE</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(trends?.ageOverTime) && trends.ageOverTime.length ? (
                      <ResponsiveContainer width="100%" height={360}>
                        <LineChart data={trends.ageOverTime}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="18-24" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="25-34" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="35-44" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="45+" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[360px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm">No age trend data available</p>
                          <p className="text-xs text-gray-400">Select an event to view trends</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Engagement & Social Media Reach */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-lg font-bold text-gray-900">Engagement & Social Media Reach</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y">
                      {(overview?.socialBreakdown || overview?.engagementBreakdown || [
                        { label: 'Instagram Mentions', value: overview?.socialEngagement?.instagram },
                        { label: 'Facebook Shares', value: overview?.socialEngagement?.facebook },
                        { label: 'Twitter Tweets', value: overview?.socialEngagement?.twitter },
                        { label: 'Event Check-ins (QR scans)', value: overview?.checkIns }
                      ]).filter(Boolean).map((item, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.label || item.name}</span>
                          <span className="font-medium text-gray-900">{formatNumber(item.value ?? item.count)}</span>
                        </div>
                      ))}
                    </div>
                    {overview?.socialTotal ? (
                      <div className="mt-4 text-xs text-gray-500">TOTAL COUNT : {formatNumber(overview.socialTotal)}</div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row: interests, locations chart, table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Interests */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ATTENDEE INTERESTS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(computedInterests && computedInterests.length > 0) ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={computedInterests} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" stroke="none">
                            {computedInterests.map((entry, index) => (
                              <Cell key={`si-cell-${index}`} fill={entry.color || ['#8B5CF6','#3B82F6','#F59E0B','#10B981','#EF4444'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[240px] flex items-center justify-center text-gray-500">No interest data</div>
                    )}
                  </CardContent>
                </Card>

                {/* Locations Bar */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ATTENDEE LOCATIONS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(computedLocations && computedLocations.length > 0) ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={computedLocations.map(l => ({ city: l.city || l.location, count: l.count }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[240px] flex items-center justify-center text-gray-500">No location data</div>
                    )}
                  </CardContent>
                </Card>

                {/* Locations Table */}
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900 uppercase tracking-wide">ATTENDEE LOCATIONS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {computedLocations && computedLocations.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600">
                              <th className="py-2 pr-4">Location</th>
                              <th className="py-2">Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {computedLocations.slice(0, 8).map((row, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="py-2 pr-4">{row.location || row.city}</td>
                                <td className="py-2">{formatNumber(row.count)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No location data available</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendeeInsights;
