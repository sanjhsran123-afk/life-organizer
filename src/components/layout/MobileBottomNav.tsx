import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import {
  LayoutDashboard,
  CheckSquare,
  WalletCards,
  Users,
  FileText,
  Menu,
  Settings,
  Activity,
  ShieldCheck,
  LogOut,
  X,
  Download,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, profile, logout } = useApp();
  const { isInstalled, isIPhone, triggerInstall } = usePwa();
  const { theme, toggleTheme, isDark } = useTheme();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'money', label: 'Money', icon: WalletCards },
    { id: 'people', label: 'People', icon: Users },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  const handleNavClick = (tabId: TabType) => {
    setIsMoreOpen(false);
    setActiveTab(tabId);
  };

  return (
    <>
      {/* Mobile "More" Drawer Sheet */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-200 dark:border-zinc-800 shadow-popover z-10 p-5 safe-area-pb animate-pop-in">
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <Avatar name={profile.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{profile.name}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-1">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-500" />
                  )}
                  <span>Appearance: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                  Switch to {isDark ? 'Light' : 'Dark'}
                </span>
              </button>

              <button
                onClick={() => handleNavClick('activity')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'activity' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <span>Activity Timeline</span>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'settings' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <span>Settings & Preferences</span>
                </div>
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'admin' ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Admin Panel</span>
                  </div>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full uppercase">
                    Admin
                  </span>
                </button>
              )}

              {isInstalled ? (
                <div className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>DayLedger Installed</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Active
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    triggerInstall();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/50 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-900/50 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Install DayLedger</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    {isIPhone ? 'iPhone' : 'Install'}
                  </span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of DayLedger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 px-1 py-1 flex items-center justify-around safe-area-pb shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !isMoreOpen;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl text-[10px] font-medium transition-colors cursor-pointer ${
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400 stroke-[2.5]' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span className="leading-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Settings / More tab */}
        <button
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl text-[10px] font-medium transition-colors cursor-pointer ${
            isMoreOpen || activeTab === 'settings' || activeTab === 'activity' || activeTab === 'admin'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">More</span>
        </button>
      </nav>
    </>
  );
};
