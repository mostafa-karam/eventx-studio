import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      <Link to="/" className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white font-bold shadow-sm mb-3">EX</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">EventX Studio</h1>
          <p className="text-gray-600">Professional Event Management System</p>
        </div>
        
        {isLogin ? (
          <LoginForm onToggleMode={toggleMode} />
        ) : (
          <RegisterForm onToggleMode={toggleMode} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;

