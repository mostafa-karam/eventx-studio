import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Building2, Users, MapPin, Zap, Wifi, Monitor, Music, Filter, ArrowRight, X } from 'lucide-react';
import { HallCardSkeleton } from '../components/ui/Skeletons';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const EQUIPMENT_OPTIONS = [
    'projector', 'screen', 'sound_system', 'microphone', 'wifi',
    'stage', 'lighting', 'air_conditioning', 'whiteboard', 'video_conferencing',
];

const HallCard = ({ hall }) => (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden">
        <div className="h-44 bg-gradient-to-br from-teal-500 to-emerald-600 relative overflow-hidden">
            {hall.images?.[0]?.url ? (
                <img src={hall.images[0].url} alt={hall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Building2 className="w-16 h-16 text-white" />
                </div>
            )}
            <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                {hall.equipment?.slice(0, 3).map((eq) => (
                    <span key={eq} className="px-2 py-0.5 bg-black/30 backdrop-blur-sm text-white text-xs rounded-full capitalize">
                        {eq.replace('_', ' ')}
                    </span>
                ))}
                {hall.equipment?.length > 3 && (
                    <span className="px-2 py-0.5 bg-black/30 backdrop-blur-sm text-white text-xs rounded-full">
                        +{hall.equipment.length - 3}
                    </span>
                )}
            </div>
        </div>

        <div className="p-4">
            <h3 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-teal-600 transition-colors">{hall.name}</h3>
            {hall.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{hall.description}</p>}

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-400" />
                    <span>Up to {hall.capacity.toLocaleString()}</span>
                </div>
                {hall.location?.floor && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-400" />
                        <span>Floor {hall.location.floor}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                    <p className="text-teal-600 font-semibold">${hall.hourlyRate}<span className="text-gray-400 font-normal text-xs">/hr</span></p>
                    {hall.dailyRate && <p className="text-gray-400 text-xs">${hall.dailyRate}/day</p>}
                </div>
                <Link to={`/organizer/halls/${hall._id}/book`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded-xl text-sm font-medium transition-colors group-hover:bg-teal-600 group-hover:text-white">
                    Book Hall <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    </div>
);

const PublicHallsPage = () => {
    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [minCap, setMinCap] = useState('');
    const [maxCap, setMaxCap] = useState('');
    const [equipment, setEquipment] = useState('');

    const fetchHalls = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: 12 });
        if (search) params.set('search', search);
        if (minCap) params.set('minCapacity', minCap);
        if (maxCap) params.set('maxCapacity', maxCap);
        if (equipment) params.set('equipment', equipment);

        try {
            const res = await fetch(`${API}/public/halls?${params}`);
            const data = await res.json();
            if (data.success) { setHalls(data.data.halls); setPagination(data.data.pagination); }
        } catch { setHalls([]); } finally { setLoading(false); }
    }, [search, minCap, maxCap, equipment, page]);

    useEffect(() => { fetchHalls(); }, [fetchHalls]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-600 text-white grid place-items-center font-bold text-sm">EX</div>
                        <span className="font-semibold text-gray-900 hidden sm:block">EventX Studio</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/events" className="text-sm text-gray-600 hover:text-gray-900">Browse Events</Link>
                        <Link to="/auth" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">Sign In</Link>
                    </div>
                </div>
            </header>

            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-12 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Find the Perfect Venue</h1>
                    <p className="text-teal-100 mb-8">Browse our halls — from intimate meeting rooms to grand event spaces</p>
                    <div className="flex gap-2 max-w-xl mx-auto">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchHalls()}
                                placeholder="Search halls by name..." className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none" />
                        </div>
                        <button onClick={fetchHalls} className="px-5 py-3 bg-white text-teal-600 font-semibold rounded-xl hover:bg-teal-50 transition-colors">Search</button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Filters */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <input type="number" value={minCap} onChange={(e) => setMinCap(e.target.value)} placeholder="Min cap" className="w-20 text-sm focus:outline-none" />
                        <span className="text-gray-300">–</span>
                        <input type="number" value={maxCap} onChange={(e) => setMaxCap(e.target.value)} placeholder="Max cap" className="w-20 text-sm focus:outline-none" />
                    </div>
                    <select value={equipment} onChange={(e) => setEquipment(e.target.value)}
                        className="px-3 py-2 border rounded-xl text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="">Any Equipment</option>
                        {EQUIPMENT_OPTIONS.map((eq) => (
                            <option key={eq} value={eq}>{eq.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    {(search || minCap || maxCap || equipment) && (
                        <button onClick={() => { setSearch(''); setMinCap(''); setMaxCap(''); setEquipment(''); }}
                            className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition-colors">
                            <X className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}
                    <span className="text-sm text-gray-400 ml-auto">{pagination.total || 0} halls</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => (
                            <HallCardSkeleton key={i} />
                        ))}
                    </div>
                ) : halls.length === 0 ? (
                    <div className="text-center py-20">
                        <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No halls found</h3>
                        <p className="text-gray-400">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {halls.map((hall) => <HallCard key={hall._id} hall={hall} />)}
                    </div>
                )}

                {pagination.pages > 1 && (
                    <div className="flex justify-center gap-2 mt-10">
                        {[...Array(pagination.pages)].map((_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-teal-600 text-white' : 'bg-white border text-gray-600 hover:border-teal-300'}`}>
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-16 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-8 text-center text-white">
                    <h2 className="text-2xl font-bold mb-2">Ready to Book a Hall?</h2>
                    <p className="text-teal-100 mb-6">Sign up as an organizer to request hall bookings and create events.</p>
                    <Link to="/auth" className="inline-block px-6 py-3 bg-white text-teal-600 font-semibold rounded-xl hover:bg-teal-50 transition-colors">
                        Get Started Free
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PublicHallsPage;
