import React, { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, XCircle, Clock, Users, Calendar, Ticket } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';

const Notifications = ({ onOpenAction }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
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
    // Optimistic update
    setNotifications((prev) => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to mark as read');
      }
    } catch (e) {
      console.error('markAsRead error:', e);
      // Revert on error
      setNotifications((prev) => prev.map(n => n.id === notificationId ? { ...n, read: false } : n));
    }
  };

  const markAllAsRead = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    // Optimistic update
    const previous = notifications;
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to mark all as read');
      }
    } catch (e) {
      console.error('markAllAsRead error:', e);
      // Revert on error
      setNotifications(previous);
    }
  };

  const deleteNotification = async (notificationId) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    // Optimistic update
    const previous = notifications;
    setNotifications((prev) => prev.filter(n => n.id !== notificationId));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to delete notification');
      }
    } catch (e) {
      console.error('deleteNotification error:', e);
      // Revert on error
      setNotifications(previous);
    }
  };

  const getNotificationIcon = (type, priority) => {
    const iconClass = "w-5 h-5";
    
    switch (type) {
      case 'booking':
        return <Ticket className={`${iconClass} text-blue-500`} />;
      case 'event':
        return <Calendar className={`${iconClass} text-green-500`} />;
      case 'user':
        return <Users className={`${iconClass} text-purple-500`} />;
      case 'analytics':
        return <Info className={`${iconClass} text-orange-500`} />;
      case 'system':
        return priority === 'high' ? 
          <AlertCircle className={`${iconClass} text-red-500`} /> :
          <Info className={`${iconClass} text-gray-500`} />;
      default:
        return <Bell className={`${iconClass} text-gray-500`} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'booking', label: 'Bookings', count: notifications.filter(n => n.type === 'booking').length },
          { key: 'event', label: 'Events', count: notifications.filter(n => n.type === 'event').length },
          { key: 'user', label: 'Users', count: notifications.filter(n => n.type === 'user').length },
          { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}
            className="flex items-center space-x-1"
          >
            <span>{label}</span>
            {count > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {filter === 'unread' ? 'All notifications have been read' : 'No notifications to display'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all duration-200 hover:shadow-md ${
                !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {notification.actionUrl && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => onOpenAction && onOpenAction(notification.actionUrl)}>
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
