import React, { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, XCircle, Clock, Users, Calendar, Ticket, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';

const Notifications = ({ onOpenAction }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data?.notifications || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    setNotifications((prev) => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to mark as read');
    } catch (e) {
      console.error('markAsRead error:', e);
      setNotifications((prev) => prev.map(n => n._id === notificationId ? { ...n, read: false } : n));
    }
  };

  const markAllAsRead = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const previous = notifications;
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    } catch (e) {
      console.error('markAllAsRead error:', e);
      setNotifications(previous);
    }
  };

  const deleteNotification = async (notificationId) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const previous = [...notifications];
    setNotifications((prev) => prev.filter(n => n._id !== notificationId));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete notification');
    } catch (e) {
      console.error('deleteNotification error:', e);
      setNotifications(previous);
    }
  };

  const getNotificationIconInfo = (type, priority) => {
    switch (type) {
      case 'booking':
        return { icon: Ticket, bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
      case 'event':
        return { icon: Calendar, bg: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
      case 'user':
        return { icon: Users, bg: 'bg-purple-50 text-purple-600 border-purple-200' };
      case 'analytics':
        return { icon: Info, bg: 'bg-blue-50 text-blue-600 border-blue-200' };
      case 'system':
        if (priority === 'high') return { icon: AlertCircle, bg: 'bg-red-50 text-red-600 border-red-200' };
        return { icon: Info, bg: 'bg-gray-100 text-gray-600 border-gray-200' };
      default:
        return { icon: Bell, bg: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200 shadow-sm';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm';
      case 'low':
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diff = now - ts;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
        {children}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-md relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Notifications</h1>
            <p className="text-gray-500 font-medium mt-1">
              {unreadCount > 0 ? (
                <span className="text-blue-600 font-bold">{unreadCount} unread message{unreadCount !== 1 && 's'}</span>
              ) : 'You\'re all caught up! '} 
              — Updates across your event platform
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-100 shadow-sm rounded-xl transition-all">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      <GlassCard className="flex flex-col min-h-[60vh]">
        {/* Filters */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Updates', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'booking', label: 'Bookings', count: notifications.filter(n => n.type === 'booking').length },
              { key: 'event', label: 'Events', count: notifications.filter(n => n.type === 'event').length },
              { key: 'user', label: 'Users', count: notifications.filter(n => n.type === 'user').length },
              { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === key 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    filter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Timeline List */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50/20">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-64 opacity-50 space-y-4">
               <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
               <p className="text-gray-500 font-medium animate-pulse">Syncing notifications...</p>
             </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-64 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <Bell className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No notifications found</h3>
              <p className="text-sm font-medium text-gray-500 max-w-sm">
                {filter === 'unread' 
                  ? 'Great job, you are completely caught up on everything!' 
                  : 'Nothing to see here right now. We\'ll let you know when something happens.'}
              </p>
              {filter !== 'all' && (
                <Button variant="outline" className="mt-6 border-gray-200 rounded-xl" onClick={() => setFilter('all')}>
                    View All Activity
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-7 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {filteredNotifications.map((notification, index) => {
                const info = getNotificationIconInfo(notification.type, notification.priority);
                const NotificationIcon = info.icon;
                
                return (
                  <div key={notification._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}>
                    {/* Timeline Dot/Icon */}
                    <div className={`flex items-center justify-center w-14 h-14 rounded-full border-4 border-white shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${info.bg} z-10 transition-transform duration-300 group-hover:scale-110`}>
                      <NotificationIcon className="w-5 h-5" />
                    </div>
                    
                    {/* Card Content */}
                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white rounded-2xl shadow-sm border p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                      !notification.read ? 'border-l-4 border-l-blue-500 border-gray-200' : 'border-gray-100 opacity-80 hover:opacity-100'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded border ${getPriorityBadge(notification.priority)}`}>
                             {notification.priority}
                           </span>
                           {!notification.read && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                        </div>
                        <div className="flex items-center text-xs font-bold text-gray-400 gap-1.5 flex-shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimestamp(notification.createdAt)}
                        </div>
                      </div>
                      
                      <h4 className={`text-base font-bold mb-1 ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h4>
                      
                      <p className={`text-sm leading-relaxed mb-4 ${!notification.read ? 'text-gray-600 font-medium' : 'text-gray-500'}`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-50 flex-wrap">
                        {notification.actionUrl && (
                          <Button 
                            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-sm h-8" 
                            size="sm" 
                            onClick={() => onOpenAction && onOpenAction(notification.actionUrl)}
                          >
                             View Details
                          </Button>
                        )}
                        <div className="flex ml-auto gap-2">
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(notification._id)}
                              className="text-blue-600 border-blue-100 hover:bg-blue-50 h-8 rounded-xl"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 mr-1.5" /> Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification._id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-xl"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default Notifications;
