import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Loader2, Mail, Lock, Eye, EyeOff, User, Phone, CheckCircle, XCircle, 
  ArrowRight, ArrowLeft, Shield, MapPin, Calendar, Users
} from 'lucide-react';

const OptimizedRegisterForm = ({ onToggleMode }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: '',
    age: '',
    gender: '',
    city: '',
    country: '',
    acceptedTerms: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '', color: 'gray' });

  const { register } = useAuth();

  const steps = [
    { id: 1, title: 'Personal Info', fields: ['firstName', 'lastName', 'email', 'phone'] },
    { id: 2, title: 'Account & Security', fields: ['accountType', 'password', 'confirmPassword'] },
    { id: 3, title: 'Profile Details', fields: ['age', 'gender', 'city', 'country'] },
    { id: 4, title: 'Terms', fields: ['acceptedTerms'] }
  ];

  const calculatePasswordStrength = (password) => {
    if (!password) return { score: 0, feedback: '', color: 'gray', level: '' };
    
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('8+ characters');
    
    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('lowercase letter');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('uppercase letter');
    
    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('number');
    
    // Special character check
    if (/[^\w\s]/.test(password)) score += 1;
    else feedback.push('special character');
    
    const levels = [
      { level: 'Very Weak', color: 'red', bgColor: 'bg-red-500' },
      { level: 'Weak', color: 'orange', bgColor: 'bg-orange-500' },
      { level: 'Fair', color: 'yellow', bgColor: 'bg-yellow-500' },
      { level: 'Good', color: 'blue', bgColor: 'bg-blue-500' },
      { level: 'Strong', color: 'green', bgColor: 'bg-green-500' }
    ];
    
    const currentLevel = levels[Math.min(score, 4)];
    
    return {
      score,
      feedback: feedback.length > 0 ? `Add: ${feedback.join(', ')}` : `${currentLevel.level} password`,
      color: currentLevel.color,
      level: currentLevel.level,
      bgColor: currentLevel.bgColor,
      width: `${(score / 5) * 100}%`
    };
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        return value.length >= 2 ? null : 'Must be at least 2 characters';
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email format';
      case 'phone':
        return value.length >= 10 ? null : 'Invalid phone number';
      case 'password':
        return value.length >= 8 ? null : 'Must be at least 8 characters';
      case 'confirmPassword':
        return value === formData.password ? null : 'Passwords do not match';
      case 'accountType':
        return ['user', 'organizer'].includes(value) ? null : 'Please select an account type';
      case 'age':
        const ageNum = parseInt(value);
        return ageNum >= 13 && ageNum <= 120 ? null : 'Age must be between 13 and 120';
      case 'gender':
        return value ? null : 'Please select your gender';
      case 'city':
        return value.length >= 2 ? null : 'Please enter your city';
      case 'country':
        return value.length >= 2 ? null : 'Please select your country';
      default:
        return null;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Update password strength for password field
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(newValue));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Validate field
    const error = validateField(name, newValue);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const canProceedToStep = (fromStep) => {
    const stepFields = steps.find(s => s.id === fromStep)?.fields || [];
    return stepFields.every(field => {
      const value = formData[field];
      return value && !validateField(field, value);
    });
  };

  const handleNext = () => {
    if (canProceedToStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.acceptedTerms) {
      setErrors({ acceptedTerms: 'You must accept the terms and conditions' });
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.accountType,
        age: parseInt(formData.age),
        gender: formData.gender,
        location: {
          city: formData.city,
          country: formData.country
        }
      });

      if (result.success) {
        setAccountCreated(true);
      } else {
        setErrors({ submit: result.message || 'Registration failed' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentStep / 4) * 100;

  if (accountCreated) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
            <p className="text-gray-600">Please check your email to verify your account.</p>
          </div>
          <Button onClick={onToggleMode} className="w-full bg-blue-600 hover:bg-blue-700">
            Sign In to Your Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-6">
        <div className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Join EventX Studio
          </CardTitle>
          <p className="text-gray-600">Create your account in just a few steps</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of 4</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-3 bg-gray-100" />
          <div className="flex justify-between text-xs">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                  currentStep > step.id ? 'bg-green-500 text-white' :
                  currentStep === step.id ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <span className={`text-xs ${
                  currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <Alert variant="destructive">
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`pl-10 ${errors.firstName ? 'border-red-300' : ''}`}
                      placeholder="John"
                      required
                    />
                    {formData.firstName && !errors.firstName && (
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {errors.firstName && (
                    <p className="text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`pl-10 ${errors.lastName ? 'border-red-300' : ''}`}
                      placeholder="Doe"
                      required
                    />
                    {formData.lastName && !errors.lastName && (
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {errors.lastName && (
                    <p className="text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pl-10 ${errors.email ? 'border-red-300' : ''}`}
                    placeholder="john@example.com"
                    required
                  />
                  {formData.email && !errors.email && (
                    <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`pl-10 ${errors.phone ? 'border-red-300' : ''}`}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                  {formData.phone && !errors.phone && (
                    <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Account & Security */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold text-gray-800">Choose Your Account Type</Label>
                <div className="grid grid-cols-1 gap-4">
                  <label className={`group relative overflow-hidden border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    formData.accountType === 'user' 
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}>
                    <input
                      type="radio"
                      name="accountType"
                      value="user"
                      checked={formData.accountType === 'user'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex items-center p-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                        formData.accountType === 'user' ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-50'
                      }`}>
                        <User className={`h-6 w-6 ${
                          formData.accountType === 'user' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">Event Attendee</div>
                        <div className="text-sm text-gray-600">Browse and attend amazing events in your area</div>
                      </div>
                      {formData.accountType === 'user' && (
                        <CheckCircle className="h-6 w-6 text-blue-600 ml-2" />
                      )}
                    </div>
                  </label>
                  
                  <label className={`group relative overflow-hidden border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    formData.accountType === 'organizer' 
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}>
                    <input
                      type="radio"
                      name="accountType"
                      value="organizer"
                      checked={formData.accountType === 'organizer'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex items-center p-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                        formData.accountType === 'organizer' ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-50'
                      }`}>
                        <Users className={`h-6 w-6 ${
                          formData.accountType === 'organizer' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">Event Organizer</div>
                        <div className="text-sm text-gray-600">Create, manage, and promote your own events</div>
                      </div>
                      {formData.accountType === 'organizer' && (
                        <CheckCircle className="h-6 w-6 text-blue-600 ml-2" />
                      )}
                    </div>
                  </label>
                </div>
                {errors.accountType && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                    <XCircle className="h-4 w-4" />
                    <span>{errors.accountType}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-base font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-300' : ''}`}
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-medium ${
                        passwordStrength.color === 'red' ? 'text-red-600' :
                        passwordStrength.color === 'orange' ? 'text-orange-600' :
                        passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                        passwordStrength.color === 'blue' ? 'text-blue-600' :
                        passwordStrength.color === 'green' ? 'text-green-600' :
                        'text-gray-500'
                      }`}>
                        {passwordStrength.level}
                      </span>
                    </div>
                    
                    {/* Strength Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.bgColor}`}
                        style={{ width: passwordStrength.width }}
                      ></div>
                    </div>
                    
                    {/* Feedback */}
                    <p className={`text-xs ${
                      passwordStrength.score >= 4 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {passwordStrength.feedback}
                    </p>
                    
                    {/* Requirements Checklist */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${
                        formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {formData.password.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1 ${
                        /[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {/[A-Z]/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>Uppercase</span>
                      </div>
                      <div className={`flex items-center gap-1 ${
                        /[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {/[a-z]/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>Lowercase</span>
                      </div>
                      <div className={`flex items-center gap-1 ${
                        /\d/.test(formData.password) ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {/\d/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>Number</span>
                      </div>
                      <div className={`flex items-center gap-1 col-span-2 ${
                        /[^\w\s]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {/[^\w\s]/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>Special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                    <XCircle className="h-4 w-4" />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300' : ''}`}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Profile Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min="13"
                      max="120"
                      value={formData.age}
                      onChange={handleChange}
                      className={`pl-10 ${errors.age ? 'border-red-300' : ''}`}
                      placeholder="25"
                      required
                    />
                    {formData.age && !errors.age && (
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {errors.age && (
                    <p className="text-sm text-red-600">{errors.age}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.gender ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {errors.gender && (
                    <p className="text-sm text-red-600">{errors.gender}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`pl-10 ${errors.city ? 'border-red-300' : ''}`}
                      placeholder="New York"
                      required
                    />
                    {formData.city && !errors.city && (
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {errors.city && (
                    <p className="text-sm text-red-600">{errors.city}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.country ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="ES">Spain</option>
                    <option value="AU">Australia</option>
                    <option value="JP">Japan</option>
                    <option value="CN">China</option>
                    <option value="IN">India</option>
                    <option value="BR">Brazil</option>
                    <option value="MX">Mexico</option>
                    <option value="EG">Egypt</option>
                    <option value="SA">Saudi Arabia</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.country && (
                    <p className="text-sm text-red-600">{errors.country}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Terms */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="acceptedTerms"
                    checked={formData.acceptedTerms}
                    onChange={handleChange}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                  </span>
                </label>
                {errors.acceptedTerms && (
                  <p className="text-sm text-red-600">{errors.acceptedTerms}</p>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">Your Privacy Matters</div>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      We use bank-level encryption to protect your data. Your information is never shared without your consent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceedToStep(currentStep)}
                className={currentStep === 1 ? 'w-full' : 'flex-1'}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading || !formData.acceptedTerms}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create My Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizedRegisterForm;
