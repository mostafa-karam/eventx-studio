import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QrCode, CheckCircle, XCircle, Camera, Loader2, Search, Users, Ticket, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function CheckInDashboard() {
    const { user } = useAuth();
    const [manualCode, setManualCode] = useState('');
    const [result, setResult] = useState(null); // { success, message, ticket }
    const [loading, setLoading] = useState(false);
    const [recentCheckins, setRecentCheckins] = useState([]);
    const [stats, setStats] = useState({ total: 0, checkedIn: 0, remaining: 0 });
    const [eventFilter, setEventFilter] = useState('');
    const [events, setEvents] = useState([]);
    const inputRef = useRef();

    useEffect(() => {
        inputRef.current?.focus();
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/events`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) setEvents(data.data?.events || []);
        } catch (e) {
            console.error("Failed to load events for check-in filter");
        }
    };

    const processCode = async (code) => {
        if (!code?.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            // Try to find ticket by QR code string first, then by ticket number
            const endpoint = `${API_BASE_URL}/tickets/lookup-qr`;
                
            const res = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrCode: code.trim(), eventId: eventFilter === 'all_events' ? '' : eventFilter })
            });
            const data = await res.json();
            const newResult = { success: res.ok, message: data.message || (res.ok ? 'Check-in successful!' : 'Check-in failed'), ticket: data.data?.ticket };
            setResult(newResult);
            if (res.ok && data.data?.ticket) {
                setRecentCheckins(prev => [{ ...data.data.ticket, checkedInAt: new Date() }, ...prev.slice(0, 19)]);
                setStats(prev => ({ ...prev, checkedIn: prev.checkedIn + 1, remaining: Math.max(0, prev.remaining - 1) }));
            }
        } catch {
            setResult({ success: false, message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
            setManualCode('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') processCode(manualCode);
    };

    const WhiteCard = ({ children, className = '' }) => (
        <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-gray-900">Check-In Dashboard</span>
                        <Badge className="bg-emerald-100/50 text-emerald-700 text-xs uppercase font-bold tracking-widest px-3 py-1 border-0 rounded-full flex gap-1.5 items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live
                        </Badge>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Scan QR codes or enter ticket numbers to check in attendees</p>
                </div>
                <div className="w-full md:w-64 mt-4 md:mt-0">
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                        <SelectTrigger className="bg-white border-gray-200 rounded-xl focus:ring-blue-100 font-medium">
                            <SelectValue placeholder="All Events" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl border-gray-100">
                            <SelectItem value="all_events">All Events</SelectItem>
                            {events.map(ev => (
                                <SelectItem key={ev._id} value={ev._id}>{ev.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                    { label: 'Total Tickets', val: stats.total || '—', icon: Ticket, gradient: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50 text-blue-600' },
                    { label: 'Checked In', val: stats.checkedIn || recentCheckins.length, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500', lightBg: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Remaining', val: stats.remaining || '—', icon: Users, gradient: 'from-amber-400 to-orange-500', lightBg: 'bg-amber-50 text-amber-600' }
                ].map((stat, i) => (
                    <div key={i} className={`group bg-white rounded-3xl p-6 flex flex-col justify-center h-[120px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}>
                        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>
                        
                        <div className="relative z-10 flex justify-between items-center">
                            <div className="flex-1 pr-3">
                                <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1.5">{stat.label}</p>
                                <h3 className={`text-[28px] font-black tracking-tight leading-none truncate capitalize text-gray-900`}>{stat.val}</h3>
                            </div>
                            <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${stat.lightBg} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        
                        <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scanner */}
                <WhiteCard className="flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-gray-400" /> 
                        <h2 className="text-lg font-bold text-gray-900">Scan / Enter Ticket</h2>
                    </div>
                    <div className="p-6 space-y-6 flex-1">
                        {/* Manual input — acts as a barcode scanner target */}
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                value={manualCode}
                                onChange={e => setManualCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Scan QR or type ticket number + Enter"
                                className="pr-16 h-14 text-lg font-mono rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-900"
                                autoComplete="off"
                            />
                            <Button
                                onClick={() => processCode(manualCode)}
                                disabled={loading || !manualCode.trim()}
                                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </Button>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100/50">
                           <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                           <p className="text-sm font-medium text-blue-800">
                               Connect a QR scanner. It will automatically submit when it successfully reads a Code from the attendee's ticket.
                           </p>
                        </div>

                        {/* Result */}
                        {result && (
                            <div className={`rounded-xl p-5 border shadow-sm transition-all duration-300 ${result.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${result.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {result.success ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-black text-xl ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
                                            {result.success ? 'Success: Checked In!' : 'Access Denied'}
                                        </p>
                                        <p className={`text-sm mt-1 font-medium ${result.success ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {result.message}
                                        </p>
                                        {result.ticket && (
                                            <div className="mt-4 pt-4 border-t border-emerald-200/50 space-y-2 text-sm text-emerald-900">
                                                <div className="flex justify-between items-center"><span className="font-bold text-emerald-700/80">Name</span> <span>{result.ticket?.user?.name || 'Attendee'}</span></div>
                                                <div className="flex justify-between items-center"><span className="font-bold text-emerald-700/80">Event</span> <span>{result.ticket?.event?.title || '—'}</span></div>
                                                <div className="flex justify-between items-center"><span className="font-bold text-emerald-700/80">Ticket #</span> <span className="font-mono">{result.ticket?.ticketNumber || '—'}</span></div>
                                                <div className="flex justify-between items-center"><span className="font-bold text-emerald-700/80">Seat</span> <span>{result.ticket?.seatNumber || 'General Admission'}</span></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </WhiteCard>

                {/* Recent check-ins */}
                <WhiteCard className="flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <CheckCircle className="w-5 h-5 text-emerald-500" /> 
                           <h2 className="text-lg font-bold text-gray-900">Recent Check-Ins</h2>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">{recentCheckins.length} Today</span>
                    </div>
                    <div className="p-0 flex-1">
                        {recentCheckins.length === 0 ? (
                            <div className="text-center py-16 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                   <QrCode className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="font-extrabold text-gray-900 text-lg">No check-ins yet</p>
                                <p className="text-gray-500 font-medium">Scan a ticket to view activity history</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                                {recentCheckins.map((t, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 hover:bg-emerald-50 transition-colors">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{t?.user?.name || 'Attendee'}</p>
                                            <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">{t?.event?.title || '—'} · <span className="font-mono text-gray-400">#{t?.ticketNumber || '—'}</span></p>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-2 py-1 rounded-md">
                                            {new Date(t.checkedInAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </WhiteCard>
            </div>
        </div>
    );
}
