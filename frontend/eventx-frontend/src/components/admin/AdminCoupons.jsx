import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tag, Plus, Trash2, Edit2, Loader2, Calendar as CalendarIcon, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '', description: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '',
    });

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/coupons`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) setCoupons(data.data?.coupons || []);
            else setError(data.message);
        } catch {
            setError('Network error loading coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (!payload.maxUses) delete payload.maxUses;
            if (!payload.expiresAt) delete payload.expiresAt;

            const res = await fetch(`${API_BASE_URL}/coupons`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setFormOpen(false);
                fetchCoupons();
            } else {
                const d = await res.json();
                alert(d.message);
            }
        } catch (e) {
            alert('Failed to save coupon');
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/coupons/${id}`, { method: 'DELETE', credentials: 'include' });
            setDeleteId(null);
            fetchCoupons();
        } catch {
            alert('Failed to delete');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Discount Coupons</h1>
                    <p className="text-gray-500 mt-1">Manage promo codes and discounts</p>
                </div>
                <Button onClick={() => { setFormData({ code: '', description: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' }); setFormOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> New Coupon
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
            ) : error ? (
                <div className="text-red-500 text-center p-8">{error}</div>
            ) : coupons.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900">No coupons yet</h3>
                    <p className="text-gray-500 mb-4">Create your first promo code to boost sales.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">Discount</th>
                                    <th className="px-6 py-4">Uses</th>
                                    <th className="px-6 py-4">Expires</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coupons.map((c) => {
                                    const isValid = c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date()) && (c.maxUses === null || c.usedCount < c.maxUses);
                                    return (
                                        <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 inline-block rounded border border-indigo-100">{c.code}</div>
                                                <div className="text-xs text-gray-500 mt-1">{c.description}</div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `$${c.discountValue} OFF`}
                                            </td>
                                            <td className="px-6 py-4">
                                                {c.usedCount} / {c.maxUses === null ? '∞' : c.maxUses}
                                            </td>
                                            <td className="px-6 py-4">
                                                {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                                                {!isValid && <Badge variant="destructive" className="ml-2 bg-red-100 text-red-700 hover:bg-red-100 border-0">Expired/Limit</Badge>}
                                                {isValid && <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100 border-0 shadow-none">Active</Badge>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(c._id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Coupon</DialogTitle>
                        <DialogDescription>Generate a new promo code for ticket purchases.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Code</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="pl-9 font-mono uppercase" placeholder="SUMMER2026" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <Select value={formData.discountType} onValueChange={(v) => setFormData({ ...formData, discountType: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Value</label>
                                <Input required type="number" min="1" max={formData.discountType === 'percentage' ? '100' : undefined} value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: e.target.value })} placeholder="20" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Max Uses (Optional)</label>
                                <Input type="number" min="1" value={formData.maxUses} onChange={e => setFormData({ ...formData, maxUses: e.target.value })} placeholder="Unlimited" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expiry Date (Optional)</label>
                                <Input type="date" value={formData.expiresAt} onChange={e => setFormData({ ...formData, expiresAt: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (Internal)</label>
                            <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Summer promotion campaign" />
                        </div>
                        <DialogFooter className="pt-4">
                            <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                            <Button type="submit" className="bg-indigo-600">Create Coupon</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Delete Coupon</DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-600 py-4">Are you sure you want to delete this coupon? This action cannot be undone, though existing bookings are unaffected.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDelete(deleteId)}>Yes, Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
