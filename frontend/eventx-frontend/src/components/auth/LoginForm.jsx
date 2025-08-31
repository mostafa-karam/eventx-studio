import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Loader2, Mail, Lock, Eye, EyeOff, Shield, ArrowRight, CheckCircle, XCircle, 
  AlertTriangle, WifiOff, User
} from 'lucide-react';

const OptimizedLoginForm = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const { login, forgotPassword } = useAuth();

  // Load remembered email
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRemember(true);
    }
  }, []);

  const handlePasswordChange = useCallback((e) => {
    const password = e.target.value;
    setFormData(prev => ({ ...prev, password }));
    setError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (remember) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.message || 'Login failed');
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type) => {
    const demoCredentials = {
      admin: { email: 'mostafa.karam.work@gmail.com', password: 'admin123' },
      user: { email: 'user@eventx.com', password: 'user123' }
    };
    
    const credentials = demoCredentials[type];
    setFormData(credentials);
    setLoading(true);
    
    try {
      const result = await login(credentials.email, credentials.password);
      if (!result.success) {
        setError(result.message || 'Demo login failed');
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }
      }
    } catch (error) {
      setError('Network error during demo login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);

    try {
      const result = await forgotPassword(forgotPasswordEmail);
      if (result.success) {
        setForgotPasswordSent(true);
      } else {
        setError(result.message || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Welcome Back
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Offline Alert */}
          {!isOnline && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You are currently offline. Please check your internet connection.
              </AlertDescription>
            </Alert>
          )}

          {/* Demo Credentials */}
          <div className="bg-blue-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-blue-900">Quick Demo Access</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="text-left p-3 h-auto"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  <div className="text-xs text-gray-600">Full access</div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin('user')}
                disabled={loading}
                className="text-left p-3 h-auto"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">User</span>
                  </div>
                  <div className="text-xs text-gray-600">Standard access</div>
                </div>
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" role="form" aria-label="Login form">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <div className="mt-2 text-sm">
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
                {formData.email && validateEmail(formData.email) && (
                  <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  placeholder="Enter your password"
                  onChange={handlePasswordChange}
                  className="pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Shield className="h-3 w-3" />
                <span>Secure</span>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading || !formData.email || !formData.password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onToggleMode}
                className="font-medium text-blue-600 hover:underline"
              >
                Create account
              </button>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          
          {forgotPasswordSent ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Check your email</h3>
              <p className="text-gray-600">
                We've sent a password reset link to {forgotPasswordEmail}
              </p>
              <Button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordSent(false);
                  setForgotPasswordEmail('');
                }}
                className="mt-4"
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="flex-1"
                >
                  {forgotPasswordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OptimizedLoginForm;
