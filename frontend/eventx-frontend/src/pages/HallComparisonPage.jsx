import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft,
    Check,
    X,
    Users,
    MapPin,
    Building2,
    DollarSign,
    Info,
    LayoutDashboard
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const ALL_EQUIPMENT = [
    'projector', 'screen', 'sound_system', 'microphone', 'wifi',
    'stage', 'lighting', 'air_conditioning', 'whiteboard', 'video_conferencing'
];

const HallComparisonPage = () => {
    const [searchParams] = useSearchParams();
    const idsString = searchParams.get('ids');
    const navigate = useNavigate();
    const { user } = useAuth();

    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHalls = async () => {
            if (!idsString) {
                setError('No halls selected for comparison.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const res = await fetch(`${API}/halls?ids=${idsString}`);
                const data = await res.json();

                if (data.success) {
                    setHalls(data.data.halls);
                } else {
                    throw new Error(data.message || 'Failed to fetch halls for comparison');
                }
            } catch (err) {
                console.error('Comparison error:', err);
                setError(err.message || 'Network error fetching halls');
            } finally {
                setLoading(false);
            }
        };

        fetchHalls();
    }, [idsString]);

    const removeHall = (idToRemove) => {
        const newHalls = halls.filter(h => h._id !== idToRemove);
        if (newHalls.length === 0) {
            navigate('/halls'); // Redirect back if empty
            return;
        }
        setHalls(newHalls);
        const newIdsForm = newHalls.map(h => h._id).join(',');
        navigate(`/halls/compare?ids=${newIdsForm}`, { replace: true });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading comparison data...</p>
            </div>
        );
    }

    if (error || halls.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Info className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Notice</h2>
                <p className="text-gray-600 mb-6">{error || 'No halls found.'}</p>
                <Link to="/halls" className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700 transition">
                    Back to Halls
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Hall Comparison</h1>
                            <p className="text-sm text-gray-500">Comparing {halls.length} venues</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 overflow-x-auto">
                <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden min-w-[800px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-6 border-b border-gray-200 border-r w-64 min-w-[250px] sticky left-0 z-10 bg-gray-50 align-top">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Features</h3>
                                    <p className="text-sm text-gray-500 font-normal">Detailed side-by-side comparison</p>
                                </th>
                                {halls.map(hall => (
                                    <th key={hall._id} className="p-6 border-b border-gray-200 min-w-[280px] w-[280px] align-top relative">
                                        <button
                                            onClick={() => removeHall(hall._id)}
                                            className="absolute top-4 right-4 p-1.5 bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Remove from comparison"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        <div className="h-32 mb-4 bg-gray-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                                            {hall.images?.[0]?.url ? (
                                                <img src={hall.images[0].url} alt={hall.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-10 h-10 text-gray-300" />
                                            )}
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 mb-1">{hall.name}</h4>
                                        <p className="text-sm font-normal text-gray-500 line-clamp-2 mb-4">{hall.description || 'No description available'}</p>

                                        {/* Dynamic link based on role */}
                                        <Link
                                            to={user && (user.role === 'organizer' || user.role === 'admin' || user.role === 'venue_admin')
                                                ? `/organizer/halls/${hall._id}/book`
                                                : `/auth`}
                                            className="block w-full text-center px-4 py-2 bg-teal-50 text-teal-700 font-medium rounded-lg hover:bg-teal-600 hover:text-white transition-colors"
                                        >
                                            Request Booking
                                        </Link>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {/* General Details */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={halls.length + 1} className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 z-10">
                                    General Details
                                </td>
                            </tr>
                            <tr>
                                <td className="p-6 border-r text-sm font-semibold text-gray-900 sticky left-0 z-10 bg-white">
                                    Capacity
                                </td>
                                {halls.map(hall => (
                                    <td key={hall._id} className="p-6 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span>Upto {hall.capacity.toLocaleString()}</span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="p-6 border-r text-sm font-semibold text-gray-900 sticky left-0 z-10 bg-white">
                                    Hourly Rate
                                </td>
                                {halls.map(hall => (
                                    <td key={hall._id} className="p-6 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <span className="font-semibold text-gray-900">${hall.hourlyRate}<span className="text-gray-400 font-normal">/hr</span></span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="p-6 border-r text-sm font-semibold text-gray-900 sticky left-0 z-10 bg-white">
                                    Location
                                </td>
                                {halls.map(hall => (
                                    <td key={hall._id} className="p-6 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span>
                                                {hall.location?.floor ? `Floor ${hall.location.floor}` : ''}
                                                {hall.location?.wing ? ` - Wing ${hall.location.wing}` : ''}
                                            </span>
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* Equipment Matrix */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={halls.length + 1} className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 z-10">
                                    Equipment & Facilities
                                </td>
                            </tr>
                            {ALL_EQUIPMENT.map((eq) => (
                                <tr key={eq}>
                                    <td className="p-6 border-r text-sm font-semibold text-gray-900 sticky left-0 z-10 bg-white capitalize">
                                        {eq.replace(/_/g, ' ')}
                                    </td>
                                    {halls.map(hall => {
                                        const hasItem = hall.equipment && hall.equipment.includes(eq);
                                        return (
                                            <td key={hall._id} className="p-6 text-center">
                                                {hasItem ? (
                                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600">
                                                        <Check className="w-5 h-5" />
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-300">
                                                        <X className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Layout Formats */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={halls.length + 1} className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 z-10">
                                    Layout Options
                                </td>
                            </tr>
                            <tr>
                                <td className="p-6 border-r text-sm font-semibold text-gray-900 sticky left-0 z-10 bg-white">
                                    Supported Layouts
                                </td>
                                {halls.map(hall => (
                                    <td key={hall._id} className="p-6">
                                        <div className="flex flex-wrap gap-2">
                                            {hall.setupOptions?.map(setup => (
                                                <span key={setup.format} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-100 capitalize whitespace-nowrap">
                                                    <LayoutDashboard className="w-3.5 h-3.5" />
                                                    {setup.format.replace('_', ' ')}
                                                </span>
                                            ))}
                                            {(!hall.setupOptions || hall.setupOptions.length === 0) && (
                                                <span className="text-sm text-gray-400">Not specified</span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default HallComparisonPage;
