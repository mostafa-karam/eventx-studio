import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const HallBookingForm = () => {
    const { hallId } = useParams();
    const navigate = useNavigate();

    const [hall, setHall] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        purpose: '',
        expectedAttendees: '',
        specialRequirements: ''
    });

    useEffect(() => {
        fetchHall();
        // eslint-disable-next-line
    }, [hallId]);

    const fetchHall = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/halls/${hallId}`);
            const data = await res.json();
            if (data.success) {
                setHall(data.data.hall);
            } else {
                toast.error('Failed to load hall details');
                navigate('/organizer/halls');
            }
        } catch (error) {
            toast.error('Network error');
            navigate('/organizer/halls');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.startDate || !formData.endDate || !formData.purpose) {
            return toast.error('Please fill in all required fields');
        }

        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
            return toast.error('End date must be after start date');
        }

        try {
            setSubmitting(true);
            const res = await fetch('/api/hall-bookings/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hallId,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    purpose: formData.purpose,
                    expectedAttendees: Number(formData.expectedAttendees) || hall.capacity,
                    specialRequirements: formData.specialRequirements
                })
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Hall booking request submitted successfully');
                navigate('/organizer/bookings');
            } else {
                toast.error(data.message || 'Failed to request booking');
            }
        } catch (error) {
            toast.error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    if (!hall) return null;

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Hall: {hall.name}</h1>
                <p className="text-gray-600">Submit a booking request. Venue administrators will review and approve your request to ensure no conflicts.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row mb-8">
                <div className="md:w-1/3 bg-gray-50 p-6 border-b md:border-b-0 md:border-r border-gray-200">
                    {hall.images && hall.images[0] ? (
                        <img src={hall.images[0]} alt={hall.name} className="w-full h-40 object-cover rounded-lg mb-4" />
                    ) : (
                        <div className="w-full h-40 bg-gray-200 rounded-lg mb-4 flex items-center justify-center text-gray-400">No Image</div>
                    )}
                    <h3 className="font-bold text-lg mb-2">{hall.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{hall.description}</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Capacity</span>
                            <span className="font-medium text-gray-900">{hall.capacity} people</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Hourly Rate</span>
                            <span className="font-medium text-blue-600">${hall.hourlyRate}/hr</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Daily Rate</span>
                            <span className="font-medium text-blue-600">${hall.dailyRate}/day</span>
                        </div>
                    </div>
                </div>

                <div className="md:w-2/3 p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Event Purpose / Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="purpose"
                                value={formData.purpose}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Annual Tech Conference 2026"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Attendees</label>
                            <input
                                type="number"
                                name="expectedAttendees"
                                value={formData.expectedAttendees}
                                onChange={handleChange}
                                placeholder={`Max ${hall.capacity}`}
                                max={hall.capacity}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                            <p className="text-xs text-gray-500 mt-1">If blank, defaults to hall maximum capacity.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Special Requirements / Notes</label>
                            <textarea
                                name="specialRequirements"
                                value={formData.specialRequirements}
                                onChange={handleChange}
                                rows="3"
                                placeholder="e.g. Need extra chairs, projector setup, catering access..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/organizer/halls')}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Request Booking'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HallBookingForm;
