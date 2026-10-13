import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Activity,
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  RefreshCw,
  AlertCircle,
  Lock,
} from 'lucide-react';
import {
  adminGetOverview,
  adminGetUsers,
  adminGetUserDetail,
  adminGetActivity,
} from '../../api';
import {
  AdminUser,
  AdminOverviewStats,
  AdminUsersResponse,
  AdminActivityResponse,
  AdminActivityItem,
} from '../../types';
import { AdminOverviewView } from './AdminOverviewView';
import { AdminUsersView } from './AdminUsersView';
import { AdminActivityView } from './AdminActivityView';
import { AdminUserDetailModal } from './AdminUserDetailModal';
import { Avatar } from '../common/Avatar';

type AdminSubTab = 'overview' | 'users' | 'activity';

export const AdminPanel: React.FC = () => {
  const { currentUser, setActiveTab, logout } = useApp();

  const [currentSubTab, setCurrentSubTab] = useState<AdminSubTab>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Data states
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStats | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  const [usersData, setUsersData] = useState<AdminUsersResponse | null>(null);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('all');
  const [usersSortBy, setUsersSortBy] = useState('createdAt');
  const [usersSortOrder, setUsersSortOrder] = useState<'asc' | 'desc'>('desc');

  const [activityData, setActivityData] = useState<AdminActivityResponse | null>(null);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityEventType, setActivityEventType] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Selected User Detail Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userSpecificActivity, setUserSpecificActivity] = useState<AdminActivityItem[]>([]);
  const [isUserDetailLoading, setIsUserDetailLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Timer for relative time string ("Updated Xs ago")
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      setSecondsAgo(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const isAdmin = currentUser?.role === 'admin';

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    if (!isAdmin) return;
    setIsOverviewLoading(true);
    setGlobalError(null);
    try {
      const stats = await adminGetOverview();
      setOverviewStats(stats);
      setLastUpdated(new Date());
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to fetch admin overview');
    } finally {
      setIsOverviewLoading(false);
    }
  }, [isAdmin]);

  // Fetch Users Data
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setIsUsersLoading(true);
    setGlobalError(null);
    try {
      const data = await adminGetUsers({
        page: usersPage,
        limit: 10,
        search: usersSearch,
        role: usersRoleFilter,
        sortBy: usersSortBy,
        sortOrder: usersSortOrder,
      });
      setUsersData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to fetch users');
    } finally {
      setIsUsersLoading(false);
    }
  }, [isAdmin, usersPage, usersSearch, usersRoleFilter, usersSortBy, usersSortOrder]);

  // Fetch Activity Data
  const fetchActivity = useCallback(async () => {
    if (!isAdmin) return;
    setIsActivityLoading(true);
    setGlobalError(null);
    try {
      const data = await adminGetActivity({
        page: activityPage,
        limit: 20,
        eventType: activityEventType,
        search: activitySearch,
      });
      setActivityData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to fetch security activity');
    } finally {
      setIsActivityLoading(false);
    }
  }, [isAdmin, activityPage, activityEventType, activitySearch]);

  // Load appropriate data when tab or filters change
  useEffect(() => {
    if (!isAdmin) return;
    if (currentSubTab === 'overview') {
      fetchOverview();
    } else if (currentSubTab === 'users') {
      fetchUsers();
    } else if (currentSubTab === 'activity') {
      fetchActivity();
    }
  }, [currentSubTab, fetchOverview, fetchUsers, fetchActivity, isAdmin]);

  // Periodic polling every 30 seconds for real-time monitoring
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => {
      if (currentSubTab === 'overview') fetchOverview();
      else if (currentSubTab === 'users') fetchUsers();
      else if (currentSubTab === 'activity') fetchActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentSubTab, fetchOverview, fetchUsers, fetchActivity, isAdmin]);

  // Open user detail modal and fetch user-specific activity from MongoDB
  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
    setIsUserDetailLoading(true);
    try {
      const detail = await adminGetUserDetail(user._id || user.id || '');
      setSelectedUser(detail.user);
      setUserSpecificActivity(detail.recentActivity || []);
    } catch (err) {
      setUserSpecificActivity([]);
    } finally {
      setIsUserDetailLoading(false);
    }
  };

  const handleUserRoleUpdated = (updatedUser: AdminUser) => {
    setSelectedUser(updatedUser);
    // Refresh current view lists
    if (currentSubTab === 'users') fetchUsers();
    if (currentSubTab === 'overview') fetchOverview();
  };

  const handleManualRefresh = () => {
    if (currentSubTab === 'overview') fetchOverview();
    else if (currentSubTab === 'users') fetchUsers();
    else if (currentSubTab === 'activity') fetchActivity();
  };

  // If user is not authenticated as admin, show enterprise Access Denied screen
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
          Administrative Privileges Required
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 max-w-md mt-2">
          This area is restricted to authenticated users with an explicit administrator role (<code className="px-1.5 py-0.5 bg-zinc-100 rounded text-rose-600 font-semibold">role: &quot;admin&quot;</code>). Backend security verification returned 403 Forbidden.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  const lastUpdatedDisplay =
    secondsAgo <= 1 ? 'Just now' : `${secondsAgo}s ago`;

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-10rem)] animate-fade-in">
      {/* Admin Left Navigation Sidebar */}
      <aside className="w-full md:w-60 shrink-0 bg-white rounded-2xl border border-zinc-200/80 p-3 shadow-2xs flex flex-col justify-between">
        <div className="space-y-1">
          {/* Admin Header Tag */}
          <div className="px-3 py-3 border-b border-zinc-100 mb-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-2xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 block leading-tight">
                Admin Console
              </span>
              <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                Control Plane
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <button
            onClick={() => setCurrentSubTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentSubTab === 'overview'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setCurrentSubTab('users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentSubTab === 'users'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Users & Accounts</span>
          </button>

          <button
            onClick={() => setCurrentSubTab('activity')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentSubTab === 'activity'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>Security Activity</span>
          </button>
        </div>

        {/* Bottom Navigation Utilities */}
        <div className="pt-3 border-t border-zinc-100 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to DayLedger</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Body */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4">
        {/* Top Bar Header */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 px-5 py-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb & Section Name */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              Administration
            </span>
            <span className="text-zinc-300">/</span>
            <span className="text-xs font-bold text-zinc-900 capitalize">
              {currentSubTab === 'overview'
                ? 'System Overview'
                : currentSubTab === 'users'
                ? 'User Directory'
                : 'Security Audit Logs'}
            </span>
          </div>

          {/* Top Bar Actions & Admin Badge */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live MongoDB: {lastUpdatedDisplay}</span>
              <button
                onClick={handleManualRefresh}
                className="ml-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                title="Refresh now"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Administrator Account Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <Avatar name={currentUser.name} size="sm" />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-zinc-900 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-semibold text-purple-700 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> Administrator
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{globalError}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* View Switcher */}
        {currentSubTab === 'overview' && (
          <AdminOverviewView
            stats={overviewStats}
            isLoading={isOverviewLoading}
            onNavigateTab={(tab) => setCurrentSubTab(tab)}
            onSelectUser={handleSelectUser}
            onRefresh={fetchOverview}
          />
        )}

        {currentSubTab === 'users' && (
          <AdminUsersView
            data={usersData}
            isLoading={isUsersLoading}
            currentPage={usersPage}
            searchQuery={usersSearch}
            roleFilter={usersRoleFilter}
            sortBy={usersSortBy}
            sortOrder={usersSortOrder}
            currentAdminId={currentUser.id}
            onPageChange={(page) => setUsersPage(page)}
            onSearchChange={(query) => {
              setUsersSearch(query);
              setUsersPage(1);
            }}
            onRoleFilterChange={(role) => {
              setUsersRoleFilter(role);
              setUsersPage(1);
            }}
            onSortChange={(field) => {
              if (usersSortBy === field) {
                setUsersSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setUsersSortBy(field);
                setUsersSortOrder('desc');
              }
              setUsersPage(1);
            }}
            onSelectUser={handleSelectUser}
            onRefresh={fetchUsers}
            onUserRoleUpdated={handleUserRoleUpdated}
          />
        )}

        {currentSubTab === 'activity' && (
          <AdminActivityView
            data={activityData}
            isLoading={isActivityLoading}
            currentPage={activityPage}
            eventTypeFilter={activityEventType}
            searchQuery={activitySearch}
            lastUpdatedStr={`Last synced: ${lastUpdatedDisplay}`}
            onPageChange={(page) => setActivityPage(page)}
            onFilterChange={(type) => {
              setActivityEventType(type);
              setActivityPage(1);
            }}
            onSearchChange={(search) => {
              setActivitySearch(search);
              setActivityPage(1);
            }}
            onRefresh={fetchActivity}
          />
        )}
      </div>

      {/* User Detail & History Modal */}
      <AdminUserDetailModal
        user={selectedUser}
        activity={userSpecificActivity}
        isOpen={isDetailModalOpen}
        isLoading={isUserDetailLoading}
        currentAdminId={currentUser.id}
        onClose={() => setIsDetailModalOpen(false)}
        onUserUpdated={handleUserRoleUpdated}
      />
    </div>
  );
};
