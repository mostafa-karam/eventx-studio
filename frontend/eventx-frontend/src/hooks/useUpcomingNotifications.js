import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Simple hook: polls /events?upcoming=true for user's relevant events and uses Notification API
export default function useUpcomingNotifications() {
    const { token, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        let cancelled = false;
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

        const checkUpcoming = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/events?upcoming=true&withinHours=24`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;
                const data = await res.json();
                const events = data.data?.events || [];

                if (!('Notification' in window)) return;
                if (Notification.permission !== 'granted') {
                    try { await Notification.requestPermission(); } catch (e) { return; }
                }

                for (const ev of events) {
                    if (cancelled) break;
                    const title = `Upcoming: ${ev.title}`;
                    const body = `${new Date(ev.date).toLocaleString()} • ${ev.venue?.name || 'TBA'}`;
                    new Notification(title, { body });
                }
            } catch (e) {
                console.warn('Upcoming notifications failed', e);
            }
        };

        const interval = setInterval(checkUpcoming, 1000 * 60 * 60); // hourly
        checkUpcoming();

        return () => { cancelled = true; clearInterval(interval); };
    }, [isAuthenticated, token]);
}
