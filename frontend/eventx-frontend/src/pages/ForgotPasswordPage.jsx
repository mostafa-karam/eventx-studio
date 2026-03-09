import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ForgotPasswordPage = () => {
    const { forgotPassword } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email) { setError('Please enter your email address.'); return; }

        setIsLoading(true);
        const result = await forgotPassword(email);
        setIsLoading(false);

        if (result.success) {
            setSubmitted(true);
        } else {
            setError(result.message || 'Something went wrong. Please try again.');
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
                    <p className="text-gray-600 mb-2">
                        If an account with <strong>{email}</strong> exists, a password reset link has been sent.
                    </p>
                    {import.meta.env.DEV && (
                        <p className="text-xs text-gray-400 mb-6">
                            Dev: Check{' '}
                            <code className="bg-gray-100 px-1 rounded">%TEMP%/eventx-emails.log</code>
                        </p>
                    )}
                    <div className="space-y-3">
                        <button
                            onClick={() => setSubmitted(false)}
                            className="w-full py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Try a different email
                        </button>
                        <Link to="/auth" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-lg mb-4">
                            EX
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Enter your email and we'll send you a reset link
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="you@example.com"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : <Send className="w-4 h-4" />}
                            {isLoading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>

                    <Link
                        to="/auth"
                        className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
