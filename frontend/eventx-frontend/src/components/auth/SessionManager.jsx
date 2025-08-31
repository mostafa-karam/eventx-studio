import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { 
  Loader2, Smartphone, Monitor, Tablet, Globe, Clock, 
  Trash2, Shield, AlertTriangle, CheckCircle
} from 'lucide-react';

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sessionToRemove, setSessionToRemove] = useState(null);
  const [showRemoveAllDialog, setShowRemoveAllDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { getSessions, removeSession, removeAllSessions } = useAuth();

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await getSessions();
      if (result.success) {
        setSessions(result.data.sessions || []);
      } else {
        setError(result.message || 'Failed to load sessions');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const getDeviceIcon = (deviceInfo) => {
    const userAgent = deviceInfo.userAgent?.toLowerCase() || '';
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return <Tablet className="h-5 w-5" />;
    } else {
      return <Monitor className="h-5 w-5" />;
    }
  };

  const formatLastActivity = (timestamp) => {
    const now = new Date();
    const activity = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activity) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleRemoveSession = async (sessionId) => {
    setActionLoading(prev => ({ ...prev, [sessionId]: true }));
    setError('');
    setSuccess('');
    
    try {
      const result = await removeSession(sessionId);
      if (result.success) {
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        setSuccess('Session removed successfully');
        setShowConfirmDialog(false);
        setSessionToRemove(null);
      } else {
        setError(result.message || 'Failed to remove session');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleRemoveAllSessions = async () => {
    setActionLoading(prev => ({ ...prev, removeAll: true }));
    setError('');
    setSuccess('');
    
    try {
      const result = await removeAllSessions();
      if (result.success) {
        // Keep only current session
        setSessions(prev => prev.filter(s => s.isCurrent));
        setSuccess('All other sessions removed successfully');
        setShowRemoveAllDialog(false);
      } else {
        setError(result.message || 'Failed to remove sessions');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, removeAll: false }));
    }
  };

  const activeSessions = sessions.filter(s => !s.isCurrent);
  const currentSession = sessions.find(s => s.isCurrent);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading sessions...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage your active login sessions across different devices and browsers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Current Session */}
          {currentSession && (
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 mt-1">
                    {getDeviceIcon(currentSession.deviceInfo)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-blue-900">Current Session</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        Active Now
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{currentSession.deviceInfo.browser}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Started {formatLastActivity(currentSession.createdAt)}</span>
                      </div>
                      {currentSession.deviceInfo.ip && (
                        <div className="text-xs text-blue-600">
                          IP: {currentSession.deviceInfo.ip}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Sessions */}
          {activeSessions.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Other Sessions</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRemoveAllDialog(true)}
                  disabled={actionLoading.removeAll}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {actionLoading.removeAll ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Remove All
                </Button>
              </div>
              
              {activeSessions.map((session) => (
                <div key={session.sessionId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-gray-500 mt-1">
                        {getDeviceIcon(session.deviceInfo)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          {session.deviceInfo.browser}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>{session.deviceInfo.os}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Last active {formatLastActivity(session.lastActivity)}</span>
                          </div>
                          {session.deviceInfo.ip && (
                            <div className="text-xs text-gray-500">
                              IP: {session.deviceInfo.ip}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSessionToRemove(session);
                        setShowConfirmDialog(true);
                      }}
                      disabled={actionLoading[session.sessionId]}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {actionLoading[session.sessionId] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No other active sessions</p>
              <p className="text-sm">You're only signed in on this device</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Session Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this session? The user will be signed out of that device.
            </DialogDescription>
          </DialogHeader>
          
          {sessionToRemove && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="text-gray-500">
                  {getDeviceIcon(sessionToRemove.deviceInfo)}
                </div>
                <div>
                  <div className="font-medium">{sessionToRemove.deviceInfo.browser}</div>
                  <div className="text-sm text-gray-600">
                    Last active {formatLastActivity(sessionToRemove.lastActivity)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setSessionToRemove(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRemoveSession(sessionToRemove?.sessionId)}
              disabled={actionLoading[sessionToRemove?.sessionId]}
              className="flex-1"
            >
              {actionLoading[sessionToRemove?.sessionId] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Session'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove All Sessions Confirmation Dialog */}
      <Dialog open={showRemoveAllDialog} onOpenChange={setShowRemoveAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove All Other Sessions</DialogTitle>
            <DialogDescription>
              This will sign you out of all other devices and browsers. Your current session will remain active.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRemoveAllDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveAllSessions}
              disabled={actionLoading.removeAll}
              className="flex-1"
            >
              {actionLoading.removeAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove All Sessions'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionManager;
