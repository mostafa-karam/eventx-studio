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
    Building2,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
    useAuth();
    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        minCapacity: '',
        sort: 'name'
    });

    const [selectedHalls, setSelectedHalls] = useState([]);

    const toggleCompare = (hallId) => {
        setSelectedHalls(prev => {
            if (prev.includes(hallId)) {
                return prev.filter(id => id !== hallId);
            }
            if (prev.length >= 4) {
                return prev;
            }
            return [...prev, hallId];
        });
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchHalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    {halls.map((hall) => {
                        const isSelected = selectedHalls.includes(hall._id);
                        return (
                            <div
                                key={hall._id}
                                className={`bg-white rounded-xl border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200'} overflow-hidden hover:shadow-lg transition-all group cursor-pointer flex flex-col relative`}
                                onClick={() => onSelectHall(hall)}
                            >
                                {/* Compare Checkbox */}
                                <div className="absolute top-3 left-3 z-20">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCompare(hall._id);
                                        }}
                                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors border shadow-sm ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/80 backdrop-blur-sm border-gray-300 hover:bg-white text-transparent hover:text-gray-300'
                                            }`}
                                        title={isSelected ? "Remove from comparison" : "Add to comparison"}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </button>
                                </div>

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
                                    <div className="absolute top-3 right-3 bg-white shadow-lg px-3 py-1.5 rounded-xl border border-gray-100/50 backdrop-blur-md">
                                        <p className="text-indigo-600 font-black text-lg leading-none">${hall.hourlyRate}<span className="text-gray-500 font-medium text-xs ml-1">/hr</span></p>
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
                        )
                    })}
                </div>
            )}

            {/* Compare Floating Bar */}
            {selectedHalls.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-100 px-6 py-4 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div>
                        <p className="text-gray-900 font-semibold">{selectedHalls.length} {selectedHalls.length === 1 ? 'Hall' : 'Halls'} Selected</p>
                        <p className="text-xs text-gray-500">Select up to 4 halls to compare</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedHalls([])}
                            className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-2"
                        >
                            Clear
                        </button>
                        <Link
                            to={`/halls/compare?ids=${selectedHalls.join(',')}`}
                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${selectedHalls.length > 1
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            onClick={(e) => selectedHalls.length < 2 && e.preventDefault()}
                        >
                            Compare Now <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HallBrowser;
