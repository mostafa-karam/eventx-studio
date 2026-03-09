import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, FileText, Building2, Calendar, DollarSign, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const statusConfig = {
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const formatCurrency = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';

function generateInvoicePDF(booking) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header bar
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, 22);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('EventX Studio', 20, 32);
    doc.text(`Invoice #${booking._id?.slice(-8).toUpperCase() || 'N/A'}`, 150, 22);
    doc.text(`Date: ${formatDate(booking.approvedAt || booking.createdAt)}`, 150, 32);

    // Bill to
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.organizer?.name || 'Organizer', 20, 62);
    doc.text(booking.organizer?.email || '', 20, 69);

    // Line items table header
    doc.setFillColor(243, 244, 246);
    doc.rect(15, 82, 180, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Description', 20, 89);
    doc.text('Start Date', 85, 89);
    doc.text('End Date', 120, 89);
    doc.text('Amount', 170, 89);

    // Line item
    doc.setFont('helvetica', 'normal');
    doc.text(booking.hall?.name || 'Hall Rental', 20, 99);
    doc.text(formatDate(booking.startDate), 85, 99);
    doc.text(formatDate(booking.endDate), 120, 99);
    doc.text(formatCurrency(booking.totalPrice), 170, 99);

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.line(15, 105, 195, 105);

    // Total
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text('Total Due:', 130, 117);
    doc.text(formatCurrency(booking.totalPrice), 170, 117);

    // Notes
    doc.setTextColor(107, 114, 128); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Thank you for choosing EventX Studio. For questions, contact billing@eventxstudio.com', 20, 135);

    doc.save(`Invoice-${booking._id?.slice(-8) || 'booking'}.pdf`);
}

export default function OrganizerInvoiceHistory() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/hall-bookings/my`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error('Failed to load bookings');
                const data = await res.json();
                setBookings(data.data?.bookings || data.data || []);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const totalPaid = bookings
        .filter(b => b.status === 'approved')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    if (loading) return (
        <div className="p-6 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Invoice History</h1>
                    <p className="text-gray-500 mt-1">Download PDF invoices for all your hall bookings</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Total Paid</p>
                    <p className="text-2xl font-black text-indigo-600">{formatCurrency(totalPaid)}</p>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(statusConfig).map(([status, cfg]) => {
                    const count = bookings.filter(b => b.status === status).length;
                    return (
                        <Card key={status} className="border-0 shadow-md">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                                    <cfg.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-gray-900">{count}</p>
                                    <p className="text-xs text-gray-500">{cfg.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Table */}
            {error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No bookings yet</p>
                    <p className="text-sm">Your hall booking invoices will appear here</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                                <tr>
                                    <th className="px-5 py-3 text-left">Hall</th>
                                    <th className="px-5 py-3 text-left">Dates</th>
                                    <th className="px-5 py-3 text-left">Amount</th>
                                    <th className="px-5 py-3 text-left">Status</th>
                                    <th className="px-5 py-3 text-left">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bookings.map(booking => {
                                    const cfg = statusConfig[booking.status] || statusConfig.pending;
                                    return (
                                        <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                                    <span className="font-medium text-gray-900">{booking.hall?.name || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    <span>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="font-semibold text-gray-900">{formatCurrency(booking.totalPrice)}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge className={`${cfg.color} border-0 text-xs font-semibold`}>{cfg.label}</Badge>
                                            </td>
                                            <td className="px-5 py-4">
                                                {booking.status === 'approved' ? (
                                                    <Button variant="outline" size="sm" onClick={() => generateInvoicePDF(booking)}
                                                        className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                                        <Download className="w-3 h-3" /> PDF
                                                    </Button>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">N/A</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
