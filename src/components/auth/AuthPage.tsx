import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getStoredUsers, StoredUserAccount } from '../../api';
import {
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  History,
  LogOut,
  ChevronDown,
  ChevronUp,
  Cake,
} from 'lucide-react';
import { Button } from '../common/Button';

export const AuthPage: React.FC = () => {
  const { login, register, mongoStatus, authLogs } = useApp();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState<StoredUserAccount[]>([]);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successInfo, setSuccessInfo] = useState<{
    name: string;
    email: string;
    phone: string;
    age: number;
    dateOfBirth: string;
  } | null>(null);

  useEffect(() => {
    setStoredAccounts(getStoredUsers());
  }, [authLogs]);

  const recentLogout = authLogs.length > 0 && authLogs[0].type === 'LOGOUT' ? authLogs[0] : null;

  // Helper to compute age from DOB
  const computeAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let calculated = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculated--;
    }
    return calculated;
  };

  // Auto-calculate and suggest age when Date of Birth changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDob = e.target.value;
    setDateOfBirth(newDob);
    const calculated = computeAge(newDob);
    if (calculated !== null && calculated >= 0) {
      setAge(calculated.toString());
      // Clear age error if any
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.dateOfBirth;
        delete next.age;
        return next;
      });
    }
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (mode === 'register') {
      // 1. Name
      if (!name.trim()) {
        errors.name = 'Full name is required.';
      } else if (name.trim().length < 2) {
        errors.name = 'Full name must be at least 2 characters.';
      }

      // 2. Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        errors.email = 'Email address is required.';
      } else if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }

      // 3. Phone
      const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, '');
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!cleanedPhone) {
        errors.phone = 'Phone number is required.';
      } else if (!phoneRegex.test(cleanedPhone)) {
        errors.phone = 'Enter a valid 10-15 digit phone number (e.g. +91 98765 43210).';
      }

      // 4. Date of Birth
      if (!dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required.';
      } else {
        const birthDate = new Date(dateOfBirth);
        if (isNaN(birthDate.getTime())) {
          errors.dateOfBirth = 'Invalid date format.';
        } else if (birthDate > new Date()) {
          errors.dateOfBirth = 'Date of birth cannot be in the future.';
        }
      }

      // 5. Age & Consistency
      const parsedAge = parseInt(age, 10);
      if (!age || isNaN(parsedAge) || parsedAge < 1 || parsedAge > 130) {
        errors.age = 'Age must be between 1 and 130.';
      } else if (dateOfBirth) {
        const expected = computeAge(dateOfBirth);
        if (expected !== null && Math.abs(expected - parsedAge) > 1) {
          errors.age = `Age (${parsedAge}) is inconsistent with Date of Birth (${dateOfBirth}, expected ${expected}).`;
        }
      }

      // 6. Password
      if (!password) {
        errors.password = 'Password is required.';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters long.';
      }

      // 7. Confirm Password
      if (!confirmPassword) {
        errors.confirmPassword = 'Confirm your password.';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    } else {
      // Login validation
      if (!email.trim()) {
        errors.email = 'Please enter your email or phone number.';
      }
      if (!password) {
        errors.password = 'Please enter your password.';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        const registrationData = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          age: parseInt(age, 10),
          dateOfBirth: dateOfBirth.split('T')[0],
          password,
          confirmPassword,
        };

        await register(registrationData);

        // Store success state for clear confirmation
        setSuccessInfo({
          name: registrationData.name,
          email: registrationData.email,
          phone: registrationData.phone,
          age: registrationData.age,
          dateOfBirth: registrationData.dateOfBirth,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your entries.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTestLogin = async () => {
    setError(null);
    setFieldErrors({});
    setEmail('test@dayledger.app');
    setPassword('password123');
    setIsLoading(true);
    try {
      await login({
        email: 'test@dayledger.app',
        password: 'password123',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to log in with test credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    setFieldErrors({});
    setSuccessInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-indigo-50/30 to-purple-50/20 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background ambient accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl opacity-70" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl opacity-70" />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-fade-in my-6">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 mb-3 ring-4 ring-indigo-50">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Day<span className="text-indigo-600">Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
            Your unified daily planner, financial ledger & relationship tracker
          </p>

          {/* Database Connection Pill */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-white/90 backdrop-blur-xs shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                mongoStatus.status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-zinc-700 font-medium">
              {mongoStatus.status === 'connected'
                ? 'MongoDB Connected (Compass Ready)'
                : 'Offline / Local Session Ready'}
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white/95 backdrop-blur-md border border-zinc-200/80 rounded-2xl shadow-xl shadow-zinc-200/50 p-6 sm:p-8">
          {/* Two Clear Options: Log in vs Sign up */}
          <div className="flex bg-zinc-100/90 p-1 rounded-xl mb-6 border border-zinc-200/60">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Recent Logout Alert */}
          {recentLogout && mode === 'login' && !error && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-xs flex items-center gap-2.5 animate-fade-in shadow-2xs">
              <LogOut className="w-4 h-4 shrink-0 text-amber-600" />
              <div className="leading-tight">
                <span>
                  You have logged out of <strong>{recentLogout.email}</strong>. Log in with your account or sign up below.
                </span>
              </div>
            </div>
          )}

          {/* Success State Banner (After Sign-up) */}
          {successInfo && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs animate-pop-in space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Account Created in MongoDB!</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                Welcome, <strong>{successInfo.name}</strong>! Your account profile has been saved to the database.
              </p>
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 text-[11px] font-mono space-y-0.5 text-emerald-950">
                <div>Email: {successInfo.email}</div>
                <div>Phone: {successInfo.phone}</div>
                <div>Age: {successInfo.age} years (DOB: {successInfo.dateOfBirth})</div>
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Saved Local Accounts Quick Selector (Login mode) */}
          {mode === 'login' && storedAccounts.length > 0 && (
            <div className="mb-4 p-3 bg-zinc-50/90 rounded-xl border border-zinc-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Saved Accounts
                </span>
                <span className="text-[10px] text-zinc-400">Click to autofill</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {storedAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer text-left text-xs ${
                      email.toLowerCase() === acc.email.toLowerCase()
                        ? 'border-indigo-400 bg-indigo-50/70 text-indigo-900 shadow-2xs'
                        : 'border-zinc-200/70 bg-white hover:bg-zinc-100/70 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate leading-tight">{acc.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate leading-tight font-mono">{acc.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-indigo-600 shrink-0">
                      {email.toLowerCase() === acc.email.toLowerCase() ? 'Selected' : 'Use'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* SIGN UP FORM FIELDS */}
            {mode === 'register' && (
              <>
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="e.g. Madhav Sharma"
                      className={`w-full pl-10 pr-3.5 py-2 bg-zinc-50/70 border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all ${
                        fieldErrors.name
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                          : 'border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                {/* 2. Date of Birth & Age (2-Column Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={dateOfBirth}
                        onChange={handleDobChange}
                        className={`w-full pl-10 pr-3 py-2 bg-zinc-50/70 border rounded-xl text-sm text-zinc-900 outline-none transition-all ${
                          fieldErrors.dateOfBirth
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                            : 'border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>
                    {fieldErrors.dateOfBirth && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.dateOfBirth}</p>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Age <span className="text-rose-500">*</span>
                      </label>
                      {dateOfBirth && computeAge(dateOfBirth) !== null && (
                        <span className="text-[10px] text-indigo-600 font-medium">
                          Computed: {computeAge(dateOfBirth)} yrs
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Cake className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="130"
                        required
                        value={age}
                        onChange={(e) => {
                          setAge(e.target.value);
                          if (fieldErrors.age) setFieldErrors((prev) => ({ ...prev, age: '' }));
                        }}
                        placeholder="e.g. 24"
                        className={`w-full pl-10 pr-3.5 py-2 bg-zinc-50/70 border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all ${
                          fieldErrors.age
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                            : 'border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>
                    {fieldErrors.age && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.age}</p>
                    )}
                  </div>
                </div>

                {/* 3. Email & Phone Number (2-Column Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder="name@example.com"
                        className={`w-full pl-10 pr-3.5 py-2 bg-zinc-50/70 border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all ${
                          fieldErrors.email
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                            : 'border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                        }}
                        placeholder="+91 98765 43210"
                        className={`w-full pl-10 pr-3.5 py-2 bg-zinc-50/70 border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all ${
                          fieldErrors.phone
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                            : 'border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* 4. Password & Confirm Password (2-Column Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-400">Min 6 chars</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                        }}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-9 py-2 bg-zinc-50/70 border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all ${
                          fieldErrors.password
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                            : 'border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      {confirmPassword && (
                        <span
                          className={`text-[10px] font-medium ${
                            password === confirmPassword ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {password === confirmPassword ? '✓ Matches' : 'Mismatch'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                        }}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-9 py-2 bg-zinc-50/70 border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all ${
                          fieldErrors.confirmPassword
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                            : 'border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* LOGIN FORM FIELDS */}
            {mode === 'login' && (
              <>
                {/* Email or Phone Input */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Email Address or Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="name@example.com or phone"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-50/70 border border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Password
                    </label>
                    <span className="text-[11px] text-indigo-600 font-medium">
                      Min 6 characters
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-zinc-50/70 border border-zinc-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full mt-3 justify-center shadow-md shadow-indigo-600/20 py-2.5 font-semibold text-sm"
            >
              <span>{mode === 'login' ? 'Log In to Workspace' : 'Create My Account'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Switch Form Footer Link */}
          <div className="mt-4 text-center text-xs text-zinc-500">
            {mode === 'login' ? (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Sign up for a new account
                </button>
              </span>
            ) : (
              <span>
                Already have an existing account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Log in here
                </button>
              </span>
            )}
          </div>

          {/* 1-Click Quick Test Login (Shown only on login mode) */}
          {mode === 'login' && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-zinc-400 font-medium tracking-wider">
                    Instant Test Access
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickTestLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-900 transition-all cursor-pointer group shadow-2xs text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    ⚡
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-950">
                      1-Click Test Login
                    </p>
                    <p className="text-[11px] text-indigo-600 font-mono">
                      test@dayledger.app / password123
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  Fill & Login →
                </span>
              </button>
            </>
          )}
        </div>

        {/* Stored Authentication Activity Logs Accordion */}
        <div className="mt-4 bg-white/90 backdrop-blur-md border border-zinc-200/80 rounded-2xl p-3.5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowLogsDrawer((prev) => !prev)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-zinc-700 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Stored Auth & Session Logs ({authLogs.length} events recorded)</span>
            </div>
            {showLogsDrawer ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showLogsDrawer && (
            <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2 max-h-56 overflow-y-auto pr-1">
              {authLogs.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-2">
                  No login or logout records yet.
                </p>
              ) : (
                authLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-zinc-50 border border-zinc-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          log.type === 'LOGIN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.type === 'LOGOUT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {log.type}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-800 truncate leading-tight">
                          {log.name || log.email}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate leading-tight">
                          {log.email} {log.details ? `• ${log.details}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-5 text-xs text-zinc-400">
          <p>Real-life data isolation • Encrypted passwords • Synced to MongoDB</p>
        </div>
      </div>
    </div>
  );
};
