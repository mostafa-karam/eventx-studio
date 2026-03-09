import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Frown, ArrowLeft, Search } from 'lucide-react';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative text-center max-w-lg w-full">
                {/* Logo */}
                <div className="flex items-center justify-center mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-lg">
                        EX
                    </div>
                </div>

                {/* 404 number */}
                <div className="relative mb-6">
                    <span className="text-[10rem] font-black text-white/5 leading-none select-none block">404</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <Frown className="w-16 h-16 text-blue-400 mx-auto mb-3 animate-bounce" style={{ animationDuration: '2s' }} />
                            <h1 className="text-4xl font-bold text-white">Page Not Found</h1>
                        </div>
                    </div>
                </div>

                <p className="text-blue-200 text-lg mb-8 leading-relaxed">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
                    >
                        <Home className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>

                <p className="text-blue-300/50 text-sm mt-8">EventX Studio · Event Management System</p>
            </div>
        </div>
    );
};

export default NotFoundPage;
