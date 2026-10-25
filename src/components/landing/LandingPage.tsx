import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Calendar,
  DollarSign,
  Users,
  FileText,
  MapPin,
  Activity,
  Smartphone,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Check,
  HeartHandshake,
  Menu,
  X,
  Laptop,
  Globe,
  Database,
  Eye,
  EyeOff,
  User as UserIcon,
  Phone,
  Cake,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../common/Button';

export const LandingPage: React.FC = () => {
  const { login, register } = useApp();
  const { theme, toggleTheme } = useTheme();

  // Mobile menu open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth modal / card state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Active feature tab for interactive preview
  const [activePreviewTab, setActivePreviewTab] = useState<'tasks' | 'money' | 'people' | 'notes'>('tasks');

  // FAQ open items
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Auth form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successInfo, setSuccessInfo] = useState<{
    name: string;
    email: string;
  } | null>(null);

  // Check URL hash for direct auth actions
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#login') {
        setAuthMode('login');
        setAuthModalOpen(true);
      } else if (hash === '#register' || hash === '#signup') {
        setAuthMode('register');
        setAuthModalOpen(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthError(null);
    setFieldErrors({});
    setAuthModalOpen(true);
  };

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

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDob = e.target.value;
    setDateOfBirth(newDob);
    const calculated = computeAge(newDob);
    if (calculated !== null && calculated >= 0) {
      setAge(calculated.toString());
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.dateOfBirth;
        delete next.age;
        return next;
      });
    }
  };

  const validateAuthForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (authMode === 'register') {
      if (!name.trim()) errors.name = 'Full name is required.';
      else if (name.trim().length < 2) errors.name = 'Full name must be at least 2 characters.';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) errors.email = 'Email address is required.';
      else if (!emailRegex.test(email.trim())) errors.email = 'Please enter a valid email address.';

      const cleanedPhone = phone.replace(/[\s\-().]/g, '');
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!cleanedPhone) errors.phone = 'Phone number is required.';
      else if (!phoneRegex.test(cleanedPhone)) errors.phone = 'Enter a valid 10-15 digit phone number.';

      if (!dateOfBirth) errors.dateOfBirth = 'Date of birth is required.';
      else {
        const birthDate = new Date(dateOfBirth);
        if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
          errors.dateOfBirth = 'Invalid date of birth.';
        }
      }

      const parsedAge = parseInt(age, 10);
      if (!age || isNaN(parsedAge) || parsedAge < 1 || parsedAge > 130) {
        errors.age = 'Age must be between 1 and 130.';
      } else if (dateOfBirth) {
        const expected = computeAge(dateOfBirth);
        if (expected !== null && Math.abs(expected - parsedAge) > 1) {
          errors.age = `Age (${parsedAge}) does not match birth date (${expected}).`;
        }
      }

      if (!password) errors.password = 'Password is required.';
      else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';

      if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
      else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    } else {
      if (!email.trim()) errors.email = 'Please enter your email or phone.';
      if (!password) errors.password = 'Please enter your password.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setAuthError(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!validateAuthForm()) return;

    setIsLoading(true);
    try {
      if (authMode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          age: parseInt(age, 10),
          dateOfBirth: dateOfBirth.split('T')[0],
          password,
          confirmPassword,
        });
        setSuccessInfo({ name: name.trim(), email: email.trim() });
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const faqs = [
    {
      q: 'What makes DayLedger a life organizer app?',
      a: 'DayLedger is designed as a single, unified life organizer app that replaces disconnected apps for daily to-dos, loan calculations, contact notes, and personal checklists. Instead of switching between multiple single-purpose tools, DayLedger brings tasks, lent/borrowed money records, contacts, and notes into one coherent, private dashboard.',
    },
    {
      q: 'Is DayLedger free to use?',
      a: 'Yes, DayLedger is free to use. All core features—including task management, financial loan tracking, contact directory, and notes—are available with no subscription fees or paywalls.',
    },
    {
      q: 'How does the Lent & Borrowed money ledger work?',
      a: 'The financial ledger lets you clearly track funds lent to friends, colleagues, or family, as well as money you have borrowed. You can record partial repayments, view remaining balances, attach notes, and check overdue return dates so you always maintain transparent financial relationships.',
    },
    {
      q: 'Can I install DayLedger on my iPhone, Android, or desktop?',
      a: 'Yes. DayLedger is an installable Progressive Web App (PWA). On iPhone, tap Share in Safari and select "Add to Home Screen". On Android or desktop browsers, click the Install prompt or download the Capacitor Android app build for a standalone experience.',
    },
    {
      q: 'Is my personal and financial data kept secure and private?',
      a: 'Yes. DayLedger uses server-side bcrypt password hashing with salt factor 10, industry-standard JSON Web Token (JWT) sessions, and strict per-user database queries. Passwords are never stored in plaintext, and your data is never sold or shared with advertisers.',
    },
    {
      q: 'Does DayLedger support offline access?',
      a: 'The app shell and static assets are cached by the service worker for fast loading. Note that account authentication and syncing your tasks or transactions with the cloud database require an active internet connection.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-950 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-150">
      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 dark:bg-zinc-950/85 border-b border-zinc-200/80 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Name */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Day<span className="text-indigo-600 dark:text-indigo-400">Ledger</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Life Organizer App
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Features
            </a>
            <a href="#who-it-helps" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Who It Helps
            </a>
            <a href="#preview" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Preview
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            <button
              type="button"
              onClick={() => openAuth('login')}
              className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Log In
            </button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => openAuth('register')}
              className="shadow-md shadow-indigo-600/20 text-xs px-3.5 py-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 px-4 pt-3 pb-4 space-y-2.5 text-sm font-medium animate-slide-down">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-zinc-600 dark:text-zinc-300"
            >
              Features
            </a>
            <a
              href="#who-it-helps"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-zinc-600 dark:text-zinc-300"
            >
              Who It Helps
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-zinc-600 dark:text-zinc-300"
            >
              Preview
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-zinc-600 dark:text-zinc-300"
            >
              How It Works
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-zinc-600 dark:text-zinc-300"
            >
              FAQ
            </a>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuth('login');
                }}
                className="flex-1 py-2 rounded-xl text-center text-xs font-semibold border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuth('register');
                }}
                className="flex-1 py-2 rounded-xl text-center text-xs font-semibold bg-indigo-600 text-white"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40 dark:opacity-20 blur-3xl z-0">
          <div className="w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 absolute top-10 left-1/4" />
          <div className="w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 absolute top-20 right-1/4" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs mb-6">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>The All-in-One Life Organizer App</span>
          </div>

          {/* Main H1 Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
            Simplify Your Daily Life with{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              DayLedger
            </span>
          </h1>

          {/* Subtitle with natural keywords */}
          <p className="mt-5 text-base sm:text-lg lg:text-xl text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            A fast, private <strong>life organizer app</strong> that unifies task planning, personal lent & borrowed money tracking, contacts, and quick notes into one distraction-free workspace.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <Button
              variant="primary"
              size="lg"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto px-7 py-3 text-sm font-semibold shadow-lg shadow-indigo-600/25"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <button
              type="button"
              onClick={() => openAuth('login')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors shadow-2xs cursor-pointer"
            >
              Sign In to Workspace
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-10 pt-8 border-t border-zinc-200/70 dark:border-zinc-800/70 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Free to Use</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Secure Passwords (bcrypt)</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 font-medium">
              <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Installable Web App (PWA)</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 font-medium">
              <Database className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Cloud Sync (When Connected)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive App Preview Section */}
      <section id="preview" className="py-12 sm:py-16 bg-zinc-100/60 dark:bg-zinc-900/40 border-y border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
              Workspace Overview
            </h2>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              Explore DayLedger in Action
            </p>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg mx-auto">
              Switch through DayLedger's core modules to see how simple life organization feels.
            </p>
          </div>

          {/* Preview Tab Controls */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex p-1 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setActivePreviewTab('tasks')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePreviewTab === 'tasks'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Tasks & Priorities
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('money')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePreviewTab === 'money'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Money Ledger
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('people')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePreviewTab === 'people'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Contacts & People
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('notes')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePreviewTab === 'notes'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Personal Notes
              </button>
            </div>
          </div>

          {/* Mock Preview Display Container */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-6 transition-all">
            {/* Window chrome topbar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="text-xs text-zinc-400 font-mono ml-2">life-organizer-52s.pages.dev / workspace</span>
              </div>
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                Live Interactive Mock
              </span>
            </div>

            {/* TAB CONTENT: TASKS */}
            {activePreviewTab === 'tasks' && (
              <div className="space-y-3 animate-pop-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Today's Task Pipeline</span>
                  </h3>
                  <span className="text-xs text-zinc-400">4 active tasks</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded border-2 border-indigo-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-indigo-600" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Complete monthly financial review & expense ledger
                        </p>
                        <p className="text-[11px] text-zinc-400">Due today • Finance</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      High Priority
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded border-2 border-zinc-300 dark:border-zinc-700" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Send roommate apartment rent & utilities share
                        </p>
                        <p className="text-[11px] text-zinc-400">Tomorrow • Personal</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      Medium Priority
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded border-2 border-zinc-300 dark:border-zinc-700" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Schedule dentist checkup & prescription refill
                        </p>
                        <p className="text-[11px] text-zinc-400">Oct 28 • Health</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      Low Priority
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MONEY */}
            {activePreviewTab === 'money' && (
              <div className="space-y-3 animate-pop-in">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60">
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">
                      Total Lent (You Are Owed)
                    </span>
                    <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">₹6,500</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/60">
                    <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 uppercase">
                      Total Borrowed (You Owe)
                    </span>
                    <p className="text-lg font-bold text-rose-800 dark:text-rose-300 mt-0.5">₹1,200</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                        ↗
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Lent to Aman Sharma
                        </p>
                        <p className="text-[11px] text-zinc-400">Concert ticket reimbursement • Due Nov 2</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+₹3,500</p>
                      <span className="text-[10px] text-zinc-400">Pending</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center">
                        ↙
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Borrowed from Simran Kaur
                        </p>
                        <p className="text-[11px] text-zinc-400">Weekend dinner split • Due Oct 30</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400">-₹1,200</p>
                      <span className="text-[10px] text-amber-600 font-medium">Partially Paid (₹500)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PEOPLE */}
            {activePreviewTab === 'people' && (
              <div className="space-y-3 animate-pop-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Relationships & Linked Balances</span>
                  </h3>
                  <span className="text-xs text-zinc-400">12 contacts saved</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      AS
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        Aman Sharma
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">+91 98765 43210</p>
                      <p className="text-[11px] font-semibold text-emerald-600">Owes you ₹3,500</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      SK
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        Simran Kaur
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">simran.k@example.com</p>
                      <p className="text-[11px] font-semibold text-rose-600">You owe ₹700</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: NOTES */}
            {activePreviewTab === 'notes' && (
              <div className="space-y-3 animate-pop-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Quick Scratchpad & Pinned Notes</span>
                  </h3>
                  <span className="text-xs text-zinc-400">8 notes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                        📌 Apartment Lease Checklist
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">Pinned</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2">
                      Review maintenance deposit receipt, check electricity meter readings, renew lease agreement before Dec 1.
                    </p>
                    <div className="mt-2 flex gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">#Home</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">#Finance</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        💡 Semester Project References
                      </span>
                      <span className="text-[10px] text-zinc-400">2d ago</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2">
                      Read distributed caching documentation and review API load test metrics for Friday sync.
                    </p>
                    <div className="mt-2 flex gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">#College</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Who DayLedger Helps (Audience & Use Cases) */}
      <section id="who-it-helps" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
              Built for Real Life
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-1.5">
              Who Does DayLedger Help?
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 mt-2">
              Whether you are balancing freelance clients, college deadlines, or family loans, DayLedger brings harmony to everyday responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Persona 1: Busy Professionals */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Professionals & Freelancers
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Stop losing track of client follow-ups, out-of-pocket reimbursements, and work-life balance. Group tasks by priority, track money lent to team members, and keep meeting notes at your fingertips.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Work vs. Personal category separation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Reimbursement loan ledger with receipts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Command palette (`Ctrl+K`) for rapid navigation</span>
                </li>
              </ul>
            </div>

            {/* Persona 2: Students */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Students & Roommates
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Juggling college assignments, apartment rent splits, and borrowed books? DayLedger keeps study deadlines organized and logs who owes what for groceries without awkward reminders.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>College task deadlines & due date alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Transparent friend & roommate debt records</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Offline study notes when campus Wi-Fi drops</span>
                </li>
              </ul>
            </div>

            {/* Persona 3: Everyday Life & Family Organizers */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Individuals & Families
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Maintain total financial and logistical clarity for household chores, doctor visits, home improvement contacts, and money lent to relatives—with zero complicated spreadsheets.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Family loans with installment payment history</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Important contact phone & address directory</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Google Maps satellite location verification</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Features Deep Dive */}
      <section id="features" className="py-16 sm:py-24 bg-zinc-100/50 dark:bg-zinc-900/30 border-y border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
              Complete Feature Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-1.5">
              Everything You Need in a Life Organizer App
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 mt-2">
              Carefully crafted tools working together to give you peaceful productivity every single day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Smart Task Pipeline
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Prioritize tasks with Low, Medium, and High tags. Organize by categories (Personal, College, Work, Finance, Health) with calendar due dates and celebratory confetti upon completion.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Lent & Borrowed Ledger
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Transparently record who you lent money to or who you borrowed from. Record partial payments with timestamps and notes, track expected return dates, and view net balance calculations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                People & Relationships
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Keep phone numbers, emails, and notes for friends, family, and colleagues. Directly link financial debts and shared tasks to individual contact profiles.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Quick Tagged Notes
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Capture thoughts, checklists, and snippets instantly. Organize with custom hashtags (`#Finance`, `#Home`), pin key reference notes, and search through notes in milliseconds.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                GPS Location & Satellite Map
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                On-demand real-time GPS coordinate discovery with interactive Google Maps Embed satellite view, marker pins, and 1-click external navigation links.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Installable PWA & Fast Caching
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Install as a standalone web app on your iPhone, Android, or laptop. The service worker caches app shell assets for fast loading. Note: Account sign-in and cloud database sync require an internet connection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works */}
      <section id="how-it-works" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
              Simple 3-Step Setup
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-1.5">
              How DayLedger Works
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 mt-2">
              Start organizing your daily routines in under a minute with zero learning curve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="text-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-600/20">
                1
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Create Your Account
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Sign up in 30 seconds with your email, phone, and password. No credit card or phone verification required.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-600/20">
                2
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Add Tasks, Loans & Notes
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Capture your priorities, log money lent or borrowed, and jot down important contact notes in one central view.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-600/20">
                3
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Install PWA & Stay in Flow
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Add to your mobile home screen for quick 1-tap launching. When connected, changes sync to your private account in MongoDB.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Frequently Asked Questions (SEO-Rich FAQ) */}
      <section id="faq" className="py-16 sm:py-24 bg-zinc-100/50 dark:bg-zinc-900/40 border-t border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-1.5">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
              Everything you need to know about DayLedger, your personal life organizer app.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0 ml-2" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner & Direct Sign Up Access */}
      <section id="auth-cta" className="py-16 sm:py-24 bg-gradient-to-b from-transparent to-indigo-50/40 dark:to-zinc-900/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to Regain Control of Your Day?
              </h2>
              <p className="mt-3 text-sm sm:text-base text-indigo-100">
                Join users who organize their tasks, track debts with confidence, and keep life in order with DayLedger.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-indigo-700 font-bold text-sm shadow-md hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  Create Your Free Account
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 border border-indigo-400/40 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  Sign In to Existing Account
                </button>
              </div>
            </div>

            {/* Decorative background circle */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-900/50 blur-2xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 9. Public Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-10 bg-white dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
              D
            </div>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              DayLedger
            </span>
            <span className="text-zinc-400">• The All-in-One Life Organizer App</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Features
            </a>
            <a href="#who-it-helps" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Who It Helps
            </a>
            <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              FAQ
            </a>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>

          <p>© {new Date().getFullYear()} DayLedger. Personal productivity & life organizer suite.</p>
        </div>
      </footer>

      {/* 10. AUTH MODAL (Login & Register) */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-8 animate-pop-in max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close auth dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Brand Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 mb-2.5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {authMode === 'login' ? 'Welcome Back to DayLedger' : 'Create Your Free DayLedger Account'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {authMode === 'login'
                  ? 'Access your private tasks, money transactions & notes'
                  : 'Start your unified personal productivity workspace'}
              </p>
            </div>

            {/* Mode switch */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-5 border border-zinc-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                  setFieldErrors({});
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                  setFieldErrors({});
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Message Alert */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="leading-relaxed font-medium">{authError}</div>
              </div>
            )}

            {/* Success Info Alert */}
            {successInfo && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold">Account created in MongoDB!</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Welcome, {successInfo.name}! You are now authenticated.
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                        className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-indigo-500"
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* DOB & Age Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Date of Birth <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <input
                          type="date"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={dateOfBirth}
                          onChange={handleDobChange}
                          className="w-full pl-9 pr-2 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Age <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                          className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email & Phone Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                          <UserIcon className="w-4 h-4" />
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
                          className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                          className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Password (Min 6) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                          className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                          className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {authMode === 'login' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Email or Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <UserIcon className="w-4 h-4" />
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
                        className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                        className="w-full pl-9 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isLoading}
                className="w-full mt-2 font-semibold shadow-md shadow-indigo-600/20"
              >
                <span>{authMode === 'login' ? 'Log In to Workspace' : 'Create Free Account'}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
