import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
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
  ChevronDown,
  ImageIcon,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  User
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

  // Waitlist states
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState('');

  // payment removed per request

  const { user, fetchCsrfToken } = useAuth();

  // Image gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
      if (!user || !event?._id) return;
      setMyTicketsLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_BASE_URL}/tickets/my-tickets?limit=100`, {
          credentials: 'include'
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
  }, [event?._id, user, myTicketsReloadKey]);

  // Pre-check: is the user on the waitlist?
  useEffect(() => {
    let aborted = false;
    const checkWaitlist = async () => {
      if (!user || !event?._id) return;
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_BASE_URL}/events/${event._id}/waitlist`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          const waitlist = data?.data?.waitlist || [];
          const onWaitlist = waitlist.some(w => w.user?._id === user._id || w.user === user._id);
          if (!aborted) setIsWaitlisted(onWaitlist);
        }
      } catch (err) {
        console.warn('Failed to check waitlist status', err);
      }
    };
    // Only check if sold out to avoid unnecessary requests
    if (eventStatus.status === 'sold-out') {
      checkWaitlist();
    }
    return () => { aborted = true; };
  }, [event?._id, user, eventStatus.status]);

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
          paymentMethod: event.pricing?.type === 'free' ? 'free' : 'card'
        };

        const res = await fetch(`${API_BASE_URL}/tickets/book-multi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
          paymentMethod: event.pricing?.type === 'free' ? 'free' : 'card'
        };

        const res = await fetch(`${API_BASE_URL}/tickets/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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

  const handleJoinWaitlist = async () => {
    if (!user) {
      toast.error('Please log in to join the waitlist');
      return;
    }
    setWaitlistLoading(true);
    setBookingError('');
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE_URL}/events/${event._id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to join waitlist');

      setIsWaitlisted(true);
      setWaitlistSuccess('You have been added to the waitlist!');
      toast.success('Successfully joined the waitlist');
    } catch (e) {
      setBookingError(e.message || 'Failed to join waitlist');
      toast.error(e.message || 'Failed to join waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = event.title || 'Event Details';
    const text = `Check out ${title} on EventX!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share failed', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Immersive Hero Header */}
      <div className="relative w-full h-[60vh] min-h-[400px] max-h-[600px] rounded-3xl overflow-hidden shadow-2xl group mt-4">
        {/* Background Image */}
        {event.images && event.images.length > 0 ? (
          <img
            src={event.images[activeImageIndex]?.url}
            alt={event.images[activeImageIndex]?.alt || event.title}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
            <ImageIcon className="h-20 w-20 text-indigo-500/30" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"></div>

        {/* Top Controls */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-20">
          <Button variant="outline" onClick={onBack} className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-white h-10 px-4 rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-white h-10 w-10 p-0 rounded-full">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 h-10 w-10 p-0 rounded-full transition-colors">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`${eventStatus.status === 'past' ? 'bg-gray-500/80' : eventStatus.status === 'sold-out' ? 'bg-rose-500/80' : 'bg-emerald-500/80'} text-white border-0 backdrop-blur-md px-3 py-1 font-semibold tracking-wide shadow-lg`}>
                  {eventStatus.label}
                </Badge>
                {event.category && (
                  <Badge variant="outline" className="text-white border-white/30 backdrop-blur-md bg-white/10 px-3 py-1 font-medium">
                    {event.category}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight shadow-sm drop-shadow-md">
                {event.title}
              </h1>

              {event?.subtitle && (
                <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl drop-shadow">
                  {event.subtitle}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 bg-white/10 backdrop-blur-lg border border-white/20 p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center min-w-[140px]">
              <span className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Tickets from</span>
              <span className="text-3xl font-extrabold text-white">{formatPrice(event)}</span>
            </div>
          </div>
        </div>

        {/* Image Gallery Controls */}
        {event.images && event.images.length > 1 && (
          <div className="absolute bottom-8 right-8 z-30 flex gap-2 hidden md:flex">
            <button
              onClick={() => setActiveImageIndex((prev) => (prev - 1 + event.images.length) % event.images.length)}
              className="p-3 bg-black/40 backdrop-blur-md text-white border border-white/10 rounded-full hover:bg-black/60 hover:border-white/30 transition-all shadow-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveImageIndex((prev) => (prev + 1) % event.images.length)}
              className="p-3 bg-black/40 backdrop-blur-md text-white border border-white/10 rounded-full hover:bg-black/60 hover:border-white/30 transition-all shadow-lg"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {event.images && event.images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-4 md:hidden px-2">
          {event.images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImageIndex(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-[3px] transition-all shadow-sm ${idx === activeImageIndex ? 'border-indigo-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <img src={img.url} alt={img.alt || `Image ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
        <div className="lg:col-span-2 space-y-8">

          {/* Quick Info Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-wrap gap-2 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="flex-1 min-w-[200px] p-4 flex items-start gap-4 hover:bg-gray-50/50 rounded-xl transition-colors">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">Date & Time</p>
                <p className="text-sm text-gray-600 leading-tight">{formatDate(event.date)}</p>
              </div>
            </div>
            <div className="flex-1 min-w-[200px] p-4 flex items-start gap-4 hover:bg-gray-50/50 rounded-xl transition-colors">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shadow-inner">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">Location</p>
                <p className="text-sm text-gray-600 leading-tight line-clamp-2">{event?.venue?.name || 'TBA'} {event?.venue?.city ? `- ${event.venue.city}` : ''}</p>
              </div>
            </div>
            {event?.organizer && (
              <Link to={`/organizers/${event.organizer._id || event.organizer}`} className="flex-1 min-w-[200px] p-4 flex items-start gap-4 hover:bg-gray-50/50 rounded-xl transition-colors group cursor-pointer">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl shadow-inner group-hover:bg-teal-100 transition-colors">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">Organizer</p>
                  <p className="text-sm text-teal-600 font-medium group-hover:underline leading-tight">
                    {event.organizer.name || 'View Profile'}
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* About Section */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-5">
              <CardTitle className="text-2xl font-bold text-gray-900">About this event</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed">
                <p className="whitespace-pre-wrap">{event.description}</p>
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="pt-8 mt-8 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 px-3 py-1 rounded-lg transition-colors">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seat Map Section */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-indigo-100/50 pb-5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
                    <Ticket className="h-5 w-5 text-indigo-600" />
                  </div>
                  Seat Selection
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSeatSelection(v => !v)}
                  aria-expanded={showSeatSelection}
                  className="flex items-center gap-1 bg-white border-indigo-100 hover:bg-indigo-50 text-indigo-700 shadow-sm rounded-xl px-4"
                >
                  {showSeatSelection ? 'Collapse' : 'Expand'}
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-300 ${showSeatSelection ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-sm text-gray-600 font-medium">Select up to <strong className="text-indigo-600 text-base">{bookingQuantity}</strong> seat{bookingQuantity > 1 ? 's' : ''}.</p>
                  <div className="flex items-center gap-5 text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 bg-white border-2 border-emerald-400 rounded-md shadow-sm" /> Available</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded-md shadow-sm" /> Booked</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 bg-indigo-500 border-2 border-indigo-600 rounded-md shadow-sm" /> Selected</div>
                  </div>
                </div>

                {seatMapLoading && (
                  <div className="w-full py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="text-sm font-medium text-gray-500">Loading seating chart...</div>
                  </div>
                )}

                {seatMapError && (
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800 font-medium">{seatMapError}</AlertDescription>
                  </Alert>
                )}

                {hasTicketForEvent && (
                  <Alert className="rounded-xl border-indigo-200 bg-indigo-50">
                    <AlertDescription className="text-indigo-800 font-medium flex items-center">
                      <CheckCircle className="w-5 h-5 mr-3 text-indigo-500" />
                      You already have a valid ticket for this event. Seat selection is disabled.
                    </AlertDescription>
                  </Alert>
                )}

                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${showSeatSelection ? 'max-h-[1200px] opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-4'}`}
                >
                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                    {/* Stage visualizer */}
                    <div className="w-full max-w-md mx-auto h-12 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-[100px] border-b-4 border-indigo-400 mb-8 flex items-end justify-center pb-2 shadow-inner">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stage</span>
                    </div>

                    <div className="max-h-80 md:max-h-96 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                        {displaySeatMap.map((s) => {
                          const seatId = s.seatNumber || s.seat || s.id;
                          const isBooked = isSeatBooked(s);
                          const isSelected = seatId ? selectedSeats.includes(seatId) : false;
                          const atMax = selectedSeats.length >= bookingQuantity;
                          const disabled = loading || isBooked || !seatId || hasTicketForEvent;

                          const baseClasses = 'relative h-12 w-full text-xs font-bold rounded-xl transition-all duration-200 flex flex-col items-center justify-center transform hover:scale-105 active:scale-95 shadow-sm';
                          const stateClasses = isBooked
                            ? 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed opacity-70 shadow-none'
                            : isSelected
                              ? 'bg-indigo-600 border border-indigo-700 text-white shadow-md ring-2 ring-indigo-300 ring-offset-1'
                              : (atMax ? 'bg-white border-2 border-emerald-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer' : 'bg-white border-2 border-emerald-400 text-gray-700 hover:bg-emerald-50 hover:border-emerald-500 shadow-sm cursor-pointer');

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
                              <span className="z-10">{seatId || '—'}</span>
                              {!isBooked && !isSelected && <div className="absolute inset-0 bg-emerald-400/10 rounded-xl opacity-0 hover:opacity-100 transition-opacity"></div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6 lg:ml-4">
          <div ref={bookStickyRef}>
            {/* Main Booking Widget */}
            <Card className="sticky top-6 border-0 shadow-xl shadow-indigo-100/50 rounded-2xl overflow-hidden ring-1 ring-gray-100 relative">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <CardHeader className="pb-4 pt-6 bg-gray-50/50">
                <CardTitle className="flex items-center text-xl font-bold">
                  <Ticket className="h-5 w-5 mr-3 text-indigo-600" /> Book Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {!user && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <AlertDescription className="text-amber-800 font-medium font-sm mb-3">Please log in to book tickets for this event.</AlertDescription>
                    <Button variant="default" className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg">Log In / Sign Up</Button>
                  </div>
                )}

                {user && myTicketsError && (
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                    <AlertDescription className="font-medium text-red-800">{myTicketsError}</AlertDescription>
                  </Alert>
                )}

                {user && hasTicketForEvent && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-emerald-800 mb-1">You're Going!</p>
                    <p className="text-sm text-emerald-600 mb-4">You already have a ticket for this event.</p>
                    <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-xl" onClick={() => window.location.href = '/user/tickets'}>
                      View My Tickets
                    </Button>
                  </div>
                )}

                {canBook && user && !hasTicketForEvent && (
                  <div className="space-y-5">
                    {bookingError && (
                      <Alert variant="destructive" className="rounded-xl">
                        <AlertDescription className="font-medium">{bookingError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">Select Quantity</label>
                      <div className="relative">
                        <select
                          value={bookingQuantity}
                          onChange={(e) => setBookingQuantity(parseInt(e.target.value))}
                          className="w-full p-3.5 pl-4 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white font-medium text-gray-900 shadow-sm transition-shadow hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loading || hasTicketForEvent}
                        >
                          {[...Array(Math.min(10, availableSeatsEffective ?? 0))].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Ticket' : 'Tickets'}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">Ticket Price</span>
                        <span className="font-bold text-gray-900">{formatPrice(event)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">Quantity</span>
                        <span className="font-bold text-gray-900">x {bookingQuantity}</span>
                      </div>
                      <Separator className="bg-gray-200" />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-extrabold text-2xl text-indigo-600">{event.pricing?.type === 'free' ? 'Free' : `$${getTotalPrice()}`}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={loading || hasTicketForEvent || (showSeatSelection && selectedSeats.length < bookingQuantity)}
                      className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {loading ? (
                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Processing Payment...</>
                      ) : (
                        `Checkout Now`
                      )}
                    </Button>

                    <div className="text-xs text-center text-gray-500 font-medium flex items-center justify-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                      </div>
                      Instant confirmation & secure booking
                    </div>
                  </div>
                )}

                {!canBook && (
                  <div className="text-center py-2 space-y-4">
                    {eventStatus.status === 'past' ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                        <div className="w-12 h-12 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-gray-700 mb-1">Event Concluded</p>
                        <p className="text-sm text-gray-500">This event has already passed.</p>
                      </div>
                    ) : (
                      <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-5">
                        <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <Users className="w-5 h-5" />
                        </div>
                        {isWaitlisted || waitlistSuccess ? (
                          <>
                            <p className="font-bold text-emerald-700 mb-2 flex items-center justify-center gap-2">
                              <CheckCircle className="h-4 w-4" /> You're on the list!
                            </p>
                            <p className="text-sm text-gray-600">We'll notify you if a spot opens up.</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-orange-800 mb-1">Tickets Sold Out</p>
                            <p className="text-sm text-gray-600 mb-4">You can still join the waitlist for potential openings.</p>
                            {bookingError && (
                              <Alert variant="destructive" className="mb-4 text-left">
                                <AlertDescription>{bookingError}</AlertDescription>
                              </Alert>
                            )}
                            <Button
                              onClick={handleJoinWaitlist}
                              disabled={waitlistLoading || !user}
                              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md h-12 font-bold transition-transform hover:-translate-y-0.5"
                            >
                              {waitlistLoading ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Joining...</>
                              ) : (
                                'Join Waitlist'
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="sticky border-0 shadow-md rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white overflow-hidden ring-1 ring-white/10" style={{ top: statsTop }}>
            {/* Decorative BG element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg font-bold flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-400" /> Event Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-indigo-200 uppercase font-semibold tracking-wider">Total Views</div>
                  <div className="font-bold text-xl">{event?.analytics?.views || 0}</div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <div className="text-xs text-indigo-200 uppercase font-semibold tracking-wider">Tickets Sold</div>
                    <div className="text-xs font-bold text-emerald-400">{totalSeats ? Math.round((Math.max(0, (totalSeats || 0) - (availableSeatsEffective || 0)) / totalSeats) * 100) : 0}%</div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${totalSeats ? Math.round((Math.max(0, (totalSeats || 0) - (availableSeatsEffective || 0)) / totalSeats) * 100) : 0}%` }}></div>
                  </div>
                  <div className="text-xs text-slate-400 text-right">{Math.max(0, (totalSeats || 0) - (availableSeatsEffective || 0))} / {totalSeats || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

