import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
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
  Circle
} from 'lucide-react';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: Tag },
  { id: 'venue', label: 'Venue details', icon: MapPin },
  { id: 'capacity', label: 'Capacity & Seating', icon: Users },
  { id: 'tickets', label: 'Tickets & Media', icon: DollarSign }
];

const EventForm = ({ event, onSave, onCancel }) => {
  const validStatuses = ['draft', 'published', 'cancelled', 'completed'];

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
    images: event?.images || []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData };

    if (name.includes('.')) {
      const [parent, child] = name.split('.');

      const path = name.split('.');
      if (path.length > 2 && !isNaN(parseInt(path[1]))) {
        const arrayName = path[0];
        const index = parseInt(path[1]);
        const field = path[2];

        newFormData[arrayName] = [...newFormData[arrayName]];
        newFormData[arrayName][index] = {
          ...newFormData[arrayName][index],
          [field]: field === 'price' ? parseFloat(value) || 0 : value
        };
      } else {
        newFormData[parent] = { ...newFormData[parent], [child]: value };
      }

      // Sync rules
      if (parent === 'seating' && child === 'totalSeats') {
        const totalSeats = parseInt(value) || 0;
        const venueCapacity = parseInt(newFormData.venue?.capacity) || 0;
        if (venueCapacity > 0 && totalSeats > venueCapacity) {
          newFormData.seating.totalSeats = venueCapacity;
        }
        if (newFormData.seating.availableSeats > totalSeats) {
          newFormData.seating.availableSeats = totalSeats;
        }
      }

      if (parent === 'venue' && child === 'capacity') {
        const newCapacity = parseInt(value) || 0;
        if (newFormData.seating.totalSeats > newCapacity) {
          newFormData.seating.totalSeats = newCapacity;
          if (newFormData.seating.availableSeats > newCapacity) {
            newFormData.seating.availableSeats = newCapacity;
          }
        }
      }

      if (parent === 'seating' && child === 'availableSeats') {
        const availableSeats = parseInt(value) || 0;
        const totalSeats = parseInt(newFormData.seating.totalSeats) || 0;
        if (availableSeats > totalSeats) {
          newFormData.seating.availableSeats = totalSeats;
        }
      }

      if (parent === 'pricing' && child === 'amount') {
        const price = parseFloat(value) || 0;
        if (newFormData.pricing.type === 'paid' && price <= 0 && value !== '') {
          return;
        }
      }
    } else {
      newFormData[name] = value;
    }

    setFormData(newFormData);
    setError('');
  };

  const handleSelectChange = (name, value) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: { ...formData[parent], [child]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setError('');
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.title) return 'Event Title is required';
      if (!formData.description) return 'Description is required';
      if (!formData.category) return 'Category is required';
      if (!formData.date) return 'Date & Time is required';
    } else if (step === 1) {
      if (!formData.venue.name) return 'Venue Name is required';
      if (!formData.venue.address) return 'Street Address is required';
      if (!formData.venue.city) return 'City is required';
      if (!formData.venue.country) return 'Country is required';
      const venueCapacityNum = parseInt(formData.venue.capacity);
      if (isNaN(venueCapacityNum) || venueCapacityNum < 1) return 'Venue capacity must be at least 1';
    } else if (step === 2) {
      const totalSeatsNum = parseInt(formData.seating.totalSeats);
      const availableSeatsNum = parseInt(formData.seating.availableSeats);
      const venueCapacityNum = parseInt(formData.venue.capacity);
      if (isNaN(totalSeatsNum) || totalSeatsNum < 1) return 'Total seats must be at least 1';
      if (totalSeatsNum > venueCapacityNum) return 'Total seats cannot exceed venue capacity';
      if (isNaN(availableSeatsNum) || availableSeatsNum < 0) return 'Available seats cannot be negative';
      if (availableSeatsNum > totalSeatsNum) return 'Available seats cannot exceed total seats';
    } else if (step === 3) {
      if (formData.pricing.type === 'paid') {
        const priceNum = parseFloat(formData.pricing.amount);
        if (isNaN(priceNum) || priceNum <= 0) return 'Paid events must have a price greater than 0';
      }
    }
    return null;
  };

  const handleNext = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setError('');
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Final validation of current step before submitting
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { venue, seating, pricing } = formData;
      const eventData = {
        ...formData,
        venue: { ...venue, capacity: parseInt(venue.capacity) },
        seating: { ...seating, totalSeats: parseInt(seating.totalSeats), availableSeats: parseInt(seating.availableSeats) },
        pricing: { ...pricing, amount: pricing.type === 'free' ? 0 : parseFloat(pricing.amount) }
      };

      const url = event ? `${API_BASE_URL}/events/${event._id}` : `${API_BASE_URL}/events`;
      const method = event ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        const data = await response.json();
        onSave(data.data.event);
      } else {
        const data = await response.json();
        const backendErrors = Array.isArray(data?.errors) ? data.errors.join(', ') : '';
        setError(backendErrors || data.message || 'Failed to save event');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full" />
        <div
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 transition-all duration-300 ease-in-out -z-10 rounded-full"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={idx} className="flex flex-col items-center cursor-pointer" onClick={() => {
              // Only allow jumping back, not jumping forward
              if (idx < currentStep) setCurrentStep(idx);
            }}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white transition-colors duration-200 ${isCompleted ? 'bg-blue-600 text-white' : isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-100' : 'bg-gray-200 text-gray-500'
                }`}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
              </div>
              <span className={`mt-2 text-xs font-medium ${isCurrent || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Plus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {event ? 'Edit Event' : 'Create New Event'}
            </h1>
            <p className="text-gray-600">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      {renderStepper()}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 min-h-[400px]">
        {/* Step 0: Basic Info */}
        {currentStep === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">Event Title *</Label>
              <Input
                id="title" name="title"
                value={formData.title} onChange={handleChange}
                placeholder="e.g., Annual Tech Conference 2024"
                className="text-lg" required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Event Description *</Label>
              <Textarea
                id="description" name="description"
                value={formData.description} onChange={handleChange}
                placeholder="Provide a detailed description of your event, including what attendees can expect..."
                rows={5} className="resize-none" required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conference">🏢 Conference</SelectItem>
                    <SelectItem value="workshop">🛠️ Workshop</SelectItem>
                    <SelectItem value="seminar">📚 Seminar</SelectItem>
                    <SelectItem value="concert">🎵 Concert</SelectItem>
                    <SelectItem value="sports">🏆 Sports</SelectItem>
                    <SelectItem value="exhibition">🎨 Exhibition</SelectItem>
                    <SelectItem value="networking">🤝 Networking</SelectItem>
                    <SelectItem value="other">📅 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-gray-700">Date & Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="date" name="date" type="datetime-local"
                    value={formData.date} onChange={handleChange}
                    className="pl-10 h-11" required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">Initial Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">📝 Draft</SelectItem>
                    <SelectItem value="published">✅ Published</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                    <SelectItem value="completed">🏁 Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Venue Info */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label htmlFor="venue.name" className="text-sm font-medium text-gray-700">Venue Name *</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="venue.name" name="venue.name"
                  value={formData.venue.name} onChange={handleChange}
                  placeholder="e.g., Grand Convention Center"
                  className="pl-10 h-11" required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue.address" className="text-sm font-medium text-gray-700">Street Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="venue.address" name="venue.address"
                  value={formData.venue.address} onChange={handleChange}
                  placeholder="e.g., 123 Main Street, Suite 100"
                  className="pl-10 h-11" required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="venue.city" className="text-sm font-medium text-gray-700">City *</Label>
                <Input
                  id="venue.city" name="venue.city"
                  value={formData.venue.city} onChange={handleChange}
                  placeholder="e.g., New York" className="h-11" required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue.country" className="text-sm font-medium text-gray-700">Country *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="venue.country" name="venue.country"
                    value={formData.venue.country} onChange={handleChange}
                    placeholder="e.g., United States" className="pl-10 h-11" required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="venue.capacity" className="text-sm font-medium text-gray-700">Max Venue Capacity *</Label>
                </div>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="venue.capacity" name="venue.capacity" type="number" min="1"
                    value={formData.venue.capacity} onChange={handleChange}
                    placeholder="e.g., 500" className="pl-10 h-11" required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Capacity & Seating */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-indigo-800 flex items-center">
                <Building className="w-4 h-4 mr-2" />
                Your max venue capacity is set to <strong>{formData.venue.capacity}</strong>. Total seats cannot exceed this.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="seating.totalSeats" className="text-sm font-medium text-gray-700">Total Event Seats *</Label>
                <span className="text-xs text-gray-500">{formData.venue.capacity - formData.seating.totalSeats} seats remaining in venue</span>
              </div>
              <Input
                id="seating.totalSeats" name="seating.totalSeats" type="number"
                value={formData.seating.totalSeats} onChange={handleChange}
                min="1" max={formData.venue.capacity}
                className={`h-11 ${parseInt(formData.seating.totalSeats) > parseInt(formData.venue.capacity) ? 'border-red-500' : ''}`}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="seating.availableSeats" className="text-sm font-medium text-gray-700">Initial Available Seats *</Label>
                <span className="text-xs text-gray-500">{formData.seating.availableSeats} of {formData.seating.totalSeats} available for sale</span>
              </div>
              <Input
                id="seating.availableSeats" name="seating.availableSeats" type="number"
                value={formData.seating.availableSeats} onChange={handleChange}
                min="0" max={formData.seating.totalSeats}
                className={`h-11 ${parseInt(formData.seating.availableSeats) > parseInt(formData.seating.totalSeats) ? 'border-red-500' : ''}`}
                required
              />

              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{
                  width: `${Math.min(100, (formData.seating.availableSeats / formData.seating.totalSeats) * 100 || 0)}%`
                }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Tickets & Media */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label htmlFor="pricing.type" className="text-sm font-medium text-gray-700">Pricing Type *</Label>
              <Select value={formData.pricing.type} onValueChange={(value) => handleSelectChange('pricing.type', value)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choose pricing model" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">🆓 Free Event</SelectItem>
                  <SelectItem value="paid">💰 Paid Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.pricing.type === 'paid' && (
              <div className="space-y-2">
                <Label htmlFor="pricing.amount" className="text-sm font-medium text-gray-700">Ticket Price (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="pricing.amount" name="pricing.amount" type="number" step="0.01" min="0.01"
                    value={formData.pricing.amount} onChange={handleChange}
                    placeholder="0.00"
                    className="pl-10 h-11" required
                  />
                </div>
              </div>
            )}

            {formData.pricing.type === 'free' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700">🎉 This will be a free event - no payment required.</p>
              </div>
            )}

            <div className="pt-6 border-t mt-6 border-gray-100">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Event Images</Label>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    id="imageUrl" name="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    className="h-11 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        e.preventDefault();
                        setFormData({ ...formData, images: [...formData.images, { url: e.target.value }] });
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">Press Enter in the field above to add image URLs.</p>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                        <img src={img.url} alt="Event preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="w-24 border-gray-300 text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="w-24 bg-blue-600 hover:bg-blue-700"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-40 bg-green-600 hover:bg-green-700 shadow-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {event ? 'Update Event' : 'Create Event'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EventForm;
