import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Loader2, MapPin, Clock, Ticket } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const categoryColors = {
    conference: 'bg-blue-500',
    workshop: 'bg-indigo-500',
    seminar: 'bg-emerald-500',
    concert: 'bg-pink-500',
    sports: 'bg-orange-500',
    exhibition: 'bg-purple-500',
    networking: 'bg-teal-500',
    other: 'bg-gray-500',
};

const EventCalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [view, setView] = useState('month'); // month | list

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/public/events?limit=100`, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await response.json();
                if (data.success) {
                    setEvents(data.data?.events || []);
                }
            } catch (error) {
                console.error('Failed to fetch events:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getEventsForDate = (day) => {
        return events.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === day;
        });
    };

    const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    const formatTime = (dateStr) =>
        new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const formatCurrency = (amount, currency = 'USD') =>
        amount === 0 ? 'Free' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

    // Calendar grid
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-600 text-white grid place-items-center font-bold shadow-sm">EX</div>
                        <span className="text-lg font-semibold text-gray-900">EventX Studio</span>
                    </Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link to="/events" className="text-gray-600 hover:text-gray-900">Events</Link>
                        <Link to="/halls" className="text-gray-600 hover:text-gray-900">Halls</Link>
                        <Link to="/auth" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Sign in</Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Calendar className="h-8 w-8 text-blue-600" />
                            Event Calendar
                        </h1>
                        <p className="text-gray-500 mt-1">Browse upcoming events by date</p>
                    </div>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setView('month')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${view === 'month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Calendar</button>
                        <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>List</button>
                    </div>
                </div>

                {view === 'month' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Calendar */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl border p-6 shadow-sm">
                                {/* Month Navigation */}
                                <div className="flex items-center justify-between mb-6">
                                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                                    </button>
                                    <h2 className="text-xl font-bold text-gray-900">{MONTHS[month]} {year}</h2>
                                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                        <ChevronRight className="h-5 w-5 text-gray-600" />
                                    </button>
                                </div>

                                {/* Day Headers */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {DAYS.map(day => (
                                        <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">{day}</div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((day, i) => {
                                        if (!day) return <div key={`empty-${i}`} className="aspect-square" />;

                                        const dayEvents = getEventsForDate(day);
                                        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                                        const isSelected = selectedDate === day;

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDate(isSelected ? null : day)}
                                                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 ${isSelected ? 'bg-blue-600 text-white shadow-lg scale-105' :
                                                    isToday ? 'bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-200' :
                                                        dayEvents.length > 0 ? 'bg-gray-50 hover:bg-gray-100 font-medium' :
                                                            'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className="text-sm">{day}</span>
                                                {dayEvents.length > 0 && (
                                                    <div className="flex gap-0.5 mt-1">
                                                        {dayEvents.slice(0, 3).map((e, j) => (
                                                            <span
                                                                key={j}
                                                                className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : categoryColors[e.category] || 'bg-gray-400'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="mt-6 pt-4 border-t flex flex-wrap gap-3">
                                    {Object.entries(categoryColors).map(([cat, color]) => (
                                        <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar — Selected Date Events */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl border p-6 shadow-sm sticky top-24">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    {selectedDate
                                        ? `${MONTHS[month]} ${selectedDate}, ${year}`
                                        : 'Select a date'}
                                </h3>

                                {!selectedDate ? (
                                    <p className="text-sm text-gray-400">Click on a date to see events</p>
                                ) : selectedEvents.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400">No events on this date</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedEvents.map(event => (
                                            <Link
                                                key={event._id}
                                                to={`/events`}
                                                className="block p-4 rounded-xl border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className={`w-2 h-full min-h-[3rem] rounded-full ${categoryColors[event.category] || 'bg-gray-400'}`} />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900 text-sm">{event.title}</h4>
                                                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                            <Clock className="h-3 w-3" />
                                                            {formatTime(event.date)}
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                            <MapPin className="h-3 w-3" />
                                                            {event.venue?.name || 'TBA'}
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${categoryColors[event.category]} text-white`}>
                                                                {event.category}
                                                            </span>
                                                            <span className="text-xs font-semibold text-gray-700">
                                                                {formatCurrency(event.pricing?.amount || 0, event.pricing?.currency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            Upcoming Events List
                        </h2>
                        {events.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No events found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {events.map(event => (
                                    <Link key={event._id} to={`/events`} className="group flex flex-col p-5 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all bg-white">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColors[event.category] || 'bg-gray-400'} text-white`}>
                                                {event.category.toUpperCase()}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{event.title}</h3>
                                        <div className="space-y-2 mb-4 text-sm text-gray-600 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(event.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span className="truncate">{event.venue?.name || 'TBA'}</span>
                                            </div>
                                        </div>
                                        <div className="border-t pt-3 flex items-center justify-between">
                                            <span className="font-bold text-gray-900">
                                                {formatCurrency(event.pricing?.amount || 0, event.pricing?.currency)}
                                            </span>
                                            <span className="text-sm font-medium text-blue-600 group-hover:underline">View Details</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default EventCalendarPage;
