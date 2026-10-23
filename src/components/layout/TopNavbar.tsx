import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Plus, Bell, Sparkles, LogOut, Settings, ShieldCheck, Activity, Download, CheckCircle2 } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';

export const TopNavbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setSearchOpen,
    setQuickAddOpen,
    setNotificationOpen,
    unreadNotificationCount,
    profile,
    currentUser,
    logout,
  } = useApp();

  const { isInstalled, isIPhone, triggerInstall } = usePwa();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Dashboard Overview',
      subtitle: `Welcome back, ${profile.name}`,
    },
    tasks: {
      title: 'Tasks & To-Dos',
      subtitle: 'Manage, organize, and prioritize your daily agenda',
    },
    money: {
      title: 'Money Management',
      subtitle: 'Track lent funds, debts, repayments & pending balances',
    },
    people: {
      title: 'People & Contacts',
      subtitle: 'Financial relationships and contact balances',
    },
    notes: {
      title: 'Notes & Ideas',
      subtitle: 'Quick thoughts, memory logs, and tagged references',
    },
    activity: {
      title: 'Activity Timeline',
      subtitle: 'Chronological feed of your tasks and transactions',
    },
    settings: {
      title: 'Settings & Preferences',
      subtitle: 'Profile, currency, data backups and preferences',
    },
    admin: {
      title: 'Administrator Control Panel',
      subtitle: 'Manage user profiles and server authentication audit logs',
    },
  };

  const currentMeta = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="app-topbar-safe-area sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-200/70 h-16 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Title & context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="md:hidden flex items-center gap-2 mr-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-zinc-900 tracking-tight truncate leading-tight">
            {currentMeta.title}
          </h1>
          <p className="hidden sm:block text-xs text-zinc-500 truncate leading-tight mt-0.5">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Search trigger button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100/90 border border-zinc-200/80 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer group shadow-2xs"
          title="Search anything (Ctrl+K / ⌘K)"
          aria-label="Search"
        >
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-500 sm:text-zinc-400 group-hover:text-zinc-600" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-white border border-zinc-200/80 text-zinc-500 px-1.5 py-0.5 rounded font-mono shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Global Quick Add button */}
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />}
          onClick={() => setQuickAddOpen(true)}
          className="shadow-xs px-2.5 sm:px-3"
          aria-label="Quick Add"
        >
          <span className="hidden sm:inline">Quick Add</span>
        </Button>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationOpen(true)}
          className="relative text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 p-2 rounded-xl transition-colors cursor-pointer"
          title="Notifications & Reminders"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>

        {/* Direct Log Out Button (visible on desktop/tablet, mobile uses profile menu) */}
        <button
          onClick={logout}
          className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-200/90 bg-rose-50/70 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer group"
          title="Log out of DayLedger"
          aria-label="Log Out"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
          <span>Log Out</span>
        </button>

        {/* Profile Avatar with Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="cursor-pointer focus:outline-none rounded-xl ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-500 p-0.5 hover:ring-2 hover:ring-zinc-200 transition-all"
            title="Account & Session Menu"
            aria-expanded={isUserMenuOpen}
          >
            <Avatar name={profile.name} size="sm" />
          </button>

          {/* User Profile Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-zinc-200/80 py-1.5 z-50 animate-pop-in">
              <div className="px-3.5 py-2.5 border-b border-zinc-100">
                <p className="text-xs font-bold text-zinc-900 truncate">{profile.name}</p>
                <p className="text-[11px] text-zinc-500 truncate">{profile.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Account & Settings</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('activity');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Activity Timeline</span>
                </button>

                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-purple-700 hover:bg-purple-50 flex items-center justify-between transition-colors cursor-pointer font-semibold"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Admin Panel</span>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Admin
                    </span>
                  </button>
                )}

                {isInstalled ? (
                  <div
                    className="w-full px-3.5 py-2 text-left text-xs text-emerald-700 bg-emerald-50/50 flex items-center justify-between cursor-default"
                    title="DayLedger is installed and active on this device"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">App Installed</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded-full">
                      Ready
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      triggerInstall();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-indigo-700 hover:bg-indigo-50/80 flex items-center justify-between transition-colors cursor-pointer font-medium"
                    title="Install DayLedger to your device"
                  >
                    <div className="flex items-center gap-2.5">
                      <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Install DayLedger</span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-full">
                      {isIPhone ? 'iPhone' : 'App'}
                    </span>
                  </button>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
