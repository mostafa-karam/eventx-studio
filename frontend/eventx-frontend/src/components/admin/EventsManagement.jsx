import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Calendar, MapPin, Users, DollarSign, Search, Plus, Edit, Trash2, Eye,
  MoreHorizontal, Filter, Copy, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, ArrowUpDown, ChevronDown, Ticket, AlertTriangle
} from 'lucide-react';

const EventsManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === 'admin' ? '/admin' : '/organizer';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [cloneLoading, setCloneLoading] = useState(null);
  
  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Custom Delete Modal State
  const [itemToDelete, setItemToDelete] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchEvents();
  }, [categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on search/filter 
  }, [searchTerm, categoryFilter, specificDate]);

  useEffect(() => {
    if (specificDate) {
      setDateFrom(specificDate);
      setDateTo(specificDate);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  }, [specificDate]);

  const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 ${className}`}>
      {children}
    </div>
  );

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // We'll handle search locally for better UX, but keep API filters for categories/dates
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`${API_BASE_URL}/events/admin/my-events?${params}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events || []);
      } else {
        setError('Failed to load events');
      }
    } catch (error) {
      console.error('Events fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (evt) => {
    const current = evt.status || 'draft';
    const nextStatus = current === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`${API_BASE_URL}/events/${evt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Failed to update status');
      }
      setEvents((prev) => prev.map((e) => (e._id === evt._id ? { ...e, status: nextStatus } : e)));
      setActiveDropdown(null);
    } catch (e) {
      console.error('Publish toggle error:', e);
      setError(e.message || 'Failed to update status');
    }
  };

  const triggerDelete = (eventId) => {
    setItemToDelete(eventId);
    setActiveDropdown(null);
  };

  const handleDeleteEvent = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(itemToDelete);
    try {
      const response = await fetch(`${API_BASE_URL}/events/${itemToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setEvents(events.filter(event => event._id !== itemToDelete));
        setItemToDelete(null);
      } else {
        setError('Failed to delete event');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Network error. Please try again.');
    } finally {
      setDeleteLoading(null);
      setItemToDelete(null);
    }
  };

  const handleCloneEvent = async (eventId) => {
    setCloneLoading(eventId);
    setError('');
    setActiveDropdown(null);
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents([data.data.event, ...events]);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to clone event');
      }
    } catch (error) {
      console.error('Clone error:', error);
      setError('Network error. Please try again.');
    } finally {
      setCloneLoading(null);
    }
  };

  // Process data for table
  const processedEvents = useMemo(() => {
    let result = [...events];
    
    // Apply local search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.title?.toLowerCase().includes(lowerSearch) || 
        e.venue?.name?.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'tickets') {
          aVal = a.seating?.totalSeats || 0;
          bVal = b.seating?.totalSeats || 0;
        } else if (sortConfig.key === 'price') {
          aVal = a.pricing?.amount || 0;
          bVal = b.pricing?.amount || 0;
        } else if (sortConfig.key === 'date') {
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
        } else if (sortConfig.key === 'status') {
          aVal = a.status || 'draft';
          bVal = b.status || 'draft';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [events, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedEvents.length / itemsPerPage) || 1;
  const currentEvents = processedEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const formatDate = (dateString, includeTime = true) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);

    if (eventDate < now) {
      return { label: 'Past', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    } else if ((event?.seating?.availableSeats ?? 0) === 0 && (event?.seating?.totalSeats ?? 0) > 0) {
      return { label: 'Sold Out', color: 'bg-red-50 text-red-700 border-red-200' };
    } else {
      return { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const getCategoryEmoji = (category) => {
    const map = { music: '🎵', sports: '🏆', conference: '💼', workshop: '🛠️', festival: '🎪' };
    return map[category] || '📅';
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="text-gray-900">Events Directory</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage and track all scheduled events</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-gray-900 hover:bg-black text-white shadow-md rounded-xl" onClick={() => navigate(`${basePath}/events/create`)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Events', val: events.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 pt-2 shadow-inner' },
          { label: 'Published', val: events.filter(e => e.status === 'published').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Drafts', val: events.filter(e => e.status !== 'published').length, icon: Edit, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Tickets', val: events.reduce((s, e) => s + (e.seating?.totalSeats || 0), 0), icon: Ticket, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((stat, i) => (
          <GlassCard key={i} className="p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900">{stat.val}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} shadow-sm border border-white/50`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </GlassCard>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Table Container */}
      <GlassCard className="flex flex-col">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
              <input
                placeholder="Search events by name or venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700"
              />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700 cursor-pointer font-medium"
              >
                <option value="all">All Categories</option>
                <option value="music">🎵 Music</option>
                <option value="sports">🏆 Sports</option>
                <option value="conference">💼 Conference</option>
                <option value="workshop">🛠️ Workshop</option>
                <option value="festival">🎪 Festival</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Button variant="outline" className="bg-white border-gray-200 shadow-sm rounded-xl text-gray-700 hidden sm:flex">
              <Filter className="w-4 h-4 mr-2 text-gray-500" /> Filters
            </Button>
            <div className="relative flex-1 sm:flex-none">
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700 font-medium cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
             <div className="p-8 space-y-4">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="animate-pulse flex items-center gap-4">
                   <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                   <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                   <div className="h-4 bg-gray-200 rounded w-1/5 ml-auto"></div>
                   <div className="h-8 bg-gray-200 rounded w-16"></div>
                 </div>
               ))}
             </div>
          ) : currentEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[400px]">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No events found</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                We couldn't find any events matching your current filters. Try adjusting your search or create a new event.
              </p>
              {!searchTerm && !specificDate && categoryFilter === 'all' && (
                <Button className="bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20" onClick={() => navigate(`${basePath}/events/create`)}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Event
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('title')}>
                    <div className="flex items-center gap-2">Event <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('date')}>
                    <div className="flex items-center gap-2">Date & Venue <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('status')}>
                    <div className="flex items-center gap-2">Status <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('price')}>
                    <div className="flex items-center gap-2">Price <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('tickets')}>
                    <div className="flex items-center gap-2">Tickets Sold <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentEvents.map((event) => {
                  const evtState = getEventStatus(event);
                  const isPublished = event.status === 'published';
                  const totalSeats = event?.seating?.totalSeats || 0;
                  const availableSeats = event?.seating?.availableSeats || 0;
                  const soldSeats = Math.max(0, totalSeats - availableSeats);
                  const progress = totalSeats > 0 ? (soldSeats / totalSeats) * 100 : 0;
                  
                  return (
                    <tr key={event._id} className="bg-white hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-lg shadow-sm">
                            {getCategoryEmoji(event.category)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors max-w-[200px] truncate">{event.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5 capitalize">{event.category || 'Event'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(event.date, false)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate max-w-[150px]">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{event?.venue?.name || 'TBD'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${isPublished ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {isPublished ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${evtState.color}`}>
                            {evtState.label.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {event.pricing?.type === 'free' ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-xs">FREE</span>
                          ) : (
                            `$${event.pricing?.amount || 0}`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-gray-700">{soldSeats}</span>
                            <span className="text-gray-400">/ {totalSeats}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${progress >= 100 ? 'bg-red-500' : progress > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium">{Math.round(progress)}% sold</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block text-left action-dropdown-container">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === event._id ? null : event._id)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                          
                          {activeDropdown === event._id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                              <button onClick={() => { navigate(`${basePath}/events/edit/${event._id}`); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-medium">
                                <Edit className="w-4 h-4 mr-2" /> Edit Event
                              </button>
                              <button onClick={() => togglePublish(event)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-medium">
                                {isPublished ? <XCircle className="w-4 h-4 mr-2 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />}
                                {isPublished ? 'Unpublish' : 'Publish'}
                              </button>
                              <button onClick={() => handleCloneEvent(event._id)} disabled={cloneLoading === event._id} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-medium">
                                <Copy className="w-4 h-4 mr-2" /> {cloneLoading === event._id ? 'Cloning...' : 'Clone Event'}
                              </button>
                              <div className="h-px bg-gray-100 my-1"></div>
                              <button onClick={() => triggerDelete(event._id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center font-medium">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && processedEvents.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, processedEvents.length)}</span> of <span className="font-bold text-gray-900">{processedEvents.length}</span> entries
            </span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Simple page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-colors ${
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 tracking-tight mb-2">Delete Event?</h3>
            <p className="text-sm text-gray-500 text-center font-medium mb-8">
              Are you sure you want to delete this event? This action cannot be undone and will permanently remove all associated tickets and data.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleDeleteEvent} 
                disabled={deleteLoading !== null}
                className="w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold h-12 shadow-md shadow-red-500/20"
              >
                {deleteLoading !== null ? 'Deleting...' : 'Yes, delete event'}
              </Button>
              <Button 
                onClick={() => setItemToDelete(null)}
                variant="outline"
                className="w-full rounded-2xl bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-bold h-12 shadow-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsManagement;
