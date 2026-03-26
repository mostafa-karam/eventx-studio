import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tag, Plus, Trash2, Edit2, Loader2, Calendar as CalendarIcon, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';

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
        } catch {
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

    const WhiteCard = ({ children, className = '' }) => (
        <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-gray-900">Discount Coupons</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Manage promo codes and discounts</p>
                </div>
                <Button onClick={() => { setFormData({ code: '', description: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' }); setFormOpen(true); }}
                    className="bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-sm px-5 h-12 w-full md:w-auto mt-4 md:mt-0">
                    <Plus className="w-5 h-5 mr-2" /> New Coupon
                </Button>
            </div>

            <WhiteCard>
                {loading ? (
                    <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>
                ) : error ? (
                    <div className="text-red-500 text-center py-16 font-bold">{error}</div>
                ) : coupons.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                            <Tag className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">No coupons yet</h3>
                        <p className="text-gray-500 font-medium">Create your first promo code to boost sales.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
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
                                        <tr key={c._id} className="bg-white hover:bg-blue-50/30 transition-all duration-200 group border-b border-gray-50 last:border-0 relative">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1.5 inline-block rounded-lg border border-blue-100">{c.code}</div>
                                                <div className="text-xs font-semibold text-gray-500 mt-2">{c.description}</div>
                                            </td>
                                            <td className="px-6 py-4 font-extrabold text-gray-900 text-base">
                                                {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `$${c.discountValue} OFF`}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900">{c.usedCount}</span> <span className="text-gray-500 font-semibold">/ {c.maxUses === null ? '∞' : c.maxUses}</span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-700">
                                                {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                                                {!isValid && <Badge variant="destructive" className="ml-3 bg-red-100 text-red-700 hover:bg-red-100 border-0 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-none">Expired/Limit</Badge>}
                                                {isValid && <Badge className="ml-3 bg-green-100 text-green-700 hover:bg-green-100 border-0 shadow-none px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">Active</Badge>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(c._id)} className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </WhiteCard>

            {/* Create Modal */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Coupon</DialogTitle>
                        <DialogDescription>Generate a new promo code for ticket purchases.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700">Code</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="pl-9 font-mono uppercase bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-100" placeholder="SUMMER2026" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">Type</label>
                                <Select value={formData.discountType} onValueChange={(v) => setFormData({ ...formData, discountType: v })}>
                                    <SelectTrigger className="bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-100"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-gray-100">
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">Value</label>
                                <Input required type="number" min="1" max={formData.discountType === 'percentage' ? '100' : undefined} value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: e.target.value })} placeholder="20" className="bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-100" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">Max Uses (Optional)</label>
                                <Input type="number" min="1" value={formData.maxUses} onChange={e => setFormData({ ...formData, maxUses: e.target.value })} placeholder="Unlimited" className="bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-100" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">Expiry Date (Optional)</label>
                                <Input type="date" value={formData.expiresAt} onChange={e => setFormData({ ...formData, expiresAt: e.target.value })} className="bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-100" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700">Description (Internal)</label>
                            <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Summer promotion campaign" className="bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-100" />
                        </div>
                        <DialogFooter className="pt-4 border-t border-gray-100 mt-2">
                            <DialogClose asChild><Button variant="outline" type="button" className="rounded-xl font-bold">Cancel</Button></DialogClose>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm font-bold">Create Coupon</Button>
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
