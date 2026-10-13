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
} from 'lucide-react';
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
      className={`hidden md:flex flex-col border-r border-zinc-200/80 bg-white transition-all duration-200 ease-in-out shrink-0 select-none z-30 sticky top-0 h-screen ${
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-zinc-900 leading-tight">
                DayLedger
              </span>
              <span className="text-[11px] text-zinc-600 font-medium tracking-tight">
                Tasks & Money
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
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
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
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
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-zinc-400 group-hover:text-zinc-600'
                }`}
              />

              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium tracking-tight ${
                        item.badgeVariant === 'danger'
                          ? 'bg-rose-100 text-rose-700 font-semibold'
                          : item.badgeVariant === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : isActive
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-zinc-100 text-zinc-600'
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

      {/* Quick Summary Pill / User footer */}
      <div
        className={`p-3 border-t border-zinc-100 flex items-center gap-1 ${
          sidebarCollapsed ? 'flex-col justify-center' : 'justify-between'
        }`}
      >
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-3 p-2 rounded-xl text-left hover:bg-zinc-50 transition-colors cursor-pointer min-w-0 ${
            sidebarCollapsed ? 'justify-center w-full' : 'flex-1'
          }`}
          title="Account & Settings"
        >
          <Avatar name={profile.name} size="sm" />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-800 truncate leading-tight">
                {profile.name}
              </p>
              <p className="text-[11px] text-zinc-600 truncate">{profile.email}</p>
            </div>
          )}
        </button>

        <button
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Sign Out / Log Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
