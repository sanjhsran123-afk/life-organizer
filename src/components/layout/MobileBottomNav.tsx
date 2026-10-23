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
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { Avatar } from '../common/Avatar';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, profile, logout } = useApp();
  const { isInstalled, isIPhone, triggerInstall } = usePwa();
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
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full bg-white rounded-t-3xl border border-zinc-200 shadow-popover z-10 p-5 safe-area-pb animate-pop-in">
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <Avatar name={profile.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 truncate">{profile.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-1">
              <button
                onClick={() => handleNavClick('activity')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'activity' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  <span>Activity Timeline</span>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Settings & Preferences</span>
                </div>
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'admin' ? 'bg-purple-50 text-purple-800' : 'text-purple-700 hover:bg-purple-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Admin Panel</span>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full uppercase">
                    Admin
                  </span>
                </button>
              )}

              {isInstalled ? (
                <div className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>DayLedger Installed</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Active
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    triggerInstall();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100/80 transition-colors cursor-pointer border border-indigo-100 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Install DayLedger</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    {isIPhone ? 'iPhone' : 'Install'}
                  </span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-100">
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of DayLedger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 px-1 py-1 flex items-center justify-around safe-area-pb shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !isMoreOpen;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl text-[10px] font-medium transition-colors cursor-pointer ${
                isActive ? 'text-indigo-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-indigo-600 stroke-[2.5]' : 'text-zinc-400'}`} />
              <span className="leading-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Settings / More tab */}
        <button
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl text-[10px] font-medium transition-colors cursor-pointer ${
            isMoreOpen || activeTab === 'settings' || activeTab === 'activity' || activeTab === 'admin'
              ? 'text-indigo-600 font-bold'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="leading-tight">More</span>
        </button>
      </nav>
    </>
  );
};
