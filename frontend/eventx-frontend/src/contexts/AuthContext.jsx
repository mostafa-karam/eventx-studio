import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [csrfToken, setCsrfToken] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken);
        setGlobalCsrfToken(data.csrfToken);
        return data.csrfToken;
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
    return null;
  };

  // Check if user is authenticated on app load
  useEffect(() => {
    const initializeAuth = async () => {
      // Fetch CSRF token first so the _csrf cookie is set before calling /auth/me
      // Doing this sequentially prevents a race condition where both endpoints 
      // generate and overwrite the CSRF cookie simultaneously.
      await fetchCsrfToken();

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.data.user);
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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, twoFactorCode }),
      });

      let data;
      try {
        data = await response.json();
      } catch (err) {
        return { success: false, message: 'Server returned an invalid response. Please try again later.' };
      }

      if (response.ok) {
        // Handle 2FA required (200 but not fully logged in yet)
        if (data.twoFactorRequired) {
          return { success: true, twoFactorRequired: true, message: data.message };
        }
        const { user } = data.data;
        setUser(user);
        return { success: true, data: data.data };
      } else {
        return {
          success: false,
          message: data.message || 'Login failed',
          attemptsRemaining: data.attemptsRemaining,
          lockTimeRemaining: data.lockTimeRemaining,
          emailVerificationRequired: data.emailVerificationRequired,
          email: data.email,
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please make sure the backend server is running.' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        const { user } = data.data;
        setUser(user);
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message, errors: data.errors };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    // Inform server to clear cookies and server-side refresh token
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => { });
    setUser(null);
    // Also clear remembered email so login form doesn't prefill after logout
    localStorage.removeItem('eventx_remember_email');
    localStorage.removeItem('eventx_remember_opt_in');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message, errors: data.errors };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Additional auth methods
  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (data.success && user) {
        setUser({ ...user, emailVerified: true });
      }
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const getSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      return { success: data.success, data: data.data };
    } catch (error) {
      console.error('Get sessions error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const removeSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Remove session error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const removeAllSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || (await fetchCsrfToken()),
        },
        credentials: 'include',
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Remove all sessions error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const value = {
    user,
    loading,
    csrfToken,
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
