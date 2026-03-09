import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Calendar, ArrowLeft, Trophy, Users, Info } from 'lucide-react';
import { Button } from '../components/ui/button';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const OrganizerProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [organizer, setOrganizer] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                setLoading(true);

                // Fetch basic organizer info
                const orgRes = await fetch(`${API}/users/organizer/${id}`);
                const orgData = await orgRes.json();

                if (!orgData.success) {
                    throw new Error(orgData.message || 'Failed to load organizer profile');
                }
                setOrganizer(orgData.data.user);

                // Fetch organizer's public events
                const eventsRes = await fetch(`${API}/public/events?organizerId=${id}&limit=20`);
                const eventsData = await eventsRes.json();

                if (eventsData.success) {
                    setEvents(eventsData.data.events || []);
                }

            } catch (err) {
                console.error('Fetch organizer error:', err);
                setError(err.message || 'An error occurred loading the profile.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProfileData();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading organizer profile...</p>
            </div>
        );
    }

    if (error || !organizer) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Info className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Notice</h2>
                <p className="text-gray-600 mb-6">{error || 'Organizer not found.'}</p>
                <button onClick={() => navigate(-1)} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700 transition">
                    Go Back
                </button>
            </div>
        );
    }

    // Determine some "stats" based on the events fetched
    const stats = {
        totalEvents: events.length,
        upcomingEvents: events.filter(e => new Date(e.date) > new Date()).length
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header Area */}
            <div className="bg-white border-b shadow-sm sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Organizer Profile</h1>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-32 h-32 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-teal-500/20 shrink-0">
                        {organizer.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                            <h2 className="text-3xl font-bold text-gray-900">{organizer.name}</h2>
                            <span className="inline-block px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-100">
                                Verified Organizer
                            </span>
                        </div>
                        <p className="text-gray-500 mb-6 max-w-2xl">
                            Creating and managing events since {new Date(organizer.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
                        </p>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-gray-900">{stats.totalEvents}</span>
                                <span className="text-sm text-gray-500 font-medium">Total Events</span>
                            </div>
                            <div className="h-10 w-px bg-gray-200 hidden sm:block"></div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-teal-600">{stats.upcomingEvents}</span>
                                <span className="text-sm text-gray-500 font-medium">Upcoming Events</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Events List */}
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">Events by {organizer.name}</h3>
                </div>

                {events.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 shadow-sm">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium text-gray-900">No public events</p>
                        <p className="text-sm">This organizer hasn't published any events yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(event => (
                            <Link
                                key={event._id}
                                to={`/events/${event._id}`}
                                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                            >
                                <div className="h-48 bg-gray-100 relative overflow-hidden">
                                    {event.image ? (
                                        <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 group-hover:bg-gray-100 transition-colors">
                                            <Calendar className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                                        <span className="font-bold text-teal-600">
                                            {event.pricing?.amount > 0 ? `$${event.pricing.amount}` : 'Free'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-3 text-xs font-semibold text-teal-600 uppercase tracking-wider">
                                        {event.category || 'General'}
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors">{event.title}</h4>

                                    <div className="mt-auto space-y-2 text-sm text-gray-600 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span className="truncate">
                                                {new Date(event.date).toLocaleDateString()} at {event.time || new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span className="truncate">{event.venue?.name || 'Venue TBA'}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrganizerProfilePage;
