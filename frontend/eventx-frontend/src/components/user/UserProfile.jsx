import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
    User, Lock, Phone, Mail, Settings, Camera, Eye, EyeOff,
    Calendar, Ticket, Heart, Shield, Bell, Globe, Palette,
    TrendingUp, Award, Clock, MapPin, CreditCard, Download
} from 'lucide-react';

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
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPwd, setChangingPwd] = useState(false);
    const [pwdMsg, setPwdMsg] = useState('');
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Account stats
    const [accountStats, setAccountStats] = useState({
        totalTickets: 0,
        totalEvents: 0,
        totalFavorites: 0,
        memberSince: user?.createdAt || new Date()
    });

    // Preferences
    const [preferences, setPreferences] = useState({
        notifications: true,
        emailUpdates: true,
        darkMode: false,
        language: 'en'
    });

    // Activity data
    const [recentActivity, setRecentActivity] = useState([]);

    // Loading states
    const [loadingStats, setLoadingStats] = useState(true);

    // Load real activity data
    const loadRecentActivity = async () => {
        const activities = [];

        try {
            // Get real tickets from API
            const ticketsResponse = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (ticketsResponse.ok) {
                const ticketsData = await ticketsResponse.json();
                const tickets = ticketsData?.data?.tickets || ticketsData?.tickets || [];

                // Add recent ticket purchases
                tickets.slice(0, 3).forEach(ticket => {
                    activities.push({
                        id: `ticket-${ticket._id}`,
                        type: 'ticket',
                        title: 'Ticket purchased',
                        description: `You purchased a ticket for "${ticket.event?.title || 'an event'}"`,
                        timestamp: ticket.bookingDate || ticket.createdAt,
                        icon: 'ticket'
                    });
                });
            }
        } catch (error) {
            console.log('Could not fetch tickets for activity');
        }

        // Get recent favorites from localStorage with better data
        const eventFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
        const ticketFavorites = JSON.parse(localStorage.getItem('eventx_ticket_favorites') || '[]');

        // Add favorite activities if user has favorites
        if (eventFavorites.length > 0 || ticketFavorites.length > 0) {
            const totalFavorites = eventFavorites.length + ticketFavorites.length;
            activities.push({
                id: 'favorites-added',
                type: 'favorite',
                title: 'Events favorited',
                description: `You have ${totalFavorites} favorite event${totalFavorites > 1 ? 's' : ''}`,
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                icon: 'heart'
            });
        }

        // Get profile update activity
        const lastProfileUpdate = localStorage.getItem('last_profile_update');
        if (lastProfileUpdate) {
            activities.push({
                id: 'profile-update',
                type: 'profile',
                title: 'Profile updated',
                description: 'Your profile information was updated',
                timestamp: new Date(lastProfileUpdate),
                icon: 'user'
            });
        }

        // Add account creation activity
        if (user?.createdAt) {
            activities.push({
                id: 'account-created',
                type: 'account',
                title: 'Account created',
                description: 'You joined EventX',
                timestamp: new Date(user.createdAt),
                icon: 'calendar'
            });
        }

        // Sort by timestamp and take the most recent 5
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setRecentActivity(activities.slice(0, 5));
    };

    // Load account statistics
    useEffect(() => {
        const loadAccountStats = async () => {
            try {
                // Load favorites count
                const eventFavorites = JSON.parse(localStorage.getItem('eventx_favorites') || '[]');
                const ticketFavorites = JSON.parse(localStorage.getItem('eventx_ticket_favorites') || '[]');
                const totalFavorites = new Set([...eventFavorites, ...ticketFavorites]).size;

                // Try to load tickets count from API, fallback to localStorage if API fails
                let totalTickets = 0;
                try {
                    const ticketsResponse = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (ticketsResponse.ok) {
                        const ticketsData = await ticketsResponse.json();
                        totalTickets = ticketsData?.data?.tickets?.length || ticketsData?.tickets?.length || 0;
                    } else {
                        // Fallback: try to get from localStorage or use a default
                        const savedTickets = localStorage.getItem('user_tickets');
                        if (savedTickets) {
                            totalTickets = JSON.parse(savedTickets).length;
                        }
                    }
                } catch (apiError) {
                    console.log('Tickets API not available, using fallback');
                    // Fallback: try to get from localStorage or use a default
                    const savedTickets = localStorage.getItem('user_tickets');
                    if (savedTickets) {
                        totalTickets = JSON.parse(savedTickets).length;
                    }
                }

                setAccountStats({
                    totalTickets,
                    totalEvents: 0, // You can implement this if you have user's created events
                    totalFavorites,
                    memberSince: user?.createdAt || new Date()
                });

                // Load recent activity
                loadRecentActivity();
            } catch (error) {
                console.error('Error loading account stats:', error);
                // Set default values if everything fails
                setAccountStats({
                    totalTickets: 0,
                    totalEvents: 0,
                    totalFavorites: 0,
                    memberSince: user?.createdAt || new Date()
                });
            } finally {
                setLoadingStats(false);
            }
        };

        if (token) {
            loadAccountStats();
        }
    }, [token, user]);

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
            // Track profile update activity
            localStorage.setItem('last_profile_update', new Date().toISOString());
            // Reload activity to show the new profile update
            loadRecentActivity();
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

        // Validation
        if (newPassword !== confirmPassword) {
            setPwdMsg('New passwords do not match.');
            setChangingPwd(false);
            return;
        }

        if (newPassword.length < 6) {
            setPwdMsg('New password must be at least 6 characters long.');
            setChangingPwd(false);
            return;
        }

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
            setConfirmPassword('');
        } catch (e) {
            console.error('Change password error:', e);
            setPwdMsg(e.message || 'Password change failed');
        } finally {
            setChangingPwd(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="relative">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"></div>

                            <div className="relative px-8 py-12">
                                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                                    {/* Avatar Section */}
                                    <div className="flex flex-col items-center">
                                        <div className="relative group">
                                            <div className="w-36 h-36 bg-white rounded-full shadow-2xl border-4 border-white flex items-center justify-center ring-4 ring-indigo-100">
                                                <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                                                    <User className="w-14 h-14 text-white" />
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                                            >
                                                <Camera className="w-5 h-5 text-gray-600" />
                                            </Button>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-xs">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-gray-900">{accountStats.totalTickets}</div>
                                                <div className="text-xs text-gray-500 font-medium">Tickets</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-gray-900">{accountStats.totalFavorites}</div>
                                                <div className="text-xs text-gray-500 font-medium">Favorites</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-gray-900">{accountStats.totalEvents}</div>
                                                <div className="text-xs text-gray-500 font-medium">Events</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Info Section */}
                                    <div className="flex-1 text-center lg:text-left">
                                        <div className="mb-6">
                                            <h1 className="text-5xl font-bold text-gray-900 mb-3">
                                                {user?.name || 'User'}
                                            </h1>
                                            <p className="text-xl text-gray-600 mb-4">{user?.email}</p>

                                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Calendar className="w-5 h-5" />
                                                    <span className="font-medium">Member since {formatDate(accountStats.memberSince)}</span>
                                                </div>
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                                                    <Shield className="w-4 h-4 mr-1" />
                                                    Verified Account
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                                                <Settings className="w-4 h-4 mr-2" />
                                                Edit Profile
                                            </Button>
                                            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-xl font-medium">
                                                <Download className="w-4 h-4 mr-2" />
                                                Export Data
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Profile Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-600" />
                                    Personal Information
                                </CardTitle>
                                <CardDescription>
                                    Update your personal details and contact information
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="name"
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="pl-10 h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                                                    placeholder="Enter your full name"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="pl-10 h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                                                    placeholder="Enter your phone number"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={user?.email || ''}
                                                    disabled
                                                    className="pl-10 h-11 bg-gray-50 border-gray-200"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Lock className="h-3 w-3" />
                                                Email cannot be changed for security reasons
                                            </p>
                                        </div>
                                    </div>

                                    {profileMsg && (
                                        <Alert className={profileMsg.includes('successfully') ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
                                            <AlertDescription className={profileMsg.includes('successfully') ? 'text-emerald-800' : 'text-red-800'}>
                                                {profileMsg}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8"
                                    >
                                        {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-indigo-600" />
                                    Security Settings
                                </CardTitle>
                                <CardDescription>
                                    Update your password to keep your account secure
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">Current Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="currentPassword"
                                                type={showPasswords.current ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="pl-10 pr-10 h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                                                placeholder="Enter your current password"
                                                required
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => togglePasswordVisibility('current')}
                                            >
                                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="newPassword"
                                                type={showPasswords.new ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="pl-10 pr-10 h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                                                placeholder="Enter your new password"
                                                required
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => togglePasswordVisibility('new')}
                                            >
                                                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="confirmPassword"
                                                type={showPasswords.confirm ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="pl-10 pr-10 h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                                                placeholder="Confirm your new password"
                                                required
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                            >
                                                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {pwdMsg && (
                                        <Alert className={pwdMsg.includes('successfully') ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
                                            <AlertDescription className={pwdMsg.includes('successfully') ? 'text-emerald-800' : 'text-red-800'}>
                                                {pwdMsg}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={changingPwd}
                                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8"
                                    >
                                        {changingPwd ? 'Changing Password...' : 'Change Password'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Preferences & Activity */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-indigo-600" />
                                    Preferences
                                </CardTitle>
                                <CardDescription>
                                    Customize your account settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-gray-700">Email Notifications</Label>
                                            <p className="text-xs text-gray-500">
                                                Receive email updates about events
                                            </p>
                                        </div>
                                        <Button
                                            variant={preferences.emailUpdates ? "default" : "outline"}
                                            size="sm"
                                            className={preferences.emailUpdates ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                            onClick={() => setPreferences(prev => ({ ...prev, emailUpdates: !prev.emailUpdates }))}
                                        >
                                            {preferences.emailUpdates ? 'On' : 'Off'}
                                        </Button>
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-gray-700">Push Notifications</Label>
                                            <p className="text-xs text-gray-500">
                                                Get notified about new events
                                            </p>
                                        </div>
                                        <Button
                                            variant={preferences.notifications ? "default" : "outline"}
                                            size="sm"
                                            className={preferences.notifications ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                            onClick={() => setPreferences(prev => ({ ...prev, notifications: !prev.notifications }))}
                                        >
                                            {preferences.notifications ? 'On' : 'Off'}
                                        </Button>
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-gray-700">Dark Mode</Label>
                                            <p className="text-xs text-gray-500">
                                                Switch to dark theme
                                            </p>
                                        </div>
                                        <Button
                                            variant={preferences.darkMode ? "default" : "outline"}
                                            size="sm"
                                            className={preferences.darkMode ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                            onClick={() => setPreferences(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                                        >
                                            {preferences.darkMode ? 'On' : 'Off'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                    Recent Activity
                                </CardTitle>
                                <CardDescription>
                                    Your latest account activity
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentActivity.length > 0 ? (
                                        recentActivity.map((activity) => {
                                            const getIcon = () => {
                                                switch (activity.icon) {
                                                    case 'ticket':
                                                        return <Ticket className="w-4 h-4 text-emerald-600" />;
                                                    case 'heart':
                                                        return <Heart className="w-4 h-4 text-rose-600" />;
                                                    case 'user':
                                                        return <User className="w-4 h-4 text-violet-600" />;
                                                    case 'calendar':
                                                        return <Calendar className="w-4 h-4 text-blue-600" />;
                                                    default:
                                                        return <Calendar className="w-4 h-4 text-gray-600" />;
                                                }
                                            };

                                            const getIconBg = () => {
                                                switch (activity.icon) {
                                                    case 'ticket':
                                                        return 'bg-emerald-100';
                                                    case 'heart':
                                                        return 'bg-rose-100';
                                                    case 'user':
                                                        return 'bg-violet-100';
                                                    case 'calendar':
                                                        return 'bg-blue-100';
                                                    default:
                                                        return 'bg-gray-100';
                                                }
                                            };

                                            const getTimeAgo = (timestamp) => {
                                                const now = new Date();
                                                const time = new Date(timestamp);
                                                const diffInSeconds = Math.floor((now - time) / 1000);

                                                if (diffInSeconds < 60) return 'Just now';
                                                if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
                                                if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
                                                if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
                                                return time.toLocaleDateString();
                                            };

                                            return (
                                                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <div className={`w-8 h-8 ${getIconBg()} rounded-full flex items-center justify-center flex-shrink-0`}>
                                                        {getIcon()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                                        <p className="text-xs text-gray-500">{activity.description}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{getTimeAgo(activity.timestamp)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8">
                                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">No recent activity</p>
                                            <p className="text-xs text-gray-400 mt-1">Your activity will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default UserProfile;

