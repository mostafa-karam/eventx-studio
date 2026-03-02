import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    Search,
    Users,
    Wifi,
    Video,
    Mic,
    MonitorPlay,
    MapPin,
    ChevronRight,
    Filter,
    Check,
    Building2
} from 'lucide-react';
import { CardSkeleton } from './LoadingSkeletons';
import EmptyState from './EmptyState';
import Breadcrumbs from './Breadcrumbs';

const EQUIPMENT_ICONS = {
    'wifi': <Wifi className="w-4 h-4" />,
    'projector': <MonitorPlay className="w-4 h-4" />,
    'sound_system': <Mic className="w-4 h-4" />,
    'video_conferencing': <Video className="w-4 h-4" />
};

const HallBrowser = ({ onSelectHall }) => {
    const { token } = useAuth();
    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        minCapacity: '',
        sort: 'name'
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchHalls();
    }, [filters]);

    const fetchHalls = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: 1,
                limit: 50,
                sort: filters.sort
            });

            if (filters.search) queryParams.append('search', filters.search);
            if (filters.minCapacity) queryParams.append('minCapacity', filters.minCapacity);

            const res = await fetch(`${API_BASE_URL}/halls?${queryParams.toString()}`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                setHalls(data.data.halls);
            }
        } catch (error) {
            console.error('Failed to fetch halls:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Breadcrumbs items={[{ label: 'Browse Halls' }]} />
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Browse Halls</h1>
                <p className="text-gray-500 mt-1">Find the perfect venue for your next event</p>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search by hall name..."
                            className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Capacity</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="number"
                            name="minCapacity"
                            value={filters.minCapacity}
                            onChange={handleFilterChange}
                            placeholder="e.g. 50"
                            className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                        name="sort"
                        value={filters.sort}
                        onChange={handleFilterChange}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="name">Name (A-Z)</option>
                        <option value="capacity-desc">Capacity (High to Low)</option>
                        <option value="capacity-asc">Capacity (Low to High)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                    </select>
                </div>
            </div>

            {/* Hall Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
                </div>
            ) : halls.length === 0 ? (
                <EmptyState
                    icon={Search}
                    title="No halls found"
                    description="Try adjusting your search or filters to find what you're looking for."
                    actionText="Clear Filters"
                    onAction={() => setFilters({ search: '', minCapacity: '', sort: 'name' })}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {halls.map((hall) => (
                        <div
                            key={hall._id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group cursor-pointer flex flex-col"
                            onClick={() => onSelectHall(hall)}
                        >
                            {/* Image */}
                            <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {hall.images && hall.images.length > 0 ? (
                                    <img
                                        src={hall.images[0].url}
                                        alt={hall.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200 group-hover:bg-indigo-100 transition-colors">
                                        <Building2 className="w-16 h-16" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-sm font-semibold text-gray-900 shadow-sm">
                                    ${hall.hourlyRate}<span className="text-xs text-gray-500 font-normal">/hr</span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="mb-2">
                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{hall.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <MapPin className="w-3.5 h-3.5 mr-1" />
                                        {hall.location ? `${hall.location.floor} - ${hall.location.wing}` : 'Location TBD'}
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                                    {hall.description || 'No description available for this hall.'}
                                </p>

                                {/* Badges/Info */}
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                                        <Users className="w-3.5 h-3.5 mr-1" />
                                        Up to {hall.capacity}
                                    </span>
                                    {hall.equipment?.slice(0, 3).map((item) => (
                                        <span
                                            key={item}
                                            className="flex items-center px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs font-medium border border-gray-200"
                                            title={item.replace('_', ' ')}
                                        >
                                            {EQUIPMENT_ICONS[item] || <Check className="w-3.5 h-3.5" />}
                                        </span>
                                    ))}
                                    {hall.equipment?.length > 3 && (
                                        <span className="text-xs text-gray-400 font-medium">+{hall.equipment.length - 3}</span>
                                    )}
                                </div>

                                {/* Action */}
                                <div className="pt-4 border-t border-gray-100 mt-auto flex items-center justify-between text-indigo-600 font-medium text-sm group-hover:text-indigo-700">
                                    <span>View Details</span>
                                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HallBrowser;
