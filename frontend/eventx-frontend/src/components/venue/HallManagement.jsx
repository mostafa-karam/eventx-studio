import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
    Building2,
    Plus,
    Pencil,
    Trash2,
    AlertCircle,
    X,
    Search,
    Building
} from 'lucide-react';
import { TableSkeleton } from '../shared/LoadingSkeletons';
import EmptyState from '../shared/EmptyState';
import Breadcrumbs from '../shared/Breadcrumbs';

const HallManagement = ({ onSelectHall }) => {
    const { token, user } = useAuth();
    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHall, setEditingHall] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        capacity: 0,
        hourlyRate: 0,
        status: 'active',
    });
    const [errorMsg, setErrorMsg] = useState('');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchHalls();
    }, []);

    const fetchHalls = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/halls?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
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

    const handleOpenModal = (hall = null) => {
        setErrorMsg('');
        if (hall) {
            setEditingHall(hall);
            setFormData({
                name: hall.name,
                description: hall.description || '',
                capacity: hall.capacity,
                hourlyRate: hall.hourlyRate,
                status: hall.status,
            });
        } else {
            setEditingHall(null);
            setFormData({
                name: '',
                description: '',
                capacity: 0,
                hourlyRate: 0,
                status: 'active',
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        try {
            const isEdit = !!editingHall;
            const url = isEdit ? `${API_BASE_URL}/halls/${editingHall._id}` : `${API_BASE_URL}/halls`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                setIsModalOpen(false);
                fetchHalls(); // Refresh list
            } else {
                setErrorMsg(data.message || 'Failed to save hall');
            }
        } catch (error) {
            setErrorMsg('An error occurred while saving.');
        }
    };

    const handleDelete = async (hallId) => {
        if (!window.confirm('Are you sure you want to delete this hall? This action cannot be undone if there are no active bookings.')) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/halls/${hallId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                fetchHalls();
            } else {
                alert(data.message || 'Failed to delete hall');
            }
        } catch (error) {
            alert('An error occurred while deleting.');
        }
    };

    return (
        <div className="p-6">
            <Breadcrumbs items={[{ label: 'Hall Management' }]} />
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Hall Management</h2>
                    <p className="text-sm text-gray-500">Manage your venue's halls and their availability</p>
                </div>
                <Button
                    onClick={() => handleOpenModal()}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Hall
                </Button>
            </div>

            {loading ? (
                <TableSkeleton rows={3} columns={5} />
            ) : halls.length === 0 ? (
                <EmptyState
                    icon={Building}
                    title="No halls found"
                    description="You haven't added any halls to this venue yet. Click 'Add New Hall' to get started."
                    actionText="Add New Hall"
                    onAction={() => handleOpenModal()}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Hall Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Capacity
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rate (/hr)
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {halls.map((hall) => (
                                <tr key={hall._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-teal-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{hall.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {hall.capacity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${hall.hourlyRate}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${hall.status === 'active' ? 'bg-green-100 text-green-800' :
                                            hall.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {hall.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenModal(hall)}
                                            className="text-teal-600 hover:text-teal-900 mr-4"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onSelectHall(hall)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            <Search className="w-4 h-4" />
                                        </button>
                                        {user?.role === 'admin' && (
                                            <button
                                                onClick={() => handleDelete(hall._id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Hall Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl relative my-8">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingHall ? 'Edit Hall' : 'Add New Hall'}
                        </h3>

                        {errorMsg && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm font-medium">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hall Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="e.g. Grand Ballroom"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($) *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.hourlyRate}
                                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseInt(e.target.value) || 0 })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="retired">Retired</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 resize-none"
                                    placeholder="Short description of the hall..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                >
                                    Save Hall
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HallManagement;
