import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { fetchCsrfToken as initCsrf } from '../utils/apiClient';
import { setGlobalCsrfToken } from '../utils/csrf';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch CSRF token and set it globally
  const fetchCsrfToken = async () => {
    const token = await initCsrf();
    if (token) setGlobalCsrfToken(token);
    return token;
  };

  // Check if user is authenticated on app load
  useEffect(() => {
    const initializeAuth = async () => {
      // Fetch CSRF token first so the cookie is set before calling /auth/me
      await fetchCsrfToken();

      try {
        const result = await api.get('/auth/me');
        if (result.ok && result.data?.user) {
          setUser(result.data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Listen for session-expired events
  useEffect(() => {
    const handleSessionExpired = () => {
      if (user) {
        toast.error('Session expired. Please log in again.');
        setUser(null);
      }
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [user]);

  const login = async (email, password, twoFactorCode) => {
    try {
      const result = await api.post('/auth/login', { email, password, twoFactorCode });

      if (result.ok) {
        if (result.twoFactorRequired) {
          return { success: true, twoFactorRequired: true, message: result.message };
        }
        setUser(result.data.user);
        return { success: true, data: result.data };
      }

      return {
        success: false,
        message: result.message || 'Login failed',
        attemptsRemaining: result.attemptsRemaining,
        lockTimeRemaining: result.lockTimeRemaining,
        emailVerificationRequired: result.emailVerificationRequired,
        email: result.email,
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please make sure the backend server is running.' };
    }
  };

  const register = async (userData) => {
    try {
      const result = await api.post('/auth/register', userData);

      if (result.ok) {
        setUser(result.data.user);
        return { success: true, data: result.data };
      }

      return { success: false, message: result.message, errors: result.errors };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    // Inform server to clear cookies and server-side refresh token
    api.post('/auth/logout').catch(() => {});
    setUser(null);
    localStorage.removeItem('eventx_remember_email');
    localStorage.removeItem('eventx_remember_opt_in');
  };

  const updateProfile = async (profileData) => {
    try {
      const result = await api.put('/auth/profile', profileData);

      if (result.ok) {
        setUser(result.data.user);
        return { success: true };
      }

      return { success: false, message: result.message, errors: result.errors };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const result = await api.post('/auth/forgot-password', { email });
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const result = await api.post('/auth/reset-password', { token, password });
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const result = await api.post('/auth/verify-email', { token });
      if (result.success && user) {
        setUser({ ...user, emailVerified: true });
      }
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const result = await api.put('/auth/change-password', { currentPassword, newPassword });
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const getSessions = async () => {
    try {
      const result = await api.get('/auth/sessions');
      return { success: result.success, data: result.data };
    } catch (error) {
      console.error('Get sessions error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const removeSession = async (sessionId) => {
    try {
      const result = await api.delete(`/auth/sessions/${sessionId}`);
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('Remove session error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const removeAllSessions = async () => {
    try {
      const result = await api.delete('/auth/sessions');
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('Remove all sessions error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const value = {
    user,
    loading,
    fetchCsrfToken,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getSessions,
    removeSession,
    removeAllSessions,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOrganizer: user?.role === 'organizer',
    isVenueAdmin: user?.role === 'venue_admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
