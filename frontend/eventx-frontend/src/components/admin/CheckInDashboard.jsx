import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QrCode, CheckCircle, XCircle, Camera, Loader2, Search, Users, Ticket, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function CheckInDashboard() {
    const { user } = useAuth();
    const [manualCode, setManualCode] = useState('');
    const [result, setResult] = useState(null); // { success, message, ticket }
    const [loading, setLoading] = useState(false);
    const [recentCheckins, setRecentCheckins] = useState([]);
    const [stats, setStats] = useState({ total: 0, checkedIn: 0, remaining: 0 });
    const [eventFilter, setEventFilter] = useState('');
    const inputRef = useRef();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const processCode = async (code) => {
        if (!code?.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            // Try to find ticket by QR code string first, then by ticket number
            const res = await fetch(`${API_BASE_URL}/tickets/${encodeURIComponent(code.trim())}/checkin`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
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

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Check-In Dashboard</h1>
                    <p className="text-gray-500 mt-1">Scan QR codes or enter ticket numbers to check in attendees</p>
                </div>
                <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">● Live</Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Tickets', value: stats.total || '—', icon: Ticket, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Checked In', value: stats.checkedIn || recentCheckins.length, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
                    { label: 'Remaining', value: stats.remaining || '—', icon: Users, color: 'bg-orange-50 text-orange-600' },
                ].map(s => (
                    <Card key={s.label} className="border-0 shadow-md">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                                <s.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                                <p className="text-sm text-gray-500">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scanner */}
                <Card className="border-0 shadow-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-indigo-600" /> Scan / Enter Ticket
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Manual input — acts as a barcode scanner target */}
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                value={manualCode}
                                onChange={e => setManualCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Scan QR or type ticket number + Enter"
                                className="pr-24 h-12 text-base font-mono"
                                autoComplete="off"
                            />
                            <Button
                                onClick={() => processCode(manualCode)}
                                disabled={loading || !manualCode.trim()}
                                className="absolute right-1 top-1 bottom-1 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                        </div>

                        <p className="text-xs text-gray-400 text-center">
                            Connect a QR scanner and it will auto-submit when it reads a code
                        </p>

                        {/* Result */}
                        {result && (
                            <div className={`rounded-2xl p-5 border-2 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <div className="flex items-start gap-3">
                                    {result.success
                                        ? <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0 mt-0.5" />
                                        : <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />}
                                    <div>
                                        <p className={`font-bold text-lg ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {result.success ? '✓ Checked In!' : '✗ Denied'}
                                        </p>
                                        <p className={`text-sm mt-0.5 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.message}
                                        </p>
                                        {result.ticket && (
                                            <div className="mt-3 space-y-1 text-sm text-green-700">
                                                <p><span className="font-semibold">Name:</span> {result.ticket?.user?.name || 'Attendee'}</p>
                                                <p><span className="font-semibold">Event:</span> {result.ticket?.event?.title || '—'}</p>
                                                <p><span className="font-semibold">Ticket #:</span> {result.ticket?.ticketNumber || '—'}</p>
                                                <p><span className="font-semibold">Seat:</span> {result.ticket?.seatNumber || 'General'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent check-ins */}
                <Card className="border-0 shadow-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" /> Recent Check-Ins
                            <span className="ml-auto text-sm font-normal text-gray-400">{recentCheckins.length} today</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentCheckins.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No check-ins yet</p>
                                <p className="text-sm">Scan a ticket to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {recentCheckins.map((t, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{t?.user?.name || 'Attendee'}</p>
                                            <p className="text-xs text-gray-500 truncate">{t?.event?.title || '—'} · #{t?.ticketNumber || '—'}</p>
                                        </div>
                                        <span className="text-xs text-green-600 font-mono whitespace-nowrap">
                                            {new Date(t.checkedInAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
