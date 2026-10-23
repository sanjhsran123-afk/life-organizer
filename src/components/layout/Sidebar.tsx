import React from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import {
  LayoutDashboard,
  CheckSquare,
  WalletCards,
  Users,
  FileText,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  ShieldCheck,
  Download,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    stats,
    profile,
    currentUser,
    logout,
  } = useApp();

  const { isInstalled, isIPhone, triggerInstall } = usePwa();
  const { toggleTheme, isDark } = useTheme();

  interface NavItem {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeVariant?: 'primary' | 'danger' | 'warning' | 'neutral';
  }

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      badge: stats.tasksPendingCount > 0 ? stats.tasksPendingCount : undefined,
      badgeVariant: stats.tasksOverdueCount > 0 ? 'danger' : 'neutral',
    },
    {
      id: 'money',
      label: 'Money',
      icon: WalletCards,
      badge: stats.peopleOwingCount > 0 ? `${stats.peopleOwingCount} owe` : undefined,
      badgeVariant: 'warning',
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: FileText,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
    ...(currentUser?.role === 'admin'
      ? [
          {
            id: 'admin' as TabType,
            label: 'Admin Panel',
            icon: ShieldCheck,
            badge: 'Admin',
            badgeVariant: 'primary' as const,
          },
        ]
      : []),
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-200 ease-in-out shrink-0 select-none z-30 sticky top-0 h-screen ${
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                DayLedger
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium tracking-tight">
                Tasks & Money
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-2 mb-2">
          {!sidebarCollapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Workspace
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600'
                }`}
              />

              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium tracking-tight ${
                        item.badgeVariant === 'danger'
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-semibold'
                          : item.badgeVariant === 'warning'
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                          : isActive
                          ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Install PWA Option / Status */}
      <div className="px-3 pb-2">
        {isInstalled ? (
          !sidebarCollapsed && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">DayLedger Installed</span>
            </div>
          )
        ) : (
          <button
            onClick={triggerInstall}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-900/50 shadow-2xs ${
              sidebarCollapsed ? 'justify-center px-2' : ''
            }`}
            title="Install DayLedger App"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="truncate flex-1 text-left">Install DayLedger</span>
                <span className="text-[10px] bg-indigo-200/60 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.2 rounded font-bold">
                  {isIPhone ? 'iOS' : 'PWA'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Quick Summary Pill / User footer */}
      <div
        className={`p-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1 ${
          sidebarCollapsed ? 'flex-col justify-center' : 'justify-between'
        }`}
      >
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-3 p-2 rounded-xl text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer min-w-0 ${
            sidebarCollapsed ? 'justify-center w-full' : 'flex-1'
          }`}
          title="Account & Settings"
        >
          <Avatar name={profile.name} size="sm" />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate leading-tight">
                {profile.name}
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">{profile.email}</p>
            </div>
          )}
        </button>

        {/* Quick Theme Toggle in Footer */}
        <button
          onClick={toggleTheme}
          className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        <button
          onClick={logout}
          className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Sign Out / Log Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
