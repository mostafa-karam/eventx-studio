import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

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
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-600 mt-2">Manage your profile and account security.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Update your basic information</CardDescription>
                </CardHeader>
                <CardContent>
                    {profileMsg && (
                        <Alert variant={profileMsg.includes('success') ? 'default' : 'destructive'}>
                            <AlertDescription>{profileMsg}</AlertDescription>
                        </Alert>
                    )}
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSaveProfile}>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Name</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Phone</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={savingProfile}>
                                {savingProfile ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Change your account password</CardDescription>
                </CardHeader>
                <CardContent>
                    {pwdMsg && (
                        <Alert variant={pwdMsg.includes('success') ? 'default' : 'destructive'}>
                            <AlertDescription>{pwdMsg}</AlertDescription>
                        </Alert>
                    )}
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleChangePassword}>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                className="w-full border rounded px-3 py-2"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                className="w-full border rounded px-3 py-2"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={changingPwd}>
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
