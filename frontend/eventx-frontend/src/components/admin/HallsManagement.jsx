import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Building2, MapPin, Users, Image as ImageIcon, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

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
        equipment: [],
        locationFloor: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchHalls();
    }, []);

    const fetchHalls = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/halls`, {
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
                equipment: hall.equipment ? [...hall.equipment] : [],
                locationFloor: hall.location?.floor || '',
            });
        } else {
            setEditingHall(null);
            setFormData({
                name: '',
                description: '',
                capacity: 0,
                hourlyRate: 0,
                equipment: [],
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

        const payload = {
            name: formData.name,
            description: formData.description,
            capacity: Number(formData.capacity),
            hourlyRate: Number(formData.hourlyRate),
            equipment: formData.equipment,
            location: {
                floor: formData.locationFloor
            }
        };

        try {
            const url = editingHall
                ? `${import.meta.env.VITE_API_BASE_URL}/halls/${editingHall._id}`
                : `${import.meta.env.VITE_API_BASE_URL}/halls`;

            const method = editingHall ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/halls/${id}`, {
                method: 'DELETE',
                credentials: 'include'
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
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full animate-pulse">
                <div className="h-12 bg-gray-200 rounded-xl w-64"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="h-64 bg-gray-200 rounded-2xl"></div>
                    <div className="h-64 bg-gray-200 rounded-2xl"></div>
                    <div className="h-64 bg-gray-200 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    const WhiteCard = ({ children, className = '' }) => (
        <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-gray-900">Venue Halls Management</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Manage physical spaces, capacities, and rental details</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-gray-900 hover:bg-black text-white shadow-md rounded-xl">
                    <Plus className="w-4 h-4 mr-2" /> Add Hall
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {halls.map((hall) => (
                    <WhiteCard key={hall._id} className="hover:shadow-md transition-all duration-300 flex flex-col group">
                        <div className="h-48 bg-gray-100 relative overflow-hidden">
                            {hall.images && hall.images.length > 0 ? (
                                <img src={hall.images[0].url} alt={hall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex flex-col justify-center items-center bg-gray-50 text-gray-300 border-b border-gray-100">
                                    <Building2 className="w-12 h-12 mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">No Image</span>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm border border-gray-100">
                                <button className="p-1.5 text-gray-600 hover:text-blue-600 transition-colors" onClick={() => handleOpenModal(hall)}>
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button className="p-1.5 text-gray-600 hover:text-red-600 transition-colors" onClick={() => handleDelete(hall._id)}>
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors">{hall.name}</h3>
                            <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-2 leading-relaxed flex-1">{hall.description || 'No description provided.'}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mt-5 pt-5 border-t border-gray-100">
                                <div className="flex items-center text-gray-700 font-semibold bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                    <Users className="w-4 h-4 mr-2 text-indigo-500" />
                                    {hall.capacity} <span className="font-normal text-gray-500 ml-1 text-xs">PPL</span>
                                </div>
                                <div className="flex items-center text-gray-700 font-semibold bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                    <MapPin className="w-4 h-4 mr-2 text-rose-500" />
                                    <span className="truncate">{hall.location?.floor || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center bg-blue-50/50 rounded-xl p-3 border border-blue-50">
                                <div className="flex items-center">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" />
                                    <span className="text-sm font-bold text-gray-700">{hall.equipment?.length || 0} Amenities</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-gray-900">${hall.hourlyRate}</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-0.5">/hr</span>
                                </div>
                            </div>
                        </div>
                    </WhiteCard>
                ))}
                {halls.length === 0 && (
                    <div className="col-span-full">
                        <WhiteCard>
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                    <Building2 className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-extrabold text-gray-900 mb-2">No venue halls configured</h3>
                                <p className="text-gray-500 font-medium mb-6 max-w-sm">Get started by building your first physical space on the platform to host events.</p>
                                <Button onClick={() => handleOpenModal()} className="bg-gray-900 hover:bg-black text-white rounded-xl shadow-md">
                                    <Building2 className="w-4 h-4 mr-2" /> Add Your First Hall
                                </Button>
                            </div>
                        </WhiteCard>
                    </div>
                )}
            </div>

            {/* Basic Modal Implementation */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-10 flex justify-between items-center">
                            <h2 className="text-xl font-extrabold text-gray-900">{editingHall ? 'Edit Venue Hall' : 'Create New Venue Hall'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-sm font-bold text-gray-700">Hall Name*</Label>
                                <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. Grand Ballroom" className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-100" />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-sm font-bold text-gray-700">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full min-h-[100px] border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:outline-none resize-none transition-colors"
                                    placeholder="Describe the physical layout, capabilities, and vibe..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="capacity" className="text-sm font-bold text-gray-700">Capacity (Persons)*</Label>
                                    <Input id="capacity" name="capacity" type="number" min="1" required value={formData.capacity} onChange={handleInputChange} className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-100" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="hourlyRate" className="text-sm font-bold text-gray-700">Hourly Rate ($)*</Label>
                                    <Input id="hourlyRate" name="hourlyRate" type="number" min="0" step="0.01" required value={formData.hourlyRate} onChange={handleInputChange} className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-100" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="locationFloor" className="text-sm font-bold text-gray-700">Floor/Location</Label>
                                <Input id="locationFloor" name="locationFloor" value={formData.locationFloor} onChange={handleInputChange} placeholder="e.g. 1st Floor, Main Wing" className="rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-100" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700">Equipment & Amenities</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {[
                                        'projector', 'screen', 'sound_system', 'microphone', 'wifi',
                                        'stage', 'lighting', 'air_conditioning', 'whiteboard',
                                        'video_conferencing', 'recording_equipment', 'catering_area'
                                    ].map(item => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    equipment: prev.equipment.includes(item)
                                                        ? prev.equipment.filter(e => e !== item)
                                                        : [...prev.equipment, item]
                                                }));
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                                                formData.equipment.includes(item)
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs font-medium text-gray-500 mt-1">Select the amenities available in this room.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                                <Button type="button" variant="ghost" onClick={handleCloseModal} className="font-bold rounded-xl hover:bg-gray-100 text-gray-600">Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 shadow-md font-bold rounded-xl px-6">
                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {editingHall ? 'Save Changes' : 'Create Hall'}
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
