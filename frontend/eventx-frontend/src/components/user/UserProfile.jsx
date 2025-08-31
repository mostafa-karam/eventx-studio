import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { User, Lock, Phone, Mail, Settings } from 'lucide-react';

const UserProfile = () => {
    const { token, user, setUser } = useAuth();
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
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, phone })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to update profile');
            setProfileMsg('Profile updated successfully.');
            if (data?.data?.user) {
                setUser?.(data.data.user);
            }
        } catch (e) {
            console.error('Profile update error:', e);
            setProfileMsg(e.message || 'Profile update failed');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setChangingPwd(true);
        setPwdMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to change password');
            setPwdMsg('Password changed successfully.');
            setCurrentPassword('');
            setNewPassword('');
        } catch (e) {
            console.error('Change password error:', e);
            setPwdMsg(e.message || 'Password change failed');
        } finally {
            setChangingPwd(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="max-w-4xl">
                <Card>
                    <CardHeader className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle>Profile Settings</CardTitle>
                                    <CardDescription>Manage your account information and preferences</CardDescription>
                                </div>
                            </div>
                            <div className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
                                {user?.name || 'User'}
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Update your basic information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Profile Information */}
                            <Card className="hover:shadow-sm transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <User className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-gray-900">Profile Information</CardTitle>
                                            <CardDescription>Update your personal details</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <form onSubmit={handleSaveProfile} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    placeholder="Enter your full name"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="email"
                                                    value={user?.email || ''}
                                                    disabled
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 flex items-center">
                                                <Lock className="h-3 w-3 mr-1" />
                                                Email cannot be changed for security reasons
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    placeholder="Enter your phone number"
                                                />
                                            </div>
                                        </div>
                                        {profileMsg && (
                                            <Alert className={profileMsg.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                                                <AlertDescription className={profileMsg.includes('successfully') ? 'text-green-800' : 'text-red-800'}>
                                                    {profileMsg}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <Button 
                                            type="submit" 
                                            disabled={savingProfile} 
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                                        >
                                            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Password Information */}
                            <Card className="hover:shadow-sm transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Lock className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-gray-900">Password Information</CardTitle>
                                            <CardDescription>Update your password</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <form onSubmit={handleChangePassword} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    placeholder="Enter your current password"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    placeholder="Enter your new password"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        {pwdMsg && (
                                            <Alert className={pwdMsg.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                                                <AlertDescription className={pwdMsg.includes('successfully') ? 'text-green-800' : 'text-red-800'}>
                                                    {pwdMsg}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <Button 
                                            type="submit" 
                                            disabled={changingPwd} 
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                                        >
                                            {changingPwd ? 'Changing Password...' : 'Change Password'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UserProfile;
