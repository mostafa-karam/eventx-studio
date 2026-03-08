import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Building2, MapPin, Users, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import apiFetch from '../../utils/apiUtils';

const HallsManagement = () => {
    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHall, setEditingHall] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        capacity: 0,
        hourlyRate: 0,
        equipment: '', // comma separated string for ease right now
        locationFloor: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchHalls();
    }, []);

    const fetchHalls = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/halls`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setHalls(data.data.halls);
            } else {
                toast.error(data.message || 'Failed to fetch halls');
            }
        } catch (error) {
            toast.error('Error fetching halls');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (hall = null) => {
        if (hall) {
            setEditingHall(hall);
            setFormData({
                name: hall.name || '',
                description: hall.description || '',
                capacity: hall.capacity || 0,
                hourlyRate: hall.hourlyRate || 0,
                equipment: hall.equipment ? hall.equipment.join(', ') : '',
                locationFloor: hall.location?.floor || '',
            });
        } else {
            setEditingHall(null);
            setFormData({
                name: '',
                description: '',
                capacity: 0,
                hourlyRate: 0,
                equipment: '',
                locationFloor: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingHall(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        // Transform equipment string back to array
        const equipmentArray = formData.equipment
            .split(',')
            .map(item => item.trim())
            .filter(item => item !== '');

        const payload = {
            name: formData.name,
            description: formData.description,
            capacity: Number(formData.capacity),
            hourlyRate: Number(formData.hourlyRate),
            equipment: equipmentArray,
            location: {
                floor: formData.locationFloor
            }
        };

        try {
            const url = editingHall
                ? `${import.meta.env.VITE_API_BASE_URL}/halls/${editingHall._id}`
                : `${import.meta.env.VITE_API_BASE_URL}/halls`;

            const method = editingHall ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Hall ${editingHall ? 'updated' : 'created'} successfully`);
                handleCloseModal();
                fetchHalls();
            } else {
                toast.error(data.message || 'Failed to save hall');
            }
        } catch (error) {
            toast.error('Network error while saving hall');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this hall? This action cannot be undone.')) return;

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/halls/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Hall deleted successfully');
                fetchHalls();
            } else {
                toast.error(data.message || 'Failed to delete hall');
            }
        } catch (error) {
            toast.error('Network error during deletion');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Halls Management</h1>
                    <p className="text-sm text-gray-500">Manage venue spaces, capacities, and rental details.</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-teal-600 hover:bg-teal-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add Hall
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {halls.map((hall) => (
                    <Card key={hall._id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-40 bg-gray-100 relative">
                            {hall.images && hall.images.length > 0 ? (
                                <img src={hall.images[0].url} alt={hall.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Building2 className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{hall.name}</CardTitle>
                                <div className="flex space-x-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleOpenModal(hall)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(hall._id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardDescription className="line-clamp-2">{hall.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm mt-2 font-medium">
                                <div className="flex items-center text-gray-600">
                                    <Users className="w-4 h-4 mr-2 text-teal-500" />
                                    Cap: {hall.capacity}
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <MapPin className="w-4 h-4 mr-2 text-rose-500" />
                                    Floor: {hall.location?.floor || 'N/A'}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                <span className="text-sm text-gray-500">{hall.equipment?.length || 0} amenities</span>
                                <span className="font-semibold text-teal-600">${hall.hourlyRate}/hr</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {halls.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border border-dashed">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No halls found</h3>
                        <p>Get started by creating your first venue hall.</p>
                        <Button onClick={() => handleOpenModal()} variant="outline" className="mt-4">
                            Create Hall
                        </Button>
                    </div>
                )}
            </div>

            {/* Basic Modal Implementation */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingHall ? 'Edit Hall' : 'Create New Hall'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Hall Name*</Label>
                                <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. Grand Ballroom" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full min-h-[100px] border rounded-md p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    placeholder="Describe the hall..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="capacity">Capacity (Persons)*</Label>
                                    <Input id="capacity" name="capacity" type="number" min="1" required value={formData.capacity} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hourlyRate">Hourly Rate ($)*</Label>
                                    <Input id="hourlyRate" name="hourlyRate" type="number" min="0" step="0.01" required value={formData.hourlyRate} onChange={handleInputChange} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="locationFloor">Floor/Location</Label>
                                <Input id="locationFloor" name="locationFloor" value={formData.locationFloor} onChange={handleInputChange} placeholder="e.g. 1st Floor, Main Wing" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="equipment">Equipment (comma separated)</Label>
                                <Input id="equipment" name="equipment" value={formData.equipment} onChange={handleInputChange} placeholder="e.g. projector, wifi, stage" />
                                <p className="text-xs text-gray-500">Available generic types: projector, screen, sound_system, microphone, wifi, stage, lighting, whiteboard.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700">
                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Hall
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HallsManagement;
