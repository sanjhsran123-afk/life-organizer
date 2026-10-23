import React from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  LogIn,
  Database,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { AdminOverviewStats, AdminUser } from '../../types';

interface AdminOverviewViewProps {
  stats: AdminOverviewStats | null;
  isLoading: boolean;
  onNavigateTab: (tab: 'users' | 'activity') => void;
  onSelectUser: (user: AdminUser) => void;
  onRefresh: () => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  stats,
  isLoading,
  onNavigateTab,
  onSelectUser,
  onRefresh,
}) => {
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'SIGNUP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <UserPlus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Sign Up
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <LogIn className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Login
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <Clock className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Logout
          </span>
        );
      case 'SESSION_EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / MongoDB Status */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 text-white rounded-2xl p-6 shadow-md border border-zinc-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Administration Hub
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                MongoDB Live Source of Truth
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5">
              System & User Administration
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-xl">
              Real-time monitoring of user accounts, role permissions, and server-confirmed security logs across the DayLedger database.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              title="Refresh administrative metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => onNavigateTab('users')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Users</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Registered Users</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {stats?.totalUsers ?? '...'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">accounts in DB</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
            <Database className="w-3 h-3 text-indigo-500" />
            <span>MongoDB Collection: <code>users</code></span>
          </div>
        </div>

        {/* Administrators */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Admin Privileges</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {stats?.adminUsers ?? '...'}
            </span>
            <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">admins active</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
            <span>{stats?.standardUsers ?? 0} regular standard user accounts</span>
          </div>
        </div>

        {/* New Signups Last 7 Days */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recent Sign-ups</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {stats?.signupsLast7Days ?? '...'}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> last 7 days
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
            <span>New user acquisition rate</span>
          </div>
        </div>

        {/* Total Logins Last 7 Days */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recent Logins</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {stats?.loginsLast7Days ?? '...'}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">sessions</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
            <span>Authentication events recorded</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Users & Recent Security Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Recent Sign-ups (MongoDB)</h2>
            </div>
            <button
              onClick={() => onNavigateTab('users')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Users</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 flex-1">
            {!stats?.recentSignups || stats.recentSignups.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-600 dark:text-zinc-400">
                No user accounts recorded in MongoDB.
              </div>
            ) : (
              stats.recentSignups.map((u) => (
                <div
                  key={u._id}
                  onClick={() => onSelectUser(u)}
                  className="p-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{u.name}</span>
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate block">{u.email}</span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                        Age: {u.currentAge || u.age} yrs • DOB: {u.dateOfBirth || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block">
                      {formatDateTime(u.createdAt)}
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                      View Profile
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Server Security Activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Security & Auth Logs (MongoDB)</h2>
            </div>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Audit Log</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 flex-1">
            {!stats?.recentActivities || stats.recentActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-600 dark:text-zinc-400">
                No security activities logged yet.
              </div>
            ) : (
              stats.recentActivities.map((act) => (
                <div key={act._id} className="p-3.5 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getEventBadge(act.eventType)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {act.userName || act.userEmail}
                        </span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                          ({act.ipAddress})
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate block">
                        {act.details || `Event ${act.eventType}`}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 shrink-0">
                    {formatDateTime(act.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
