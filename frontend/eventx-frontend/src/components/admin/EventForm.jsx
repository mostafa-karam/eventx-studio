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
  ArrowLeft
} from 'lucide-react';

const EventForm = ({ event, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || '',
    date: event?.date ? new Date(event.date).toISOString().slice(0, 16) : '',
    venue: {
      name: event?.venue?.name || '',
      address: event?.venue?.address || '',
      city: event?.venue?.city || '',
      country: event?.venue?.country || ''
    },
    seating: {
      totalSeats: event?.seating?.totalSeats || 100,
      availableSeats: event?.seating?.availableSeats || 100
    },
    pricing: {
      type: event?.pricing?.type || 'paid',
      amount: event?.pricing?.amount || 0
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  const handleChange = (e) => {
    const { name, value } = e.target;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const eventData = {
        ...formData,
        seating: {
          ...formData.seating,
          totalSeats: parseInt(formData.seating.totalSeats),
          availableSeats: parseInt(formData.seating.availableSeats)
        },
        pricing: {
          ...formData.pricing,
          amount: parseFloat(formData.pricing.amount)
        }
      };

      const url = event
        ? `${API_BASE_URL}/events/admin/${event._id}`
        : `${API_BASE_URL}/events/admin`;

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
        setError(data.message || 'Failed to save event');
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
    'networking',
    'entertainment',
    'sports',
    'arts',
    'technology',
    'business',
    'education'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {event ? 'Edit Event' : 'Create New Event'}
          </h2>
          <p className="text-gray-600 mt-2">
            {event ? 'Update event details' : 'Fill in the details to create a new event'}
          </p>
        </div>

        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the basic details about your event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter event title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your event"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date & Time *</Label>
                <Input
                  id="date"
                  name="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Venue Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Venue Information
            </CardTitle>
            <CardDescription>
              Where will your event take place?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue.name">Venue Name *</Label>
              <Input
                id="venue.name"
                name="venue.name"
                value={formData.venue.name}
                onChange={handleChange}
                placeholder="Enter venue name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue.address">Address *</Label>
              <Input
                id="venue.address"
                name="venue.address"
                value={formData.venue.address}
                onChange={handleChange}
                placeholder="Enter venue address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venue.city">City *</Label>
                <Input
                  id="venue.city"
                  name="venue.city"
                  value={formData.venue.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue.country">Country</Label>
                <Input
                  id="venue.country"
                  name="venue.country"
                  value={formData.venue.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seating & Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Seating
              </CardTitle>
              <CardDescription>
                Configure event capacity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seating.totalSeats">Total Seats *</Label>
                <Input
                  id="seating.totalSeats"
                  name="seating.totalSeats"
                  type="number"
                  value={formData.seating.totalSeats}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seating.availableSeats">Available Seats *</Label>
                <Input
                  id="seating.availableSeats"
                  name="seating.availableSeats"
                  type="number"
                  value={formData.seating.availableSeats}
                  onChange={handleChange}
                  min="0"
                  max={formData.seating.totalSeats}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Pricing
              </CardTitle>
              <CardDescription>
                Set ticket pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pricing.type">Pricing Type</Label>
                <Select
                  value={formData.pricing.type}
                  onValueChange={(value) => handleSelectChange('pricing.type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.pricing.type === 'paid' && (
                <div className="space-y-2">
                  <Label htmlFor="pricing.amount">Ticket Price ($) *</Label>
                  <Input
                    id="pricing.amount"
                    name="pricing.amount"
                    type="number"
                    step="0.01"
                    value={formData.pricing.amount}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
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
      </form>
    </div>
  );
};

export default EventForm;

