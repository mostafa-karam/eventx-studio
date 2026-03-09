import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Filter, Calendar, MapPin, Tag, Users, Ticket, X, ChevronDown,
    ArrowRight, Globe, Music, Briefcase, BookOpen, Zap, Star
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const CATEGORIES = [
    { value: '', label: 'All Categories', icon: Globe },
    { value: 'conference', label: 'Conference', icon: Briefcase },
    { value: 'workshop', label: 'Workshop', icon: BookOpen },
    { value: 'seminar', label: 'Seminar', icon: Users },
    { value: 'concert', label: 'Concert', icon: Music },
    { value: 'exhibition', label: 'Exhibition', icon: Star },
    { value: 'networking', label: 'Networking', icon: Zap },
    { value: 'other', label: 'Other', icon: Tag },
];

const EventCard = ({ event, onClick }) => {
    const date = new Date(event.date);
    const isFree = event.pricing?.type === 'free';
    return (
        <div onClick={onClick} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer">
            {/* Image / Banner */}
            <div className="h-40 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
                {event.images?.[0]?.url ? (
                    <img src={event.images[0].url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <Calendar className="w-16 h-16 text-white" />
                    </div>
                )}
                <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-md ${isFree ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                        {isFree ? 'FREE' : `$${event.pricing?.amount}`}
                    </span>
                    {(event.seating?.availableSeats === 0) && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-md animate-pulse">
                            Sold Out
                        </span>
                    )}
                </div>
                <div className="absolute top-3 right-3 z-10">
                    <span className="px-2 py-1 rounded-full text-xs bg-black/50 text-white backdrop-blur-md uppercase tracking-wider font-medium">
                        {event.category}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {event.title}
                </h3>
                <p className="text-gray-500 text-sm mb-3 line-clamp-2">{event.description}</p>

                <div className="space-y-1.5 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span className="truncate">{event.venue?.name}, {event.venue?.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Ticket className={`w-4 h-4 flex-shrink-0 ${event.seating?.availableSeats === 0 ? 'text-red-400' : 'text-purple-400'}`} />
                        <span className={event.seating?.availableSeats === 0 ? 'text-red-600 font-medium' : ''}>
                            {event.seating?.availableSeats === 0 ? 'No seats left' : `${event.seating?.availableSeats} seats available`}
                        </span>
                    </div>
                </div>

                <button className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white">
                    View Event <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const PublicEventsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [category, setCategory] = useState(searchParams.get('category') || '');
    const [pricing, setPricing] = useState(searchParams.get('pricing') || '');
    const [city, setCity] = useState(searchParams.get('city') || '');
    const [page, setPage] = useState(1);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: 12 });
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (pricing) params.set('pricing', pricing);
        if (city) params.set('city', city);

        try {
            const res = await fetch(`${API}/public/events?${params}`);
            const data = await res.json();
            if (data.success) {
                setEvents(data.data.events);
                setPagination(data.data.pagination);
            }
        } catch {
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [search, category, pricing, city, page]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchEvents();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero / Nav */}
            <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-600 text-white grid place-items-center font-bold text-sm">EX</div>
                        <span className="font-semibold text-gray-900 hidden sm:block">EventX Studio</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/halls" className="text-sm text-gray-600 hover:text-gray-900">Browse Halls</Link>
                        <Link to="/auth" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Sign In</Link>
                    </div>
                </div>
            </header>

            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Discover Amazing Events</h1>
                    <p className="text-blue-100 mb-8">Browse conferences, workshops, concerts and more — all in one place</p>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search events, topics, venues..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
                            />
                        </div>
                        <button type="submit" className="px-5 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors">
                            Search
                        </button>
                    </form>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Category pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                    {CATEGORIES.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            onClick={() => { setCategory(value); setPage(1); }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${category === value
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'bg-white border text-gray-600 hover:border-blue-300 hover:text-blue-600'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Filter bar */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <button onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filters
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>

                    {showFilters && (
                        <>
                            <select value={pricing} onChange={(e) => { setPricing(e.target.value); setPage(1); }}
                                className="px-3 py-2 border rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Any Price</option>
                                <option value="free">Free</option>
                                <option value="paid">Paid</option>
                            </select>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City..."
                                className="px-3 py-2 border rounded-xl text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </>
                    )}

                    {(category || pricing || city || search) && (
                        <button onClick={() => { setCategory(''); setPricing(''); setCity(''); setSearch(''); setPage(1); }}
                            className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition-colors">
                            <X className="w-3.5 h-3.5" /> Clear filters
                        </button>
                    )}

                    <span className="text-sm text-gray-400 ml-auto">
                        {pagination.total || 0} events found
                    </span>
                </div>

                {/* Event Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border animate-pulse">
                                <div className="h-40 bg-gray-200 rounded-t-2xl" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-full" />
                                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-20">
                        <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No events found</h3>
                        <p className="text-gray-400">Try adjusting your filters or search terms</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {events.map((event) => (
                            <EventCard key={event._id} event={event} onClick={() => navigate('/auth')} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex justify-center gap-2 mt-10">
                        {[...Array(pagination.pages)].map((_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:border-blue-300'
                                    }`}>
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
                    <h2 className="text-2xl font-bold mb-2">Want to buy tickets or save favorites?</h2>
                    <p className="text-blue-100 mb-6">Create a free account to book tickets, save favorites, and get event reminders.</p>
                    <div className="flex gap-3 justify-center">
                        <Link to="/auth" className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors">
                            Sign Up Free
                        </Link>
                        <Link to="/auth" className="px-6 py-3 border border-white/30 text-white rounded-xl hover:bg-white/10 transition-colors">
                            Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicEventsPage;
