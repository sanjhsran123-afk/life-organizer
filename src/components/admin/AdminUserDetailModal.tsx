import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { AdminUser, AdminActivityItem } from '../../types';
import { adminUpdateUserRole } from '../../api';

interface AdminUserDetailModalProps {
  user: AdminUser | null;
  activity: AdminActivityItem[];
  isOpen: boolean;
  isLoading: boolean;
  currentAdminId?: string;
  onClose: () => void;
  onUserUpdated: (updatedUser: AdminUser) => void;
}

export const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({
  user,
  activity,
  isOpen,
  isLoading,
  currentAdminId,
  onClose,
  onUserUpdated,
}) => {
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSelf = currentAdminId && (user._id === currentAdminId || user.id === currentAdminId);

  const handleRoleToggle = async () => {
    if (isSelf) {
      setRoleError('Security policy: You cannot demote your own administrator account.');
      return;
    }
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg =
      newRole === 'admin'
        ? `Are you sure you want to promote ${user.name} to Administrator? They will have full access to view users and security audit logs.`
        : `Are you sure you want to revoke Administrator access from ${user.name}?`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingRole(true);
    setRoleError(null);
    try {
      const updated = await adminUpdateUserRole(user._id || user.id || '', newRole);
      onUserUpdated(updated);
    } catch (err: any) {
      setRoleError(err.message || 'Failed to update user role');
    } finally {
      setUpdatingRole(false);
    }
  };

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sign Up
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            <Clock className="w-3 h-3 text-indigo-600" /> Login
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700">
            <Clock className="w-3 h-3 text-zinc-500" /> Explicit Logout
          </span>
        );
      case 'SESSION_EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Session Expired
          </span>
        );
      case 'ROLE_CHANGED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <ShieldAlert className="w-3 h-3 text-purple-600" /> Role Changed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-pop-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
      >
        {/* Mobile Pull Handle */}
        <div className="sm:hidden w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 id="user-detail-title" className="text-base sm:text-lg font-bold text-zinc-900 leading-tight truncate">
                {user.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">{user.email}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {user.role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </>
                  ) : (
                    'User'
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50 rounded-xl transition-colors cursor-pointer"
            aria-label="Close user details modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {roleError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{roleError}</span>
            </div>
          )}

          {/* Stored Profile Information */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Stored User Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-zinc-50/80 p-4 rounded-xl border border-zinc-200/80">
              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                  <User className="w-3 h-3" /> Full Name
                </span>
                <span className="text-sm font-semibold text-zinc-900 mt-0.5">{user.name}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </span>
                <span className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">{user.email}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </span>
                <span className="text-sm font-semibold text-zinc-900 mt-0.5">{user.phone || 'Not provided'}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date of Birth & Age
                </span>
                <span className="text-sm font-semibold text-zinc-900 mt-0.5">
                  {user.dateOfBirth || 'N/A'}{' '}
                  <span className="text-xs text-zinc-600 font-normal">
                    ({user.currentAge !== undefined ? `${user.currentAge} yrs (current)` : `${user.age} yrs`})
                  </span>
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Role & Permissions
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-zinc-900 capitalize">{user.role}</span>
                  {!isSelf ? (
                    <button
                      onClick={handleRoleToggle}
                      disabled={updatingRole}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      {updatingRole && <Loader2 className="w-3 h-3 animate-spin" />}
                      {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-600 italic">(Current Logged-in Admin)</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Account Created
                </span>
                <span className="text-sm font-semibold text-zinc-900 mt-0.5">
                  {formatDateTime(user.createdAt)}
                </span>
              </div>
            </div>
          </section>

          {/* Account Activity Timeline */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Recent User Activity ({activity.length})
              </h3>
              <span className="text-[11px] text-zinc-600">MongoDB Source of Truth</span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-zinc-600 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading activity history from MongoDB...</span>
              </div>
            ) : activity.length === 0 ? (
              <div className="p-6 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600">
                No server activity records found for this account.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {activity.map((act) => (
                  <div
                    key={act._id}
                    className="p-3 bg-white rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {getEventBadge(act.eventType)}
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-zinc-800">
                          {act.details || act.eventType}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          IP: {act.ipAddress} • {act.userAgent.substring(0, 35)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-600 whitespace-nowrap self-start sm:self-center">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Security & Non-Disclosure Notice */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Security & Privacy Protocol Active</p>
              <p className="text-[10.5px] text-amber-700 mt-0.5">
                Passwords, password hashes, and authentication tokens are strictly protected by server-side query projection (<code className="px-1 py-0.5 bg-amber-100 rounded">.select('-password')</code>) and are never transmitted to client interfaces or admin export files.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end bg-zinc-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
