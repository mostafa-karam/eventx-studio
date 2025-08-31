import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowLeft,
  Share2,
  Heart,
  Ticket,
  Info,
  Star,
  CheckCircle,
  ChevronDown
} from 'lucide-react';

const EventDetails = ({ event = {}, onBack = () => { }, onBookTicket = () => { } }) => {
  const [loading, setLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showSeatSelection, setShowSeatSelection] = useState(true);
  const [seatMap, setSeatMap] = useState(null);
  const [seatMapLoading, setSeatMapLoading] = useState(false);
  const [seatMapError, setSeatMapError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const bookStickyRef = useRef(null);
  const [statsTop, setStatsTop] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasTicketForEvent, setHasTicketForEvent] = useState(false);
  const [myTicketsLoading, setMyTicketsLoading] = useState(false);
  const [myTicketsError, setMyTicketsError] = useState('');
  const [myTicketsReloadKey, setMyTicketsReloadKey] = useState(0);

  // payment removed per request

  const { user, token } = useAuth();

  useEffect(() => {
    setSelectedSeats((prev) => (Array.isArray(prev) ? prev.slice(0, Math.max(1, bookingQuantity)) : []));
  }, [bookingQuantity]);

  // Persist show/hide state in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('eventx_showSeatSelection');
    if (saved === 'true' || saved === 'false') {
      setShowSeatSelection(saved === 'true');
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('eventx_showSeatSelection', String(showSeatSelection));
  }, [showSeatSelection]);

  // Dynamically position Event Stats sticky below Book Tickets sticky, avoiding overlap
  useEffect(() => {
    const update = () => {
      const el = bookStickyRef.current;
      if (!el) return;
      const height = el.getBoundingClientRect().height || 0;
      const topFirst = 24; // top-6 (24px)
      const gap = 24; // gap between cards
      setStatsTop(height + topFirst + gap);
    };
    update();
    window.addEventListener('resize', update);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro && bookStickyRef.current) ro.observe(bookStickyRef.current);
    return () => {
      window.removeEventListener('resize', update);
      if (ro && bookStickyRef.current) ro.unobserve(bookStickyRef.current);
    };
  }, []);

  // Load seat map from backend when component mounts or when seat selection is opened
  useEffect(() => {
    let cancelled = false;
    const loadSeatMap = async () => {
      if (!event || !event._id) return;
      setSeatMapLoading(true);
      setSeatMapError('');
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_BASE_URL}/events/${event._id}/seats`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || 'Failed to fetch seats');
        }
        const data = await res.json();
        if (!cancelled) {
          const map = data.data?.seatMap || [];
          setSeatMap(map);

          // auto-select first available seats if none selected
          const available = map
            .filter(s => !s.isBooked)
            .map(s => s.seatNumber || s.seat || s.id)
            .filter(Boolean);
          if (available.length > 0) {
            setSelectedSeats((prev) => {
              if (Array.isArray(prev) && prev.length > 0) return prev.slice(0, bookingQuantity);
              return available.slice(0, Math.max(1, bookingQuantity));
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load seat map', err);
        if (!cancelled) setSeatMapError(err.message || 'Failed to load seats');
      } finally {
        if (!cancelled) setSeatMapLoading(false);
      }
    };

    // load immediately and also when seat selection toggles visible
    if (showSeatSelection || (event && event._id)) loadSeatMap();

    return () => { cancelled = true; };
  }, [event?._id, showSeatSelection, bookingQuantity, reloadKey]);

  // Pre-check: does the current user already have a ticket for this event?
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      setHasTicketForEvent(false);
      setMyTicketsError('');
      if (!user || !token || !event?._id) return;
      setMyTicketsLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_BASE_URL}/tickets/my-tickets?limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to check tickets');
        const tickets = data?.data?.tickets || [];
        const has = tickets.some(t => {
          const evId = (t.event && (t.event._id || t.event)) || null;
          const st = (t.status || '').toLowerCase();
          return evId && evId === event._id && (st === 'booked' || st === 'used');
        });
        if (!aborted) setHasTicketForEvent(Boolean(has));
      } catch (err) {
        if (!aborted) setMyTicketsError(err.message || 'Failed to check tickets');
      } finally {
        if (!aborted) setMyTicketsLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, [event?._id, user, token, myTicketsReloadKey]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatPrice = (ev) => {
    if (ev?.pricing?.type === 'free') return 'Free';
    return `$${ev?.pricing?.amount ?? 0}`;
  };

  const getTotalPrice = () => {
    if (event.pricing?.type === 'free') return 0;
    return (event.pricing?.amount ?? 0) * bookingQuantity;
  };

  const getEventStatus = (ev) => {
    const now = new Date();
    const eventDate = new Date(ev.date || Date.now());
    if (eventDate < now) return { status: 'past', label: 'Past Event', color: 'bg-gray-100 text-gray-600' };
    if ((ev?.seating?.availableSeats ?? 0) === 0) return { status: 'sold-out', label: 'Sold Out', color: 'bg-red-100 text-red-600' };
    if ((ev?.seating?.availableSeats ?? 0) < ((ev?.seating?.totalSeats ?? 0) * 0.1)) return { status: 'limited', label: 'Limited Seats', color: 'bg-orange-100 text-orange-600' };
    return { status: 'available', label: 'Available', color: 'bg-green-100 text-green-600' };
  };

  const eventStatus = getEventStatus(event);
  const canBook = eventStatus.status === 'available' || eventStatus.status === 'limited';
  const canBookForUser = !!user && canBook && !hasTicketForEvent;
  // Build an effective seat map with fallbacks for display
  let displaySeatMap = seatMap ?? event?.seating?.seatMap ?? [];
  if ((!displaySeatMap || displaySeatMap.length === 0) && (event?.seating?.totalSeats > 0)) {
    const total = event.seating.totalSeats;
    displaySeatMap = Array.from({ length: total }, (_, i) => ({
      seatNumber: `S${String(i + 1).padStart(3, '0')}`,
      isBooked: false
    }));
  }

  // Effective availability derived from seat map when present
  const totalSeats = event?.seating?.totalSeats ?? (Array.isArray(displaySeatMap) ? displaySeatMap.length : 0);
  const isSeatBooked = (s) => {
    if (!s) return false;
    // Normalize across possible schemas
    if (s.isBooked === true) return true;
    if (s.booked === true) return true;
    if (typeof s.status === 'string' && s.status.toLowerCase() === 'booked') return true;
    if (s.available === false) return true;
    if (s.isAvailable === false) return true;
    return false;
  };
  const availableFromSeatMap = Array.isArray(displaySeatMap) && displaySeatMap.length
    ? displaySeatMap.filter(s => !isSeatBooked(s)).length
    : null;
  const availableSeatsEffective = (availableFromSeatMap ?? event?.seating?.availableSeats) ?? 0;

  const handleBooking = async () => {
    if (!user) {
      alert('Please log in to book tickets');
      return;
    }
    if (hasTicketForEvent) {
      toast.error('You already have a ticket for this event');
      return;
    }
    setLoading(true);
    setBookingError('');
    try {
      // Call backend booking endpoints
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      // If booking more than 1 ticket use book-multi

      if (bookingQuantity > 1) {
        const body = {
          eventId: event._id,
          quantity: bookingQuantity,
          seatNumbers: selectedSeats && selectedSeats.length ? selectedSeats : [],
          paymentMethod: 'free'
        };

        const res = await fetch(`${API_BASE_URL}/tickets/book-multi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Booking failed');

        setBookingSuccess('Booked — check My Tickets');
        toast.success('Booking confirmed — check My Tickets');
        onBookTicket?.(data.data);
        setReloadKey(k => k + 1); // refresh seat map to update availability
        setMyTicketsReloadKey(k => k + 1); // refresh hasTicket pre-check
      } else {
        const body = {
          eventId: event._id,
          seatNumber: selectedSeats && selectedSeats.length ? selectedSeats[0] : undefined,
          paymentMethod: 'free'
        };

        const res = await fetch(`${API_BASE_URL}/tickets/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Booking failed');

        setBookingSuccess('Booked — check My Tickets');
        onBookTicket?.(data.data);
        setReloadKey(k => k + 1); // refresh seat map to update availability
        setMyTicketsReloadKey(k => k + 1); // refresh hasTicket pre-check
      }
    } catch (e) {
      setBookingError(e.message || 'Booking failed');
      toast.error(e.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Flat Header Card */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onBack} className="h-8 px-3">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Badge className={eventStatus.color}>{eventStatus.label}</Badge>
              </div>
              <CardTitle className="text-2xl md:text-3xl truncate">{event.title}</CardTitle>
              {event?.subtitle && (
                <CardDescription className="truncate">{event.subtitle}</CardDescription>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center"><Calendar className="h-4 w-4 mr-2" /> {formatDate(event.date)}</span>
                <span className="flex items-center"><MapPin className="h-4 w-4 mr-2" /> {event?.venue?.name || 'TBA'}</span>
                <span className="flex items-center"><Users className="h-4 w-4 mr-2" /> {availableSeatsEffective} left</span>
                <span className="hidden md:flex items-center text-gray-500"><Star className="h-4 w-4 mr-2 text-yellow-500" /> {event?.analytics?.views || 0} views</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-sm font-semibold">
                {formatPrice(event)}
              </span>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button variant="ghost" size="sm">
                <Heart className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">About this event</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">{event.description}</CardDescription>
                </div>
                <div className="text-sm text-muted-foreground flex flex-col items-end">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDate(event.date)}</div>
                  <div className="flex items-center gap-2 mt-2"><MapPin className="h-4 w-4" /> {event?.venue?.name || 'TBA'}</div>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" /> Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-blue-600" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-3 text-red-600" />
                  <div>
                    <p className="font-medium">Venue</p>
                    <p className="text-sm text-gray-600">{event?.venue?.name || 'Unknown venue'}</p>
                    <p className="text-sm text-gray-500">{event?.venue?.address || ''} {event?.venue?.city || ''}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3 text-green-600" />
                  <div>
                    <p className="font-medium">Capacity</p>
                    <p className="text-sm text-gray-600">{availableSeatsEffective} of {totalSeats} seats available</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-3 text-purple-600" />
                  <div>
                    <p className="font-medium">Price</p>
                    <p className="text-sm text-gray-600">{formatPrice(event)}</p>
                  </div>
                </div>
              </div>

              {event.category && (
                <div className="pt-4">
                  <p className="font-medium mb-2">Category</p>
                  <Badge variant="secondary">{event.category}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center">
                  <Ticket className="h-5 w-5 mr-2" /> Seat Selection
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSeatSelection(v => !v)}
                  aria-expanded={showSeatSelection}
                  className="flex items-center gap-1"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showSeatSelection ? '' : '-rotate-90'}`} />
                  {showSeatSelection ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select up to {bookingQuantity} seat{bookingQuantity > 1 ? 's' : ''}.</p>
                {seatMapLoading && <div className="text-xs text-muted-foreground">Loading seats...</div>}
                {seatMapError && (
                  <Alert variant="destructive">
                    <AlertDescription>{seatMapError}</AlertDescription>
                  </Alert>
                )}
                {hasTicketForEvent && (
                  <Alert>
                    <AlertDescription>You already have a ticket for this event. Seat selection is disabled.</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-200 border border-green-500 rounded-sm" /> Available</div>
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-gray-300 border border-gray-400 rounded-sm" /> Booked</div>
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-blue-200 border border-blue-500 rounded-sm" /> Selected</div>
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${showSeatSelection ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="max-h-80 md:max-h-96 overflow-y-auto pr-1">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {displaySeatMap.map((s) => {
                        const seatId = s.seatNumber || s.seat || s.id;
                        const isBooked = isSeatBooked(s);
                        const isSelected = seatId ? selectedSeats.includes(seatId) : false;
                        const atMax = selectedSeats.length >= bookingQuantity;
                        const disabled = loading || isBooked || !seatId || hasTicketForEvent;
                        const baseClasses = 'text-xs px-2 py-1 rounded border w-full text-center';
                        const stateClasses = isBooked
                          ? 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-200 border-blue-500 text-blue-900'
                            : (atMax ? 'bg-green-100 border-green-400 text-green-900 hover:bg-green-200' : 'bg-green-200 border-green-500 text-green-900 hover:bg-green-300');
                        return (
                          <button
                            key={seatId}
                            type="button"
                            disabled={disabled}
                            className={`${baseClasses} ${stateClasses}`}
                            onClick={() => {
                              if (!seatId) return;
                              setSelectedSeats((prev) => {
                                if (prev.includes(seatId)) return prev.filter((x) => x !== seatId);
                                if (prev.length >= bookingQuantity) {
                                  const [, ...rest] = prev;
                                  return [...rest, seatId];
                                }
                                return [...prev, seatId];
                              });
                            }}
                            title={isBooked ? 'Booked' : 'Available'}
                          >
                            {seatId || '—'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between"><span className="text-gray-600">Availability:</span><span className="font-medium">{totalSeats ? Math.round(((availableSeatsEffective ?? 0) / totalSeats) * 100) : 0}%</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div ref={bookStickyRef}>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="h-5 w-5 mr-2" /> Book Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user && (
                  <Alert>
                    <AlertDescription>Please log in to book tickets for this event.</AlertDescription>
                  </Alert>
                )}
                {user && myTicketsError && (
                  <Alert variant="destructive">
                    <AlertDescription>{myTicketsError}</AlertDescription>
                  </Alert>
                )}

                {user && hasTicketForEvent && (
                  <Alert>
                    <AlertDescription>You already have a ticket for this event. Additional bookings are disabled.</AlertDescription>
                  </Alert>
                )}

                {canBook && user && !hasTicketForEvent && (
                  <>
                    {bookingError && (
                      <Alert variant="destructive">
                        <AlertDescription>{bookingError}</AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Number of Tickets</label>
                      <select value={bookingQuantity} onChange={(e) => setBookingQuantity(parseInt(e.target.value))} className="w-full p-2 border rounded-md" disabled={loading || hasTicketForEvent}>
                        {[...Array(Math.min(10, availableSeatsEffective ?? 0))].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'ticket' : 'tickets'}</option>
                        ))}
                      </select>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between"><span>Ticket Price:</span><span>{formatPrice(event)}</span></div>
                      <div className="flex justify-between"><span>Quantity:</span><span>{bookingQuantity}</span></div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{event.pricing?.type === 'free' ? 'Free' : `$${getTotalPrice()}`}</span></div>
                    </div>

                    <Button onClick={handleBooking} disabled={loading || hasTicketForEvent} className="w-full" size="lg">{loading ? 'Processing...' : 'Book Now'}</Button>

                    <div className="text-xs text-gray-500 text-center"><CheckCircle className="h-4 w-4 inline mr-1" /> Instant confirmation</div>
                  </>
                )}

                {!canBook && (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-2">{eventStatus.status === 'past' ? 'This event has already passed' : 'This event is sold out'}</p>
                    <Button disabled className="w-full">{eventStatus.status === 'past' ? 'Event Ended' : 'Sold Out'}</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="sticky" style={{ top: statsTop }}>
            <CardHeader>
              <CardTitle>Event Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">Total Views:</span><span className="font-medium">{event?.analytics?.views || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tickets Sold:</span><span className="font-medium">{Math.max(0, (totalSeats || 0) - (availableSeatsEffective || 0))}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Availability:</span><span className="font-medium">{totalSeats ? Math.round(((availableSeatsEffective ?? 0) / totalSeats) * 100) : 0}%</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

