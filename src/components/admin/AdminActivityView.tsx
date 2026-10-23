import React from 'react';
import {
  Activity,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  UserPlus,
  LogIn,
  LogOut,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AdminActivityResponse } from '../../types';

interface AdminActivityViewProps {
  data: AdminActivityResponse | null;
  isLoading: boolean;
  currentPage: number;
  eventTypeFilter: string;
  searchQuery: string;
  lastUpdatedStr: string;
  onPageChange: (page: number) => void;
  onFilterChange: (type: string) => void;
  onSearchChange: (search: string) => void;
  onRefresh: () => void;
}

export const AdminActivityView: React.FC<AdminActivityViewProps> = ({
  data,
  isLoading,
  currentPage,
  eventTypeFilter,
  searchQuery,
  lastUpdatedStr,
  onPageChange,
  onFilterChange,
  onSearchChange,
  onRefresh,
}) => {
  const activities = data?.activities || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'SIGNUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sign Up</span>
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <LogIn className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Login</span>
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <LogOut className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Explicit Logout</span>
          </span>
        );
      case 'SESSION_EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Session Expired</span>
          </span>
        );
      case 'ROLE_CHANGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Role Changed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            Account Activity & Audit Log ({total})
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Immutable server-confirmed authentication events in MongoDB collection <code>authactivities</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
            {lastUpdatedStr}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Refresh activity logs"
            aria-label="Refresh activity logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by user email, name, or event details..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 text-base sm:text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-600 dark:placeholder:text-zinc-400 min-h-[42px] sm:min-h-0"
          />
        </div>

        {/* Filter by Event Type */}
        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-3 py-2 sm:py-1.5 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 min-h-[42px] sm:min-h-0">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <select
            value={eventTypeFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-transparent border-none text-base sm:text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer w-full"
          >
            <option value="all">All Events</option>
            <option value="SIGNUP">Sign-ups Only</option>
            <option value="LOGIN">Logins Only</option>
            <option value="LOGOUT">Explicit Logouts</option>
            <option value="SESSION_EXPIRED">Session Expirations</option>
            <option value="ROLE_CHANGED">Role Changes</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Fetching activity records from MongoDB...</span>
          </div>
        )}

        {!isLoading && activities.length === 0 && (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No activity events found</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
              {searchQuery || eventTypeFilter !== 'all'
                ? 'Try adjusting your search criteria or changing the event type filter.'
                : 'No activities have been recorded in MongoDB yet.'}
            </p>
          </div>
        )}

        {!isLoading && activities.length > 0 && (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {activities.map((act) => (
              <div
                key={act._id}
                className="p-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="shrink-0 mt-0.5 sm:mt-0">
                    {getEventBadge(act.eventType)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {act.userName}
                      </span>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                        &lt;{act.userEmail}&gt;
                      </span>
                      {act.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Confirmed
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          Failed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                      {act.details || `Event ${act.eventType} completed`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono mt-1">
                      <span>IP: {act.ipAddress}</span>
                      <span>•</span>
                      <span className="truncate max-w-xs">{act.userAgent}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 self-start sm:self-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">
                    {formatDateTime(act.timestamp)}
                  </span>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    Server recorded
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Page {currentPage} of {totalPages} ({total} events logged)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 text-zinc-600 dark:text-zinc-400 disabled:text-zinc-300 dark:disabled:text-zinc-600 disabled:cursor-not-allowed hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 text-zinc-600 dark:text-zinc-400 disabled:text-zinc-300 dark:disabled:text-zinc-600 disabled:cursor-not-allowed hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
