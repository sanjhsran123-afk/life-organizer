import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, X, AlertTriangle, AlertCircle, Info, Calendar } from 'lucide-react';
import { Button } from '../common/Button';

export const NotificationDrawer: React.FC = () => {
  const {
    notificationOpen,
    setNotificationOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification,
    setActiveTab,
  } = useApp();

  if (!notificationOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/30 backdrop-blur-[2px] transition-opacity"
        onClick={() => setNotificationOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 h-full shadow-popover border-l border-zinc-200/90 dark:border-zinc-800 z-10 flex flex-col animate-slide-down">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications & Alerts</h3>
          </div>
          <button
            onClick={() => setNotificationOpen(false)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        {notifications.length > 0 && (
          <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              {notifications.filter((n) => !n.isRead).length} unread updates
            </span>
            <button
              onClick={markAllNotificationsAsRead}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 mx-auto flex items-center justify-center mb-2">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">All caught up!</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[200px] mx-auto">
                No pending alerts, overdue payments, or overdue tasks right now.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const iconMap = {
                alert: <AlertCircle className="w-4 h-4 text-rose-600" />,
                warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
                info: <Calendar className="w-4 h-4 text-indigo-600" />,
                success: <Info className="w-4 h-4 text-emerald-600" />,
              };

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    if (notif.linkTab) {
                      setActiveTab(notif.linkTab);
                      setNotificationOpen(false);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group relative ${
                    notif.isRead
                      ? 'bg-white dark:bg-zinc-850 border-zinc-200/70 dark:border-zinc-800 opacity-75'
                      : 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs'
                  } hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{iconMap[notif.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-100/80 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">
                      View details →
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setNotificationOpen(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
