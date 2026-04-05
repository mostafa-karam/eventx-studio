import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const PaymentHistoryPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            // Since there's no dedicated GET /api/payments/history endpoint, 
            // we'll fetch tickets and extract payments from them
            const res = await fetch(`${API_BASE_URL}/tickets/my-tickets`, { credentials: 'include' });
            const data = await res.json();

            if (data.success) {
                // Filter tickets that have actual payment data and sort by date descending
                const paidTickets = data.data.tickets
                    .filter(t => t.payment && t.payment.amount > 0)
                    .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
                setPayments(paidTickets);
            } else {
                toast.error('Failed to load payment history');
            }
        } catch (error) {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment History</h1>
                <p className="text-gray-600">Review your past transactions and ticket purchases.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {payments.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No payment history</h3>
                        <p className="text-gray-500">You haven't made any paid purchases yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-medium border-b border-gray-100">Date</th>
                                    <th className="px-6 py-4 font-medium border-b border-gray-100">Event</th>
                                    <th className="px-6 py-4 font-medium border-b border-gray-100">Transaction ID</th>
                                    <th className="px-6 py-4 font-medium border-b border-gray-100">Method</th>
                                    <th className="px-6 py-4 font-medium border-b border-gray-100 flex justify-end">Amount</th>
                                    <th className="px-6 py-4 font-medium border-b border-gray-100 text-center">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payments.map(ticket => (
                                    <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {new Date(ticket.bookingDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/events/${ticket.event?._id}`} className="text-blue-600 font-medium hover:underline">
                                                {ticket.event?.title || 'Unknown Event'}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                            {ticket.payment?.transactionId || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                                            {ticket.payment?.paymentMethod || 'Card'}
                                            {ticket.payment?.paymentMethod === 'credit_card' && ticket.payment?.amount > 0 && ' (****)'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 flex justify-end">
                                            ${ticket.payment?.amount?.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <Link
                                                to={`/user/tickets/${ticket._id}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                View Ticket
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentHistoryPage;
