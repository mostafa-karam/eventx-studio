import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const { verifyEmail } = useAuth();
    const navigate = useNavigate();

    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('No verification token found in the URL. Please use the link from your email.');
            return;
        }

        const doVerify = async () => {
            const result = await verifyEmail(token);
            if (result.success) {
                setStatus('success');
                setMessage(result.message || 'Your email has been verified successfully!');
            } else {
                setStatus('error');
                setMessage(result.message || 'Verification failed. The link may have expired.');
            }
        };

        doVerify();
    }, [searchParams, verifyEmail]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {/* Logo */}
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-lg mb-6">
                        EX
                    </div>

                    {status === 'loading' && (
                        <>
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email…</h1>
                            <p className="text-gray-500">Please wait a moment.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
                            <p className="text-gray-600 mb-6">{message}</p>
                            <button
                                onClick={() => navigate('/auth')}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                            >
                                Continue to Login
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
                            <p className="text-gray-600 mb-6">{message}</p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Resend Verification Email
                                </button>
                                <Link
                                    to="/"
                                    className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Home
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                {import.meta.env.DEV && (
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Dev: Check email log at{' '}
                        <code className="bg-gray-100 px-1 rounded">%TEMP%/eventx-emails.log</code>
                    </p>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
