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
  Plus,
  Image,
  Clock,
  Tag,
  Building,
  Globe
} from 'lucide-react';

const EventForm = ({ event, onSave, onCancel }) => {
  const validStatuses = ['draft', 'published', 'cancelled', 'completed'];

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

    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');

      // Handle array indices in nested paths (e.g., 'seating.sections.0.price')
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
        newFormData[parent] = {
          ...newFormData[parent],
          [child]: value
        };
      }

      // Special handling for seating configuration
      if (parent === 'seating' && child === 'totalSeats') {
        const totalSeats = parseInt(value) || 0;
        const venueCapacity = parseInt(newFormData.venue?.capacity) || 0;

        // Ensure totalSeats doesn't exceed venue capacity
        if (venueCapacity > 0 && totalSeats > venueCapacity) {
          newFormData.seating.totalSeats = venueCapacity;
        }

        // Ensure availableSeats doesn't exceed totalSeats
        if (newFormData.seating.availableSeats > totalSeats) {
          newFormData.seating.availableSeats = totalSeats;
        }
      }

      // When venue capacity changes, adjust totalSeats if needed
      if (parent === 'venue' && child === 'capacity') {
        const newCapacity = parseInt(value) || 0;
        if (newFormData.seating.totalSeats > newCapacity) {
          newFormData.seating.totalSeats = newCapacity;
          if (newFormData.seating.availableSeats > newCapacity) {
            newFormData.seating.availableSeats = newCapacity;
          }
        }
      }

      // Ensure availableSeats doesn't exceed totalSeats
      if (parent === 'seating' && child === 'availableSeats') {
        const availableSeats = parseInt(value) || 0;
        const totalSeats = parseInt(newFormData.seating.totalSeats) || 0;
        if (availableSeats > totalSeats) {
          newFormData.seating.availableSeats = totalSeats;
        }
      }

      // Validate pricing for paid events
      if (parent === 'pricing' && child === 'amount') {
        const price = parseFloat(value) || 0;
        if (newFormData.pricing.type === 'paid' && price <= 0 && value !== '') {
          // Don't update the value if it's 0 or negative for paid events
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
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    setError('');
  };

  const validateForm = () => {
    // Basic front-end validation aligned with backend constraints
    if (!formData.category) {
      throw new Error('Category is required');
    }
    if (!formData?.venue?.country) {
      throw new Error('Country is required');
    }

    const totalSeatsNum = parseInt(formData.seating.totalSeats);
    const availableSeatsNum = parseInt(formData.seating.availableSeats);
    const venueCapacityNum = parseInt(formData.venue.capacity);

    if (Number.isNaN(venueCapacityNum) || venueCapacityNum < 1) {
      throw new Error('Venue capacity must be at least 1');
    }

    if (Number.isNaN(totalSeatsNum) || totalSeatsNum < 1) {
      throw new Error('Total seats must be at least 1');
    }

    if (totalSeatsNum > venueCapacityNum) {
      throw new Error('Total seats cannot exceed venue capacity');
    }

    if (Number.isNaN(availableSeatsNum) || availableSeatsNum < 0) {
      throw new Error('Available seats cannot be negative');
    }

    if (availableSeatsNum > totalSeatsNum) {
      throw new Error('Available seats cannot exceed total seats');
    }

    // Validate pricing
    if (formData.pricing.type === 'paid') {
      const priceNum = parseFloat(formData.pricing.amount);
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        throw new Error('Paid events must have a price greater than 0');
      }
    }

    return { totalSeatsNum, availableSeatsNum, venueCapacityNum };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form data
      const { totalSeatsNum, availableSeatsNum, venueCapacityNum } = validateForm();

      const eventData = {
        ...formData,
        venue: {
          ...formData.venue,
          capacity: venueCapacityNum
        },
        seating: {
          ...formData.seating,
          totalSeats: totalSeatsNum,
          availableSeats: availableSeatsNum
        },
        pricing: {
          ...formData.pricing,
          amount: formData.pricing.type === 'free' ? 0 : parseFloat(formData.pricing.amount)
        }
      };

      const url = event
        ? `${API_BASE_URL}/events/${event._id}`
        : `${API_BASE_URL}/events`;

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
      console.error('Event save error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'conference',
    'workshop',
    'seminar',
    'concert',
    'sports',
    'exhibition',
    'networking',
    'other'
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Plus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {event ? 'Edit Event' : 'Create New Event'}
            </h1>
            <p className="text-gray-600">
              {event ? 'Update your event details and settings' : 'Fill in the details to create an amazing event'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            form="event-form"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {event ? 'Update Event' : 'Create Event'}
              </>
            )}
          </Button>
        </div>
      </div>

      <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Tag className="w-5 h-5 text-blue-600" />
              <span>Basic Information</span>
            </CardTitle>
            <CardDescription>
              Enter the essential details about your event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">Event Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Annual Tech Conference 2024"
                className="text-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Event Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide a detailed description of your event, including what attendees can expect..."
                rows={5}
                className="resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
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
                    id="date"
                    name="date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={handleChange}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">📝 Draft</SelectItem>
                    <SelectItem value="published">✅ Published</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                    <SelectItem value="completed">🏁 Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Venue Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <span>Venue Information</span>
            </CardTitle>
            <CardDescription>
              Specify where your event will take place
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="venue.name" className="text-sm font-medium text-gray-700">Venue Name *</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="venue.name"
                  name="venue.name"
                  value={formData.venue.name}
                  onChange={handleChange}
                  placeholder="e.g., Grand Convention Center"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue.address" className="text-sm font-medium text-gray-700">Street Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="venue.address"
                  name="venue.address"
                  value={formData.venue.address}
                  onChange={handleChange}
                  placeholder="e.g., 123 Main Street, Suite 100"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="venue.city" className="text-sm font-medium text-gray-700">City *</Label>
                <Input
                  id="venue.city"
                  name="venue.city"
                  value={formData.venue.city}
                  onChange={handleChange}
                  placeholder="e.g., New York"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue.country" className="text-sm font-medium text-gray-700">Country *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="venue.country"
                    name="venue.country"
                    value={formData.venue.country}
                    onChange={handleChange}
                    placeholder="e.g., United States"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="venue.capacity" className="text-sm font-medium text-gray-700">Venue Capacity *</Label>
                  <span className="text-xs text-gray-500">
                    Max: {formData.venue.capacity} {formData.venue.capacity === '1' ? 'person' : 'people'}
                  </span>
                </div>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="venue.capacity"
                    name="venue.capacity"
                    type="number"
                    min="1"
                    value={formData.venue.capacity}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    className={`pl-10 h-11 ${parseInt(formData.venue.capacity) < parseInt(formData.seating.totalSeats) ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {parseInt(formData.venue.capacity) < parseInt(formData.seating.totalSeats) && (
                  <p className="text-xs text-red-500 mt-1">
                    Venue capacity cannot be less than total seats
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seating, Pricing & Images */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Seating Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure event capacity and seating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="seating.totalSeats" className="text-sm font-medium text-gray-700">Total Seats *</Label>
                  <span className="text-xs text-gray-500">
                    {formData.venue.capacity - formData.seating.totalSeats} seats remaining
                  </span>
                </div>
                <Input
                  id="seating.totalSeats"
                  name="seating.totalSeats"
                  type="number"
                  value={formData.seating.totalSeats}
                  onChange={handleChange}
                  min="1"
                  max={formData.venue.capacity}
                  placeholder="e.g., 100"
                  className={`h-11 ${parseInt(formData.seating.totalSeats) > parseInt(formData.venue.capacity) ? 'border-red-500' : ''}`}
                  required
                />
                {parseInt(formData.seating.totalSeats) > parseInt(formData.venue.capacity) && (
                  <p className="text-xs text-red-500 mt-1">
                    Cannot exceed venue capacity of {formData.venue.capacity}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="seating.availableSeats" className="text-sm font-medium text-gray-700">Available Seats *</Label>
                  <span className="text-xs text-gray-500">
                    {formData.seating.availableSeats} of {formData.seating.totalSeats} available
                  </span>
                </div>
                <Input
                  id="seating.availableSeats"
                  name="seating.availableSeats"
                  type="number"
                  value={formData.seating.availableSeats}
                  onChange={handleChange}
                  min="0"
                  max={formData.seating.totalSeats}
                  placeholder="e.g., 100"
                  className={`h-11 ${parseInt(formData.seating.availableSeats) > parseInt(formData.seating.totalSeats) ? 'border-red-500' : ''}`}
                  required
                />
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (formData.seating.availableSeats / formData.seating.totalSeats) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>Capacity: {formData.seating.totalSeats}</span>
                </div>

                {parseInt(formData.seating.availableSeats) > parseInt(formData.seating.totalSeats) && (
                  <p className="text-xs text-red-500 mt-1">
                    Available seats cannot exceed total seats
                  </p>
                )}

              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span>Ticket Pricing</span>
              </CardTitle>
              <CardDescription>
                Set your ticket pricing strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pricing.type" className="text-sm font-medium text-gray-700">Pricing Type *</Label>
                <Select
                  value={formData.pricing.type}
                  onValueChange={(value) => handleSelectChange('pricing.type', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose pricing model" />
                  </SelectTrigger>
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
                      id="pricing.amount"
                      name="pricing.amount"
                      type="number"
                      step="0.01"
                      value={formData.pricing.amount}
                      onChange={handleChange}
                      min="0.01"
                      placeholder="0.00"
                      className={`pl-10 h-11 ${parseFloat(formData.pricing.amount) <= 0 && formData.pricing.amount !== '' ? 'border-red-500' : ''}`}
                      required
                    />
                  </div>
                  {parseFloat(formData.pricing.amount) <= 0 && formData.pricing.amount !== '' && (
                    <p className="text-xs text-red-500 mt-1">
                      Paid events must have a price greater than $0.00
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Minimum price: $0.01
                  </p>
                </div>
              )}

              {formData.pricing.type === 'free' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700">
                    🎉 This will be a free event - no payment required
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Image className="w-5 h-5 text-orange-600" />
                <span>Event Images</span>
              </CardTitle>
              <CardDescription>Add images to showcase your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-sm font-medium text-gray-700">Image URL</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  className="h-11"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      e.preventDefault();
                      setFormData({
                        ...formData,
                        images: [...(formData.images || []), { url: e.target.value }]
                      });
                      e.target.value = '';
                    }
                  }}
                />
                <p className="text-xs text-gray-500">Press Enter to add the image</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Images Added</span>
                  <span className="text-sm text-gray-600">{(formData.images || []).length}</span>
                </div>
                {(formData.images || []).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {(formData.images || []).map((img, idx) => (
                      <div key={idx} className="truncate">{img.url}</div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <Card className="bg-gray-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {event ? 'Update your event details' : 'Ready to create your event?'}
              </div>
              <div className="flex items-center space-x-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
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
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default EventForm;

