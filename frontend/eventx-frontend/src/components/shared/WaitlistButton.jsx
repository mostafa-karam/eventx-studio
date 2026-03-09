import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Loader2, BellRing } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function WaitlistButton({ eventId, isSoldOut, currentUserId }) {
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);

    // In a real implementation we would check the user's waitlist status from the API.
    // For the UI component, we manage state locally after action.

    const handleJoinWaitlist = async () => {
        if (!currentUserId) {
            toast.error('Please log in to join the waitlist');
            return;
        }

        setLoading(true);
        try {
            // Simulate API call to join waitlist
            // const res = await fetch(`${API_BASE_URL}/events/${eventId}/waitlist`, { method: 'POST', credentials: 'include' });
            await new Promise(r => setTimeout(r, 800)); // fake delay
            setJoined(true);
            toast.success("You're on the list! We'll email you if spots open up.");
        } catch {
            toast.error('Failed to join waitlist. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveWaitlist = async () => {
        setLoading(true);
        try {
            // Simulate API call to leave waitlist
            await new Promise(r => setTimeout(r, 600));
            setJoined(false);
            toast.success("Removed from waitlist.");
        } catch {
            toast.error('Failed to leave waitlist.');
        } finally {
            setLoading(false);
        }
    };

    if (!isSoldOut) return null;

    if (joined) {
        return (
            <Button variant="outline" onClick={handleLeaveWaitlist} disabled={loading} className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 group">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2 text-indigo-500 group-hover:animate-ping" />}
                On Waitlist
            </Button>
        );
    }

    return (
        <Button onClick={handleJoinWaitlist} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
            Join Waitlist
        </Button>
    );
}
