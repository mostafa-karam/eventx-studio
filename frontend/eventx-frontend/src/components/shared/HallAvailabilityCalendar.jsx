import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HallAvailabilityCalendar({ hallId }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    // Load just the approved bookings for the selected month to show unavailable days
    useEffect(() => {
        const fetchMonthBookings = async () => {
            try {
                setLoading(true);
                // We'd ideally fetch /api/halls/:hallId/availability?year=...&month=...
                // But since this endpoint doesn't exist, we fetch from the public events that have this hall
                const res = await fetch(`${API_BASE_URL}/public/events`, { headers: { 'Content-Type': 'application/json' } });
                const data = await res.json();
                if (res.ok) {
                    const events = data.data?.events || [];
                    // Filter events occurring in this hall
                    const hallEvents = events.filter(e => e.venue === hallId || e.hall === hallId || (e.hall && e.hall._id === hallId));
                    setBookings(hallEvents);
                }
            } catch (e) {
                console.error('Failed to load availability:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchMonthBookings();
    }, [hallId, month, year]);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const isBooked = (day) => {
        return bookings.some(b => {
            const d = new Date(b.date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };

    const isPast = (day) => {
        const d = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
    };

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    return (
        <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-indigo-600 text-white rounded-t-xl pb-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-indigo-200" />
                        Availability Calendar
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={prevMonth} className="text-white hover:bg-indigo-700 hover:text-white rounded-full p-2 h-auto">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <span className="font-semibold text-lg min-w-32 text-center">{MONTHS[month]} {year}</span>
                        <Button variant="ghost" size="sm" onClick={nextMonth} className="text-white hover:bg-indigo-700 hover:text-white rounded-full p-2 h-auto">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">{d}</div>
                    ))}
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, i) => {
                            if (day === null) return <div key={`empty-${i}`} className="h-12 border border-transparent rounded-lg bg-gray-50/50" />;

                            const booked = isBooked(day);
                            const past = isPast(day);

                            let style = "h-12 rounded-lg border flex items-center justify-center text-sm font-medium transition-all ";
                            if (past) {
                                style += "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed";
                            } else if (booked) {
                                style += "bg-red-50 border-red-200 text-red-700 cursor-not-allowed relative after:absolute after:bottom-1 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full";
                            } else {
                                style += "bg-white border-green-200 text-green-700 hover:bg-green-50 shadow-sm cursor-pointer hover:border-green-400";
                            }

                            return (
                                <div key={`day-${day}`} className={style} title={past ? 'Past date' : booked ? 'Already booked' : 'Available to book'}>
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 border-t pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-50 border border-green-200" /> Available
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                            <div className="w-1 h-1 bg-red-500 rounded-full" />
                        </div> Booked
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200" /> Unavailable / Past
                    </div>
                </div>

                <div className="mt-8 text-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col items-center gap-3">
                    <p className="text-indigo-800 font-medium text-sm">Found an available date for your event?</p>
                    <Link to={`/halls/${hallId}/book`} className="w-full sm:w-auto">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                            Request Booking
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
