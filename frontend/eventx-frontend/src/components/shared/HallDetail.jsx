import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft,
    Users,
    MapPin,
    Clock,
    CheckCircle2,
    CalendarDays,
    DollarSign,
    Building2,
    Info
} from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';

const HallDetail = ({ hall, onBack }) => {
    const { isOrganizer } = useAuth();
    const [bookingForm, setBookingForm] = useState({
        startDate: '',
        endDate: '',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    if (!hall) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500 mb-4">No hall selected.</p>
                <button onClick={onBack} className="text-indigo-600 font-medium hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await fetch(`${API_BASE_URL}/hall-bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hall: hall._id,
                    ...bookingForm
                })
            });
            const data = await res.json();

            if (data.success) {
                setSuccessMsg(data.message);
                setBookingForm({ startDate: '', endDate: '', notes: '' });
            } else {
                setErrorMsg(data.message || 'Failed to submit booking request');
            }
        } catch {
            setErrorMsg('An error occurred during booking submission');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <Breadcrumbs items={[
                { label: 'Browse Halls', onClick: onBack },
                { label: hall.name }
            ]} />

            {/* Header / Back */}
            <button
                onClick={onBack}
                className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
            >
                <ArrowLeft className="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform" />
                Back to Halls
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Details */}
                <div className="flex-1 space-y-8">
                    {/* Main Info */}
                    <div>
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{hall.name}</h1>
                                <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                                    <span className="flex items-center bg-gray-100 px-2.5 py-1 rounded-full">
                                        <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                                        {hall.location ? `${hall.location.floor} - ${hall.location.wing}` : 'Location TBD'}
                                    </span>
                                    <span className="flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                                        <Users className="w-4 h-4 mr-1.5" />
                                        Capacity: {hall.capacity}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-lg text-gray-600 mt-6 leading-relaxed">
                            {hall.description || 'No description available for this hall.'}
                        </p>
                    </div>

                    {/* Photo Gallery (Placeholder for now) */}
                    <div className="h-80 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                        {hall.images && hall.images.length > 0 ? (
                            <img
                                src={hall.images[0].url}
                                alt={hall.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <Building2 className="w-16 h-16 mb-4 opacity-50" />
                                <p>No photos available</p>
                            </div>
                        )}
                    </div>

                    {/* Equipment & Amenities */}
                    <div className="grid sm:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <CheckCircle2 className="w-5 h-5 mr-2 text-indigo-500" />
                                Equipment Included
                            </h3>
                            {hall.equipment && hall.equipment.length > 0 ? (
                                <ul className="space-y-3">
                                    {hall.equipment.map((item, idx) => (
                                        <li key={idx} className="flex items-center text-gray-600">
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3" />
                                            {item.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-sm italic">Standard room setup.</p>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-indigo-500" />
                                Rules & Guidelines
                            </h3>
                            {hall.rules && hall.rules.length > 0 ? (
                                <ul className="space-y-3">
                                    {hall.rules.map((rule, idx) => (
                                        <li key={idx} className="flex items-start text-gray-600">
                                            <div className="w-2 h-2 bg-amber-400 rounded-full mr-3 mt-2" />
                                            <span className="text-sm">{rule}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-sm italic">Standard venue rules apply.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Booking Panel */}
                <div className="lg:w-[400px]">
                    <div className="bg-white border text-gray-900 border-gray-200 rounded-2xl shadow-sm sticky top-24 overflow-hidden">
                        {/* Price Header */}
                        <div className="p-6 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-sm font-medium text-indigo-600 mb-1">Standard Rate</p>
                                    <div className="flex items-baseline">
                                        <span className="text-3xl font-bold text-gray-900">${hall.hourlyRate}</span>
                                        <span className="text-gray-500 ml-1">/ hour</span>
                                    </div>
                                </div>
                                {hall.dailyRate && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">or</p>
                                        <p className="text-sm font-semibold text-gray-700">${hall.dailyRate} / day</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Booking Form */}
                        <div className="p-6">
                            {isOrganizer ? (
                                <form onSubmit={handleBookingSubmit} className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 mb-2">Request to Book</h3>

                                    {successMsg && (
                                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                                            {successMsg}
                                        </div>
                                    )}

                                    {errorMsg && (
                                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                            {errorMsg}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={bookingForm.startDate}
                                            onChange={(e) => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={bookingForm.endDate}
                                            onChange={(e) => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Booking Notes (Optional)</label>
                                        <textarea
                                            rows={3}
                                            value={bookingForm.notes}
                                            onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                            placeholder="Special requirements or setup instructions..."
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting || hall.status !== 'active'}
                                        className={`w-full py-3 px-4 flex justify-center items-center text-sm font-medium rounded-xl text-white shadow-sm transition-all
                      ${hall.status !== 'active'
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:transform active:scale-[0.98]'
                                            }`}
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Booking Request'}
                                    </button>

                                    {hall.status !== 'active' && (
                                        <p className="text-xs text-center text-red-500 mt-2">
                                            This hall is currently {hall.status} and cannot be booked.
                                        </p>
                                    )}
                                    <p className="text-xs text-center text-gray-500 mt-3">
                                        You won't be charged yet. The venue administrator must approve this request.
                                    </p>
                                </form>
                            ) : (
                                <div className="text-center py-6">
                                    <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-gray-900 font-medium mb-1">Register as an Organizer</h3>
                                    <p className="text-sm text-gray-500">
                                        Only event organizers can submit hall booking requests.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HallDetail;
