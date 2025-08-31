import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Loader2,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Info,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

const BookingPage = () => {
  const { eventId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [event, setEvent] = useState(null);
  const [step, setStep] = useState(1); // 1: Initiate, 2: Payment, 3: Confirmation
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);

        const eventResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/events/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const eventData = await eventResponse.json();
        if (!eventResponse.ok) {
          throw new Error(eventData.message || 'Failed to fetch event details');
        }
        setEvent(eventData.data.event);

        const bookingResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/booking/initiate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ eventId }),
          }
        );
        const bookingData = await bookingResponse.json();
        if (!bookingResponse.ok) {
          throw new Error(bookingData.message || 'Failed to initiate booking');
        }
        setBooking(bookingData.data.bookingSession);
        setLoading(false);
      } catch (error) {
        console.error('Booking error:', error);
        toast.error(error.message || 'Failed to start booking process');
        navigate(`/events/${eventId}`);
      }
    };

    if (token && eventId) {
      fetchEvent();
    }
  }, [eventId, token, navigate]);

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv || !paymentDetails.nameOnCard) {
      toast.error('Please fill in all payment details');
      return;
    }

    try {
      setProcessing(true);

      const paymentResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/payments/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: event.pricing.amount,
            currency: event.pricing.currency || 'USD',
            paymentMethod: 'credit_card',
            paymentDetails: {
              cardNumber: paymentDetails.cardNumber.replace(/\s+/g, ''),
              expiryDate: paymentDetails.expiryDate,
              cvv: paymentDetails.cvv,
              nameOnCard: paymentDetails.nameOnCard,
            },
            bookingId: booking?._id,
            eventId: event._id,
          }),
        }
      );
      const paymentData = await paymentResponse.json();
      if (!paymentResponse.ok) {
        throw new Error(paymentData.message || 'Payment processing failed');
      }

      const bookingResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/booking/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eventId,
            paymentId: paymentData.data.paymentId,
            bookingId: booking?._id,
            paymentMethod: 'credit_card',
          }),
        }
      );
      const bookingData = await bookingResponse.json();
      if (!bookingResponse.ok) {
        throw new Error(bookingData.message || 'Failed to confirm booking');
      }

      setStep(3);
      setBooking((prev) => ({
        ...prev,
        ticket: bookingData.data.ticket,
        payment: paymentData.data.payment,
      }));
      toast.success('Booking confirmed! You will receive a confirmation email shortly.');

      try {
        await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/notifications/send-booking-confirmation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              bookingId: bookingData.data.booking._id,
              eventId: event._id,
              userId: user?._id,
            }),
          }
        );
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    } catch (error) {
      console.error('Payment/booking error:', error);
      toast.error(error.message || 'An error occurred during the booking process');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Preparing your booking...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!event || !booking) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center bg-white rounded-lg shadow-sm p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <Info className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Booking Unavailable</h1>
          <p className="text-gray-600 mb-6">
            We're having trouble loading the booking details. This might be due to high demand or an expired session.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()} className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => navigate(`/events/${eventId}`)} className="flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Event
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderPaymentStep = () => (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <button onClick={() => setStep(1)} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to order
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Information</h1>
            <p className="text-gray-600">Complete your booking with secure payment</p>
          </div>
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-full">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Secure Checkout</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                  {event?.images?.[0]?.url && (
                    <img src={event.images[0].url} alt={event.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{event?.title}</h4>
                  <p className="text-sm text-gray-500">1 × {formatCurrency(event?.pricing?.amount || 0)}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium">{formatCurrency(booking?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-600">Fees</span>
                <span className="text-sm font-medium">{formatCurrency(booking?.fees || 0)}</span>
              </div>
              <div className="flex justify-between py-1 font-medium text-gray-900 mt-2 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency((booking?.totalAmount || 0) + (booking?.fees || 0))}</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmitPayment} className="space-y-5">
              <div>
                <Label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Card number
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={paymentDetails.cardNumber}
                    onChange={handlePaymentChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry date
                  </Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="text"
                    placeholder="MM/YY"
                    value={paymentDetails.expiryDate}
                    onChange={handlePaymentChange}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </Label>
                  <div className="relative">
                    <Input
                      id="cvv"
                      name="cvv"
                      type="text"
                      placeholder="•••"
                      value={paymentDetails.cvv}
                      onChange={handlePaymentChange}
                      className="w-full"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="nameOnCard" className="block text-sm font-medium text-gray-700 mb-1">
                  Name on card
                </Label>
                <Input
                  id="nameOnCard"
                  name="nameOnCard"
                  type="text"
                  placeholder="John Doe"
                  value={paymentDetails.nameOnCard}
                  onChange={handlePaymentChange}
                  className="w-full"
                  required
                />
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full h-12 text-base font-medium" disabled={processing} size="lg">
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatCurrency((booking?.totalAmount || 0) + (booking?.fees || 0))}`
                  )}
                </Button>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <p className="text-xs text-gray-500">Your payment is secured with 256-bit SSL encryption</p>
                </div>
                <div className="mt-4 flex items-center justify-center space-x-4">
                  {['visa', 'mastercard', 'amex', 'discover'].map((type) => (
                    <div key={type} className="h-6">
                      <img src={`/payment-methods/${type}.svg`} alt={type} className="h-full w-auto opacity-70" />
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By completing your purchase, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">{event.venue}</p>
                  </div>
                  {event.image && (
                    <div className="w-20 h-20 bg-gray-200 rounded overflow-hidden">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Order Summary</h4>
                  <div className="flex justify-between text-sm mb-1">
                    <span>1 x General Admission</span>
                    <span>{formatCurrency(event.pricing.amount, event.pricing.currency)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t mt-2 pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(event.pricing.amount, event.pricing.currency)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={() => setStep(2)}>Continue to Payment</Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && renderPaymentStep()}

          {step === 3 && booking.ticket && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <CardTitle>Booking Confirmed!</CardTitle>
                </div>
                <CardDescription>Your ticket for {event.title} has been confirmed.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-gray-600">{event.venue}</p>
                      <div className="mt-4">
                        <p className="text-sm font-medium">Ticket #{booking.ticket.ticketId}</p>
                        <p className="text-sm">Seat: {booking.ticket.seatNumber}</p>
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <img src={booking.ticket.qrCode} alt="QR Code" className="w-24 h-24" />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <h4 className="font-medium mb-2">What's next?</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>We've sent a confirmation email to your registered email address.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>You can view and manage your tickets in the "My Tickets" section of your account.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Please arrive at least 30 minutes before the event starts with your ticket (digital or printed).</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigate('/my-tickets')}>View My Tickets</Button>
                <Button onClick={() => navigate('/')}>Back to Home</Button>
              </CardFooter>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Tickets</span>
                <span>{formatCurrency(event.pricing.amount, event.pricing.currency)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(event.pricing.amount, event.pricing.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h4 className="font-medium">Date & Time</h4>
                <p className="text-sm text-gray-600">
                  {new Date(event.date).toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Location</h4>
                <p className="text-sm text-gray-600">{event.venue}</p>
              </div>
            </CardContent>
          </Card>
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
            <h4 className="font-medium mb-1">Need help?</h4>
            <p className="mb-2">Contact our support team at support@eventx.com</p>
            <p>Or call us at (555) 123-4567</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;


