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
  Tag,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { BookingPageSkeleton } from '../components/ui/Skeletons';
import ErrorBoundary from '../components/ErrorBoundary';

const BookingPage = () => {
  const { eventId } = useParams();
  useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [event, setEvent] = useState(null);
  const [step, setStep] = useState(1); // 1: Initiate, 2: Payment, 3: Confirmation
  // SECURITY: Use tokenized payment provider (Stripe, Square, etc.)
  // Do NOT handle raw card data in frontend. Payment tokens should only be received from PCI-compliant providers
//   const [paymentToken] = useState('');
//   const [paymentTokenError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Derived financial values
  const basePrice = event?.pricing?.amount || 0;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const finalPrice = appliedCoupon ? appliedCoupon.finalAmount : basePrice;
  const computedFees = Math.round(finalPrice * 0.05); // 5% fee
  const grandTotal = finalPrice + computedFees;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);

        const eventResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/events/${eventId}`,
          {
            credentials: 'include',
            headers: {
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
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
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

    if (eventId) {
      fetchEvent();
    }
  }, [eventId, navigate]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          code: couponCode,
          eventId: event._id,
          amount: event.pricing.amount
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid coupon');
      }

      setAppliedCoupon(data.data);
      toast.success('Coupon applied successfully!');
    } catch (error) {
      toast.error(error.message);
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleProcessPayment = async () => {

    try {
      setProcessing(true);

      let paymentData = null;
      if (finalPrice > 0) {
        const paymentResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/payments/process`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: finalPrice,
              currency: event.pricing.currency || 'USD',
              paymentMethod: 'credit_card',
              bookingId: booking?._id,
              eventId: event._id,
            }),
          }
        );
        const paymentResult = await paymentResponse.json();
        if (!paymentResponse.ok) {
          throw new Error(paymentResult.message || 'Payment processing failed');
        }
        paymentData = paymentResult;
      }

      const bookingResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/booking/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            paymentId: paymentData?.data?.paymentId,
            bookingId: booking?._id,
            paymentMethod: finalPrice > 0 ? 'credit_card' : 'free',
            couponCode: appliedCoupon?.code,
            paymentToken: paymentData?.data?.token
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
        ticket: { ...bookingData.data.ticket, qrCodeImage: bookingData.data.qrCodeImage },
        payment: paymentData?.data?.payment,
      }));
      toast.success('Booking confirmed! You will receive a confirmation email shortly.');
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
    return <BookingPageSkeleton />;
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
                <span className="text-sm font-medium">{formatCurrency(basePrice, event?.pricing?.currency)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between py-1 text-green-600">
                  <span className="text-sm">Discount ({appliedCoupon.code})</span>
                  <span className="text-sm font-medium">-{formatCurrency(discountAmount, event?.pricing?.currency)}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-600">Fees</span>
                <span className="text-sm font-medium">{formatCurrency(computedFees, event?.pricing?.currency)}</span>
              </div>
              <div className="flex justify-between py-1 font-medium text-gray-900 mt-2 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(grandTotal, event?.pricing?.currency)}</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Secure Payment</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your payment will be processed securely through our payment provider.
                  No card details are stored on our servers.
                </p>
              </div>
              <Button onClick={handleProcessPayment} className="w-full h-12 text-base font-medium" disabled={processing} size="lg">
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(grandTotal, event?.pricing?.currency)}`
                )}
              </Button>
              <div className="flex items-center justify-center space-x-2">
                <Lock className="h-4 w-4 text-gray-400" />
                <p className="text-xs text-gray-500">Your payment is secured with 256-bit SSL encryption</p>
              </div>
            </div>
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
                {event.pricing?.type === 'free' ? (
                  <Button onClick={handleProcessPayment}>Confirm Free Booking</Button>
                ) : (
                  <Button onClick={() => setStep(2)}>Continue to Payment</Button>
                )}
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <ErrorBoundary>
              {renderPaymentStep()}
            </ErrorBoundary>
          )}

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
                      <img src={booking.ticket.qrCodeImage} alt="QR Code" className="w-24 h-24" />
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
                <Button variant="outline" onClick={() => navigate('/user/tickets')}>View My Tickets</Button>
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
                <span>{formatCurrency(basePrice, event.pricing.currency)}</span>
              </div>

              {!appliedCoupon ? (
                <div className="pt-2">
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        placeholder="Promo code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim() || validatingCoupon}
                    >
                      {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 text-green-700 p-2 rounded-md border border-green-200 text-sm">
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    <span className="font-medium">{appliedCoupon.code}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span>-{formatCurrency(discountAmount, event.pricing.currency)}</span>
                    <button onClick={removeCoupon} className="hover:text-green-900 focus:outline-none">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(finalPrice, event.pricing.currency)}</span>
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


