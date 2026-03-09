import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Calendar, Clock, Users, ArrowLeft, Info, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const HallRentalPage = () => {
    const { hallId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [hall, setHall] = useState(null);
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [bookingDetails, setBookingDetails] = useState({
        eventType: '',
        startDate: '',
        endDate: '',
        estimatedAttendees: '',
        specialRequirements: ''
    });
    const [confirmedBookingId, setConfirmedBookingId] = useState(null);

    useEffect(() => {
        if (!user) {
            toast.info("Please sign in or create an organizer account to book a hall.");
            navigate('/auth');
            return;
        }

        const fetchHall = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/public/halls/${hallId}`);
                const data = await res.json();
                if (data.success) {
                    setHall(data.data.hall);
                } else {
                    toast.error(data.message || 'Failed to fetch hall details');
                    navigate('/halls');
                }
            } catch (err) {
                toast.error('Error loading hall details');
                navigate('/halls');
            } finally {
                setLoading(false);
            }
        };
        fetchHall();
    }, [hallId, navigate, user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBookingDetails(prev => ({ ...prev, [name]: value }));
    };

    const calculateDurationHours = () => {
        if (!bookingDetails.startDate || !bookingDetails.endDate) return 0;
        const start = new Date(bookingDetails.startDate);
        const end = new Date(bookingDetails.endDate);
        const diffMs = end - start;
        if (diffMs <= 0) return 0;
        return diffMs / (1000 * 60 * 60);
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();

        if (calculateDurationHours() <= 0) {
            toast.error('End date must be after start date');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                hallId,
                eventType: bookingDetails.eventType,
                startDate: bookingDetails.startDate,
                endDate: bookingDetails.endDate,
                expectedAttendees: Number(bookingDetails.estimatedAttendees),
                specialRequirements: bookingDetails.specialRequirements,
            };

            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hall-bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setConfirmedBookingId(data.data.booking._id);
                setStep(2);
                toast.success('Hall rental request submitted successfully!');
            } else {
                toast.error(data.message || 'Failed to submit booking request');
            }
        } catch (err) {
            toast.error('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!hall) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/halls')} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Halls
                </button>

                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <Card className="shadow-sm border-gray-100">
                                <CardHeader className="bg-white border-b border-gray-100">
                                    <CardTitle className="text-2xl font-bold text-gray-900">Request Hall Rental</CardTitle>
                                    <CardDescription>Fill out the details below to request a booking for your event.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <form onSubmit={handleBookingSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="eventType">Event Type / Name</Label>
                                            <Input
                                                id="eventType"
                                                name="eventType"
                                                placeholder="e.g. Annual Tech Conference 2026"
                                                required
                                                value={bookingDetails.eventType}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="startDate" className="flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-600" /> Start Date & Time</Label>
                                                <Input
                                                    id="startDate"
                                                    name="startDate"
                                                    type="datetime-local"
                                                    required
                                                    value={bookingDetails.startDate}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="endDate" className="flex items-center gap-2"><Clock className="w-4 h-4 text-rose-600" /> End Date & Time</Label>
                                                <Input
                                                    id="endDate"
                                                    name="endDate"
                                                    type="datetime-local"
                                                    required
                                                    value={bookingDetails.endDate}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="estimatedAttendees" className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Expected Attendees</Label>
                                            <Input
                                                id="estimatedAttendees"
                                                name="estimatedAttendees"
                                                type="number"
                                                min="1"
                                                max={hall.capacity}
                                                placeholder={`Max ${hall.capacity}`}
                                                required
                                                value={bookingDetails.estimatedAttendees}
                                                onChange={handleInputChange}
                                            />
                                            <p className="text-xs text-gray-500">Must not exceed hall capacity ({hall.capacity}).</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="specialRequirements">Special Requirements or Setup Instructions (Optional)</Label>
                                            <textarea
                                                id="specialRequirements"
                                                name="specialRequirements"
                                                rows="4"
                                                className="w-full border rounded-md p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                                placeholder="e.g. Specific seating arrangement, catering needs, extra AV equipment..."
                                                value={bookingDetails.specialRequirements}
                                                onChange={handleInputChange}
                                            ></textarea>
                                        </div>

                                        <Button type="submit" className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700 text-white" disabled={submitting}>
                                            {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                                            {submitting ? 'Submitting Request...' : 'Submit Rental Request'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Summary Sidebar */}
                        <div className="space-y-6">
                            <Card className="shadow-sm border-gray-100 sticky top-8">
                                <div className="h-48 bg-gray-200 relative overflow-hidden rounded-t-xl">
                                    {hall.images && hall.images.length > 0 ? (
                                        <img src={hall.images[0].url} alt={hall.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-teal-100 text-teal-800">No Image</div>
                                    )}
                                </div>
                                <CardHeader>
                                    <CardTitle>{hall.name}</CardTitle>
                                    <CardDescription>Capacity: {hall.capacity} people</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Hourly Rate</span>
                                        <span className="font-semibold">${hall.hourlyRate}/hr</span>
                                    </div>

                                    {bookingDetails.startDate && bookingDetails.endDate && calculateDurationHours() > 0 && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <span className="text-gray-600">Estimated Duration</span>
                                                <span className="font-medium">{calculateDurationHours().toFixed(1)} hrs</span>
                                            </div>
                                            <div className="flex justify-between items-center text-base font-bold text-teal-700 pt-2 border-t border-gray-100">
                                                <span>Estimated Base Cost</span>
                                                <span>${(calculateDurationHours() * hall.hourlyRate).toFixed(2)}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2 text-center flex items-center justify-center gap-1">
                                                <Info className="w-3 h-3" /> Final price may vary based on requests.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <Card className="max-w-xl mx-auto shadow-sm border-gray-100 text-center py-12">
                        <CardHeader>
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl">Request Submitted!</CardTitle>
                            <CardDescription className="text-base mt-2">
                                Your rental request for <span className="font-semibold text-gray-900">{hall.name}</span> has been sent to the venue administrators.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-gray-600 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg inline-block">
                                <p className="text-sm font-medium">Request Reference ID:</p>
                                <p className="font-mono text-gray-900">{confirmedBookingId}</p>
                            </div>
                            <p>We will review your request and get back to you within 24-48 hours. You can check the status of your request in your Organizer Dashboard.</p>
                        </CardContent>
                        <CardFooter className="flex justify-center gap-4 mt-4">
                            <Button variant="outline" onClick={() => navigate('/halls')}>Browse More Halls</Button>
                            <Button onClick={() => navigate('/organizer/dashboard')} className="bg-teal-600 hover:bg-teal-700 text-white">Go to Dashboard</Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default HallRentalPage;
