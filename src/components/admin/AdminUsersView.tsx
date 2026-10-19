import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Phone,
  Mail,
  User,
  ExternalLink,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { AdminUser, AdminUsersResponse } from '../../types';
import { adminExportUsers, adminUpdateUserRole } from '../../api';

interface AdminUsersViewProps {
  data: AdminUsersResponse | null;
  isLoading: boolean;
  currentPage: number;
  searchQuery: string;
  roleFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  currentAdminId?: string;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onRoleFilterChange: (role: string) => void;
  onSortChange: (sortBy: string) => void;
  onSelectUser: (user: AdminUser) => void;
  onRefresh: () => void;
  onUserRoleUpdated: (updatedUser: AdminUser) => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  data,
  isLoading,
  currentPage,
  searchQuery,
  roleFilter,
  sortBy,
  sortOrder,
  currentAdminId,
  onPageChange,
  onSearchChange,
  onRoleFilterChange,
  onSortChange,
  onSelectUser,
  onRefresh,
  onUserRoleUpdated,
}) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(format);
    try {
      await adminExportUsers(format);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  const handleQuickRoleToggle = async (e: React.MouseEvent, user: AdminUser) => {
    e.stopPropagation();
    const isSelf = currentAdminId && (user._id === currentAdminId || user.id === currentAdminId);
    if (isSelf) {
      alert('Security policy: You cannot demote your own administrator account.');
      return;
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg =
      newRole === 'admin'
        ? `Promote ${user.name} to Administrator?`
        : `Demote ${user.name} to regular user?`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingRoleId(user._id || user.id || '');
    try {
      const updated = await adminUpdateUserRole(user._id || user.id || '', newRole);
      onUserRoleUpdated(updated);
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            User Accounts ({total})
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Read directly from MongoDB <code>dayledger.users</code> collection. Passwords strictly redacted.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200/80 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Refresh user list"
            aria-label="Refresh user accounts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="px-3 py-2 bg-white border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Export non-sensitive fields to CSV"
          >
            {exporting === 'csv' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="px-3 py-2 bg-white border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Export non-sensitive fields to JSON"
          >
            {exporting === 'json' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, or phone number..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 text-base sm:text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 placeholder:text-zinc-600 min-h-[42px] sm:min-h-0"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-2 sm:py-1.5 rounded-xl text-xs text-zinc-700 min-h-[42px] sm:min-h-0">
            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="bg-transparent border-none text-base sm:text-xs font-medium text-zinc-800 focus:outline-hidden cursor-pointer w-full"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="user">Standard Users</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-2 sm:py-1.5 rounded-xl text-xs text-zinc-700 min-h-[42px] sm:min-h-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent border-none text-base sm:text-xs font-medium text-zinc-800 focus:outline-hidden cursor-pointer w-full"
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Full Name</option>
              <option value="age">Age</option>
              <option value="role">Role</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-xs text-zinc-600 flex items-center justify-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Retrieving accounts from MongoDB...</span>
          </div>
        )}

        {!isLoading && users.length === 0 && (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="text-sm font-semibold text-zinc-800">No user accounts found</p>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search criteria or clearing active filters.'
                : 'No users currently exist in MongoDB.'}
            </p>
          </div>
        )}

        {!isLoading && users.length > 0 && (
          <>
            {/* Mobile Touch-Friendly User Cards (Phones) */}
            <div className="block sm:hidden divide-y divide-zinc-100">
              {users.map((u) => {
                const isCurrentAdmin =
                  currentAdminId && (u._id === currentAdminId || u.id === currentAdminId);

                return (
                  <div
                    key={u._id}
                    onClick={() => onSelectUser(u)}
                    className="p-4 hover:bg-zinc-50/70 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-900 block truncate">
                            {u.name}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate block">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase shrink-0 ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <>
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </>
                        ) : (
                          'User'
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-zinc-600">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Phone</span>
                        <span className="font-medium text-zinc-800 truncate block">{u.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Age & DOB</span>
                        <span className="font-medium text-zinc-800">
                          {u.currentAge !== undefined ? `${u.currentAge} yrs` : `${u.age} yrs`}
                          {u.dateOfBirth ? ` (${u.dateOfBirth})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                      <span>Joined: {formatJoinedDate(u.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        {!isCurrentAdmin && (
                          <button
                            onClick={(e) => handleQuickRoleToggle(e, u)}
                            disabled={updatingRoleId === u._id}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors cursor-pointer"
                          >
                            {updatingRoleId === u._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : u.role === 'admin' ? (
                              'Demote'
                            ) : (
                              'Make Admin'
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => onSelectUser(u)}
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-lg cursor-pointer"
                          aria-label="View user profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Data Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/75 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 sm:px-6">User</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Age & DOB</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => {
                  const isCurrentAdmin =
                    currentAdminId && (u._id === currentAdminId || u.id === currentAdminId);

                  return (
                    <tr
                      key={u._id}
                      onClick={() => onSelectUser(u)}
                      className="hover:bg-zinc-50/70 transition-colors cursor-pointer group"
                    >
                      {/* User Column */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors block truncate">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-zinc-600 truncate block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone Column */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-zinc-700">
                          <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{u.phone || '—'}</span>
                        </div>
                      </td>

                      {/* Age & DOB Column */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-semibold text-zinc-800">
                            {u.currentAge !== undefined ? `${u.currentAge} yrs` : `${u.age} yrs`}
                          </span>
                          <span className="text-[11px] text-zinc-600 block">
                            DOB: {u.dateOfBirth || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </>
                          ) : (
                            'User'
                          )}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 text-zinc-600">
                        {formatJoinedDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isCurrentAdmin && (
                            <button
                              onClick={(e) => handleQuickRoleToggle(e, u)}
                              disabled={updatingRoleId === u._id}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                              title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            >
                              {updatingRoleId === u._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : u.role === 'admin' ? (
                                'Demote'
                              ) : (
                                'Make Admin'
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => onSelectUser(u)}
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="View Full Profile & History"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

        {/* Pagination bar */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Page {currentPage} of {totalPages} ({total} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 text-zinc-600 disabled:text-zinc-300 disabled:cursor-not-allowed hover:bg-zinc-200/50 rounded-lg transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 text-zinc-600 disabled:text-zinc-300 disabled:cursor-not-allowed hover:bg-zinc-200/50 rounded-lg transition-colors cursor-pointer"
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
