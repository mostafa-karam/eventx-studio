import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { TiptapEditor } from '../ui/TiptapEditor';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Save,
  ArrowLeft,
  ArrowRight,
  Plus,
  Image as ImageIcon,
  Clock,
  Tag,
  Building,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: Tag },
  { id: 'venue', label: 'Venue details', icon: MapPin },
  { id: 'capacity', label: 'Capacity & Seating', icon: Users },
  { id: 'tickets', label: 'Tickets & Media', icon: DollarSign }
];

const EventForm = ({ event, onSave }) => {
  const validStatuses = ['draft', 'published', 'cancelled', 'completed'];
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [isFetchingEvent, setIsFetchingEvent] = useState(!!eventId && !event);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || '',
    date: event?.date ? new Date(event.date).toISOString().slice(0, 16) : '',
    status: validStatuses.includes(event?.status) ? event.status : 'draft',
    venue: {
      name: event?.venue?.name || '',
      address: event?.venue?.address || '',
      city: event?.venue?.city || '',
      country: event?.venue?.country || '',
      capacity: event?.venue?.capacity || event?.seating?.totalSeats || 100
    },
    seating: {
      totalSeats: event?.seating?.totalSeats || 100,
      availableSeats: event?.seating?.availableSeats || 100
    },
    pricing: {
      type: event?.pricing?.type || 'paid',
      amount: event?.pricing?.amount || 0
    },
    images: event?.images || [],
    hall: event?.hall?._id || event?.hall || null
  });

  const [bookedTicketsCount, setBookedTicketsCount] = useState(event?.ticketCount || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const isLocked = formData.status === 'published' && bookedTicketsCount > 0;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const draftKey = (eventId || event?._id) ? `eventx_draft_${eventId || event._id}` : 'eventx_new_draft';

  // Restore draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && !eventId && !event) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.currentStep !== undefined) setCurrentStep(parsed.currentStep);
        toast.info('Draft restored');
      } catch (e) { console.error(e); }
    }
  }, [draftKey, eventId, event]);

  // Save draft on change
  useEffect(() => {
    if (!eventId && !event) {
      localStorage.setItem(draftKey, JSON.stringify({ formData, currentStep }));
    }
  }, [formData, currentStep, draftKey, eventId, event]);

  // Fetch event details
  useEffect(() => {
    if (eventId && !event) {
      const fetchEvent = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/events/${eventId}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const fetchedEvent = data.data?.event || data.data;
            setFormData({
              title: fetchedEvent?.title || '',
              description: fetchedEvent?.description || '',
              category: fetchedEvent?.category || '',
              date: fetchedEvent?.date ? new Date(fetchedEvent.date).toISOString().slice(0, 16) : '',
              status: fetchedEvent?.status || 'draft',
              venue: fetchedEvent?.venue || { name: '', address: '', city: '', country: '', capacity: 100 },
              seating: fetchedEvent?.seating || { totalSeats: 100, availableSeats: 100 },
              pricing: fetchedEvent?.pricing || { type: 'paid', amount: 0 },
              images: fetchedEvent?.images || [],
              hall: fetchedEvent?.hall?._id || fetchedEvent?.hall || null
            });
            setBookedTicketsCount(fetchedEvent?.ticketCount || 0);
          }
        } catch (err) { console.error(err); }
        finally { setIsFetchingEvent(false); }
      };
      fetchEvent();
    }
  }, [eventId, event, API_BASE_URL]);

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const uploadData = new FormData();
    for (let f of files) uploadData.append('images', f);
    try {
      setUploadingImage(true);
      const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: uploadData, credentials: 'include' });
      const data = await res.json();
      if (data.success) setFormData(prev => ({ ...prev, images: [...prev.images, ...data.urls.map(url => ({ url }))] }));
    } catch (err) { console.error('Upload error:', err); toast.error('Upload failed'); }
    finally { setUploadingImage(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [p, c] = name.split('.');
      setFormData(prev => ({ ...prev, [p]: { ...prev[p], [c]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const handleSelectChange = (name, value) => {
    if (name.includes('.')) {
      const [p, c] = name.split('.');
      setFormData(prev => ({ ...prev, [p]: { ...prev[p], [c]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateStep = (step) => {
    if (step === 0 && !formData.title) return 'Title is required';
    if (step === 1 && !formData.venue.name) return 'Venue Name is required';
    return null;
  };

  const handleNext = () => {
    const err = validateStep(currentStep);
    if (err) return setError(err);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      // Coerce numeric fields before sending
      const sanitizedData = {
        ...formData,
        seating: {
          ...formData.seating,
          totalSeats: parseInt(formData.seating?.totalSeats, 10) || 0,
          availableSeats: parseInt(formData.seating?.availableSeats, 10) || 0,
        },
        pricing: {
          ...formData.pricing,
          amount: parseFloat(formData.pricing?.amount) || 0,
        },
      };
      const url = (event || eventId) ? `${API_BASE_URL}/events/${event?._id || eventId}` : `${API_BASE_URL}/events`;
      const res = await fetch(url, {
        method: (event || eventId) ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(sanitizedData)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem(draftKey);
        toast.success('Event saved!');
        if (onSave) onSave(data.data.event);
        else navigate(-1);
      } else {
        setError(data.message || 'Failed to save');
      }
    } catch (err) { console.error('Save error:', err); setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleCancelEvent = async () => {
    const reason = window.prompt("Reason for cancellation (attendees will be notified):");
    if (reason === null) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event?._id || eventId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        toast.success("Event cancelled");
        setFormData(prev => ({ ...prev, status: 'cancelled' }));
        setBookedTicketsCount(0);
      } else {
        const data = await res.json();
        toast.error(data.message);
      }
    } catch (err) { console.error('Cancel error:', err); toast.error("Error cancelling event"); }
    finally { setLoading(false); }
  };

  const renderStepper = () => (
    <div className="mb-8 flex items-center justify-between relative px-2">
      {STEPS.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center z-10">
          <div onClick={() => idx < currentStep && setCurrentStep(idx)}
            className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-2 shadow-sm transition-all ${idx === currentStep ? 'bg-blue-600 text-white border-blue-600 scale-110' :
              idx < currentStep ? 'bg-green-500 text-white border-green-500' : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}>
            {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
          </div>
          <span className="text-[10px] mt-2 font-semibold uppercase tracking-wider">{step.label}</span>
        </div>
      ))}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-0 mx-8" />
    </div>
  );

  if (isFetchingEvent) return <div className="p-20 text-center animate-pulse">Loading Event...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{(event || eventId) ? 'Edit Event' : 'New Event'}</h1>
            <p className="text-muted-foreground font-medium">{STEPS[currentStep].label}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {isLocked && (
            <Button variant="destructive" onClick={handleCancelEvent} disabled={loading} className="shadow-lg shadow-red-100">
              <XCircle className="w-4 h-4 mr-2" /> Cancel Event
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl">Cancel</Button>
        </div>
      </div>

      {isLocked && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl shadow-sm border">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="font-medium">
            This event is published and has <strong>{bookedTicketsCount}</strong> active bookings.
            Modifying critical logistics (date, venue, pricing) is restricted to protect attendees.
          </AlertDescription>
        </Alert>
      )}

      {renderStepper()}

      {error && <Alert variant="destructive" className="rounded-2xl shadow-sm">{error}</Alert>}

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 p-8 min-h-[450px]">
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label className="text-sm font-bold ml-1">Event Title</Label>
              <Input name="title" value={formData.title} onChange={handleChange} placeholder="The Big Tech Reveal" className="h-12 rounded-xl text-lg font-medium" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-bold ml-1">Description</Label>
              <TiptapEditor value={formData.description} onChange={(val) => setFormData({ ...formData, description: val })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">Category</Label>
                <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="concert">Concert</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">Date & Time</Label>
                <Input type="datetime-local" name="date" value={formData.date} onChange={handleChange} disabled={isLocked} className={`h-12 rounded-xl ${isLocked ? 'bg-gray-50 border-amber-100' : ''}`} />
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label className="text-sm font-bold ml-1">Venue / Hall Name</Label>
              <Input name="venue.name" value={formData.venue.name} onChange={handleChange} disabled={isLocked} className="h-12 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-bold ml-1">Address</Label>
              <Input name="venue.address" value={formData.venue.address} onChange={handleChange} disabled={isLocked} className="h-12 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">City</Label>
                <Input name="venue.city" value={formData.venue.city} onChange={handleChange} disabled={isLocked} className="h-12 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">Country</Label>
                <Input name="venue.country" value={formData.venue.country} onChange={handleChange} disabled={isLocked} className="h-12 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
              <Users className="w-8 h-8 text-blue-600" />
              <p className="text-sm text-blue-900 font-medium">Configure your seating capacity. If linked to a hall, this is limited by hall size.</p>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">Total Capacity</Label>
                <Input type="number" name="seating.totalSeats" value={formData.seating.totalSeats} onChange={handleChange} disabled={isLocked} className="h-12 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">Currently Available</Label>
                <Input type="number" name="seating.availableSeats" value={formData.seating.availableSeats} onChange={handleChange} className="h-12 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">Pricing Model</Label>
                <Select value={formData.pricing.type} onValueChange={(v) => handleSelectChange('pricing.type', v)} disabled={isLocked}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free Admission</SelectItem>
                    <SelectItem value="paid">Paid Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.pricing.type === 'paid' && (
                <div className="grid gap-2">
                  <Label className="text-sm font-bold ml-1">Price (USD)</Label>
                  <Input type="number" name="pricing.amount" value={formData.pricing.amount} onChange={handleChange} disabled={isLocked} className="h-12 rounded-xl" />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-50">
              <Label className="text-sm font-bold mb-4 block ml-1">Event Gallery</Label>
              <div className="flex items-center gap-4 mb-4">
                <label htmlFor="media-up" className="cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex-1 flex flex-col items-center hover:bg-gray-100 hover:border-blue-200 transition-all">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-500">Upload Media</span>
                  <input id="media-up" type="file" hidden multiple onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {formData.images.map((img, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 group relative">
                    <img src={img.url} alt={img.alt || 'Uploaded event media'} className="w-full h-full object-cover" />
                    <button onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><XCircle className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0} className="rounded-xl h-12 px-8 font-bold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="rounded-2xl h-12 px-10 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100">
            Next <ArrowRight className="w-4 h-4 ml-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading} className="rounded-2xl h-12 px-10 bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-100 min-w-[160px]">
            {loading ? 'Saving...' : 'Finalize Event'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EventForm;
