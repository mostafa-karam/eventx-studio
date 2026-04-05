import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const MaintenanceScheduler = () => {
    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'

    // There is no dedicated endpoint to fetch maintenance blocks, so we'll fetch all bookings and filter
    const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);

    const [formData, setFormData] = useState({
        hallId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch halls
            const hallsRes = await fetch(`${API_BASE_URL}/halls`, { credentials: 'include' });
            const hallsData = await hallsRes.json();

            // Fetch bookings to extract maintenance blocks
            const bookingsRes = await fetch(`${API_BASE_URL}/hall-bookings`, { credentials: 'include' });
            const bookingsData = await bookingsRes.json();

            if (hallsData.success) {
                setHalls(hallsData.data.halls || []);
            }

            if (bookingsData.success) {
                setMaintenanceBlocks(
                    (bookingsData.data.bookings || []).filter(b => b.status === 'maintenance')
                );
            }
        } catch {
            toast.error('Network error loading data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.hallId || !formData.startDate || !formData.endDate || !formData.reason) {
            return toast.error('Please fill in all required fields');
        }

        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
            return toast.error('End date must be after start date');
        }

        try {
            setSubmitting(true);
            const res = await fetch(`${API_BASE_URL}/hall-bookings/maintenance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    hall: formData.hallId,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    notes: formData.reason,
                })
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Maintenance block scheduled successfully');
                setFormData({ hallId: '', startDate: '', endDate: '', reason: '' });
                setActiveTab('list');
                fetchData();
            } else {
                toast.error(data.message || 'Failed to schedule maintenance. Dates may overlap with an existing booking.');
            }
        } catch {
            toast.error('Network error. Check your connection.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelMaintenance = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this maintenance block?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/hall-bookings/${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                toast.success('Maintenance block cancelled');
                setMaintenanceBlocks(prev => prev.filter(b => b._id !== id));
            } else {
                toast.error(data.message || 'Failed to cancel');
            }
        } catch {
            toast.error('Network error');
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Hall Maintenance Planner</h2>
                    <p className="text-gray-600 text-sm">Schedule downtime for halls to prevent bookings during repairs or cleaning.</p>
                </div>
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Scheduled Blocks
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'new' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        + New Schedule
                    </button>
                </div>
            </div>

            {activeTab === 'new' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900">Schedule New Maintenance</h3>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Hall <span className="text-red-500">*</span></label>
                                <select
                                    name="hallId"
                                    value={formData.hallId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                >
                                    <option value="" disabled>-- Select a Hall --</option>
                                    {halls.map(hall => (
                                        <option key={hall._id} value={hall._id}>{hall.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Reason / Description <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Deep cleaning, Projector repair, Carpet replacement"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Scheduling...' : 'Schedule Maintenance'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('list')}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {maintenanceBlocks.length === 0 ? (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No active maintenance blocks</h3>
                            <p className="text-gray-500 mb-6">All halls are currently available for booking without interruptions.</p>
                            <button onClick={() => setActiveTab('new')} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Schedule Now</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                                        <th className="px-6 py-4 font-medium border-b border-gray-100">Hall</th>
                                        <th className="px-6 py-4 font-medium border-b border-gray-100">Reason</th>
                                        <th className="px-6 py-4 font-medium border-b border-gray-100">Start Time</th>
                                        <th className="px-6 py-4 font-medium border-b border-gray-100">End Time</th>
                                        <th className="px-6 py-4 font-medium border-b border-gray-100 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {maintenanceBlocks.map(block => {
                                        const isActive = new Date(block.startDate) <= new Date() && new Date(block.endDate) >= new Date();
                                        return (
                                            <tr key={block._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-medium text-gray-900">{block.hall?.name || 'Unknown Hall'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                    {block.purpose}
                                                    {isActive && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">In Progress</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {new Date(block.startDate).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {new Date(block.endDate).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => handleCancelMaintenance(block._id)}
                                                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                                                    >
                                                        Cancel Block
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MaintenanceScheduler;
