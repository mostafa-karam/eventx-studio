import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Settings, User, Lock, Shield, CheckCircle2, AlertCircle, Phone, Mail, KeyRound, Smartphone, Bell, Eye } from 'lucide-react';

const AdminSettings = () => {
    const { user, setUser } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    // Profile state
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [changingPwd, setChangingPwd] = useState(false);
    const [pwdMsg, setPwdMsg] = useState('');

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to update profile');
            setProfileMsg({ text: 'Profile updated successfully.', type: 'success' });
            if (data?.data?.user) {
                setUser?.(data.data.user);
            }
        } catch (e) {
            console.error('Profile update error:', e);
            setProfileMsg({ text: e.message || 'Profile update failed', type: 'error' });
        } finally {
            setSavingProfile(false);
            setTimeout(() => setProfileMsg(''), 5000);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setChangingPwd(true);
        setPwdMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to change password');
            setPwdMsg({ text: 'Password changed successfully.', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
        } catch (e) {
            console.error('Change password error:', e);
            setPwdMsg({ text: e.message || 'Password change failed', type: 'error' });
        } finally {
            setChangingPwd(false);
            setTimeout(() => setPwdMsg(''), 5000);
        }
    };

    const GlassCard = ({ children, className = '' }) => (
        <div className={`bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden ${className}`}>
            {children}
        </div>
    );

    const NotificationToggle = ({ label, description, defaultChecked }) => (
        <label className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors cursor-pointer group">
            <div className="flex-1 pr-4">
                <p className="font-bold text-gray-900">{label}</p>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
        </label>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg relative">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
                        <p className="text-gray-500 font-medium mt-1">Manage your administrator account preferences and security.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Sidebar Menu (Visual Only for now, but provides structure) */}
                <div className="hidden lg:flex flex-col gap-2">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1 sticky top-8">
                        <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-left transition-colors">
                            <User className="w-5 h-5" /> Profile Settings
                        </button>
                        <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold text-left transition-colors">
                            <Shield className="w-5 h-5" /> Security & Password
                        </button>
                        <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold text-left transition-colors">
                            <Bell className="w-5 h-5" /> Notifications
                        </button>
                        <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold text-left transition-colors">
                            <Eye className="w-5 h-5" /> Appearance
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Profile Section */}
                    <GlassCard className="flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-100 bg-white/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" /> Personal Information
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Update your basic profile details and how people see you on the platform.</p>
                        </div>
                        <div className="p-6">
                            {profileMsg && (
                                <Alert className={`mb-6 rounded-xl border-l-4 ${profileMsg.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                                    {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> : <AlertCircle className="w-4 h-4 mr-2 text-red-600" />}
                                    <AlertDescription className="font-medium">{profileMsg.text}</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white">
                                    {name ? name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{user?.name || 'Administrator'}</h3>
                                    <p className="text-gray-500 text-sm">{user?.email}</p>
                                    <div className="mt-2 flex gap-2">
                                        <Badge className="bg-blue-100 text-blue-700 bg-opacity-50">Admin</Badge>
                                        <Button variant="outline" size="sm" className="h-6 text-xs px-2 shadow-sm rounded-md border-gray-200">Change Avatar</Button>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5 focus-within:text-blue-600">
                                        <label className="block text-sm font-bold text-gray-700 transition-colors">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors font-medium text-gray-900"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 focus-within:text-blue-600">
                                        <label className="block text-sm font-bold text-gray-700 transition-colors">Phone Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors font-medium text-gray-900"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium cursor-not-allowed"
                                                value={user?.email || ''}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Contact system support to change your account email address.</p>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 font-bold transition-all"
                                    >
                                        {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </GlassCard>

                    {/* Security Section */}
                    <GlassCard className="flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-100 bg-white/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-600" /> Security & Passwords
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Manage your password and secure your account.</p>
                        </div>
                        <div className="p-6">
                            {pwdMsg && (
                                <Alert className={`mb-6 rounded-xl border-l-4 ${pwdMsg.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                                    {pwdMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> : <AlertCircle className="w-4 h-4 mr-2 text-red-600" />}
                                    <AlertDescription className="font-medium">{pwdMsg.text}</AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5 focus-within:text-indigo-600">
                                        <label className="block text-sm font-bold text-gray-700 transition-colors">Current Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-colors font-medium text-gray-900"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                required
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 focus-within:text-indigo-600">
                                        <label className="block text-sm font-bold text-gray-700 transition-colors">New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <KeyRound className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-colors font-medium text-gray-900"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long.</p>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={changingPwd || !currentPassword || !newPassword}
                                        className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl shadow-lg font-bold transition-all disabled:opacity-50"
                                    >
                                        {changingPwd ? 'Updating Password...' : 'Update Password'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </GlassCard>

                    {/* Email/Push Notification Settings (UI mockup to look more premium) */}
                    <GlassCard className="flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-100 bg-white/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-emerald-600" /> Communication Preferences
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Manage how and when we contact you regarding platform updates.</p>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <NotificationToggle 
                                    label="System Alerts" 
                                    description="Get notified about major system updates, downtime, or security patches."
                                    defaultChecked={true}
                                />
                                <NotificationToggle 
                                    label="New Event Creator Approvals" 
                                    description="Receive an email whenever a new organizer requests approval."
                                    defaultChecked={true}
                                />
                                <NotificationToggle 
                                    label="Weekly Performance Report" 
                                    description="A summary of ticket sales, revenue, and active events sent every Monday."
                                    defaultChecked={false}
                                />
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
