import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Settings, User, Lock, Shield } from 'lucide-react';

const AdminSettings = () => {
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Settings</h1>
                        <p className="text-gray-300">Manage your profile and account security</p>
                    </div>
                </div>
            </div>

            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                    <CardTitle className="flex items-center text-gray-900">
                        <User className="h-5 w-5 mr-2" />
                        Profile
                    </CardTitle>
                    <CardDescription className="text-gray-600">Update your basic information</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {profileMsg && (
                        <Alert variant={profileMsg.includes('success') ? 'default' : 'destructive'}>
                            <AlertDescription>{profileMsg}</AlertDescription>
                        </Alert>
                    )}
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSaveProfile}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone number"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={savingProfile}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                {savingProfile ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                    <CardTitle className="flex items-center text-gray-900">
                        <Lock className="h-5 w-5 mr-2" />
                        Security
                    </CardTitle>
                    <CardDescription className="text-gray-600">Change your account password</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {pwdMsg && (
                        <Alert variant={pwdMsg.includes('success') ? 'default' : 'destructive'}>
                            <AlertDescription>{pwdMsg}</AlertDescription>
                        </Alert>
                    )}
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleChangePassword}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                            <input
                                type="password"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                placeholder="Enter current password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                                type="password"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={changingPwd}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Shield className="h-4 w-4 mr-2" />
                                {changingPwd ? 'Changing...' : 'Change Password'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSettings;
