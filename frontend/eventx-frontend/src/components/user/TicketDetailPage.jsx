import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const TicketDetailPage = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchTicket();
        // eslint-disable-next-line
    }, [ticketId]);

    const fetchTicket = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/tickets/${ticketId}`);
            const data = await res.json();
            if (data.success) {
                setTicket({ ...data.data.ticket, qrCodeImage: data.data.qrCodeImage });
            } else {
                toast.error(data.message || 'Failed to load ticket');
                navigate('/user/tickets');
            }
        } catch (error) {
            toast.error('Network error');
            navigate('/user/tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async () => {
        if (!window.confirm('Are you sure you want to request a refund for this ticket? This action cannot be undone.')) return;

        try {
            setActionLoading(true);
            const res = await fetch(`/api/tickets/${ticketId}/refund`, { method: 'PUT' });
            const data = await res.json();

            if (data.success) {
                toast.success('Ticket refunded successfully');
                setTicket(data.data.ticket);
            } else {
                toast.error(data.message || 'Refund failed');
            }
        } catch (error) {
            toast.error('Network error during refund');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    if (!ticket) return null;

    const eventDate = new Date(ticket.event?.date);
    const isPast = eventDate < new Date();
    const canRefund = !isPast && ticket.status !== 'cancelled' && ticket.status !== 'refunded' && ticket.status !== 'used';

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl min-h-screen">
            <Link to="/user/tickets" className="text-gray-500 hover:text-indigo-600 font-medium mb-8 inline-flex items-center no-print transition-colors duration-200">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to My Tickets
            </Link>

            <div className="relative print-styles group">
                {/* Background Shadow Effect */}
                <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-[3rem] -z-10 group-hover:bg-indigo-500/20 transition-all duration-500"></div>

                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative ring-1 ring-gray-100">

                    {/* Left Section - Event Details */}
                    <div className="flex-grow flex flex-col relative z-10 basis-2/3">
                        {/* Event Header with Gradient */}
                        <div className={`p-8 md:p-10 text-white relative overflow-hidden ${ticket.status === 'valid' || ticket.status === 'booked'
                            ? 'bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900'
                            : ticket.status === 'used'
                                ? 'bg-gradient-to-br from-emerald-600 to-emerald-900'
                                : 'bg-gradient-to-br from-rose-600 to-rose-900'
                            }`}>
                            {/* Decorative Background Pattern */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <span className="uppercase tracking-[0.2em] text-xs font-bold text-white/80 mb-3 block">
                                        {ticket.event?.category || 'General Admission'}
                                    </span>
                                    <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight tracking-tight">
                                        {ticket.event?.title}
                                    </h1>
                                    <p className="text-white/90 font-medium flex items-center gap-2">
                                        <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        {eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-6">
                                    <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border border-white/30 shadow-sm">
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Event Details Grid */}
                        <div className="p-8 md:p-10 bg-white flex-grow">
                            <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        Attendee
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">{ticket.user?.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                                        Order Number
                                    </p>
                                    <p className="text-lg font-mono font-bold text-indigo-600">{ticket.ticketId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        Venue
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">{ticket.event?.venue?.name}</p>
                                    <p className="text-sm font-medium text-gray-500 mt-1">{ticket.event?.venue?.address}, {ticket.event?.venue?.city}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                                        Seat / Type
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">{ticket.seatNumber || 'N/A'}</p>
                                    <p className="text-sm font-medium text-gray-500 mt-1">{ticket.payment?.amount > 0 ? `$${ticket.payment.amount}` : 'Free Entry'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider with semi-circles for the physical ticket look */}
                    <div className="relative flex flex-row md:flex-col items-center z-20">
                        {/* Top / Left Cutout */}
                        <div className="absolute md:-top-3 -left-3 md:left-1/2 md:-translate-x-1/2 w-6 h-6 bg-gray-50 rounded-full shadow-inner z-30 ring-1 ring-inset ring-gray-200"></div>

                        {/* Dashed Line */}
                        <div className="w-full h-px md:w-px md:h-full border-t-2 md:border-l-2 border-dashed border-gray-300 mx-auto"></div>

                        {/* Bottom / Right Cutout */}
                        <div className="absolute md:-bottom-3 -right-3 md:left-1/2 md:-translate-x-1/2 w-6 h-6 bg-gray-50 rounded-full shadow-inner z-30 ring-1 ring-inset ring-gray-200"></div>
                    </div>

                    {/* Right Section - QR Code */}
                    <div className="bg-gray-50 p-8 md:p-10 flex flex-col items-center justify-center basis-1/3 min-w-[300px] relative">
                        <div className="text-center w-full">
                            <span className="uppercase tracking-[0.2em] text-xs font-bold text-gray-400 mb-6 block">Entry Pass</span>

                            <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 mb-6 mx-auto w-max transform hover:scale-105 transition-transform duration-300">
                                {ticket.qrCodeImage ? (
                                    <img src={ticket.qrCodeImage} alt="Ticket QR Code" className="w-48 h-48 filter contrast-125 rounded-xl object-contain" />
                                ) : (
                                    <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 flex-col gap-2">
                                        <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        <span className="font-medium text-sm">QR Unavailable</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white/60 rounded-xl py-3 px-4 border border-gray-200 inline-block w-full text-center">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Ticket ID</p>
                                <p className="text-sm text-gray-800 font-mono font-semibold tracking-wider">{ticket._id}</p>
                            </div>

                            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 font-medium text-sm">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Scan at entrance
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-end no-print items-center">
                {canRefund && (
                    <button
                        onClick={handleRefund}
                        disabled={actionLoading}
                        className="px-8 py-3.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold hover:bg-rose-100 hover:border-rose-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mr-auto flex items-center gap-2"
                    >
                        {actionLoading ? (
                            <><div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div> Processing...</>
                        ) : (
                            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"></path></svg> Request Refund</>
                        )}
                    </button>
                )}

                <button
                    onClick={handlePrint}
                    className="px-8 py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Print or Save PDF
                </button>
            </div>

            {/* CSS injected for printing */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * { visibility: hidden; }
          .print-styles, .print-styles * { visibility: visible; }
          .print-styles { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          .no-print { display: none; }
        }
      `}} />
        </div>
    );
};

export default TicketDetailPage;
