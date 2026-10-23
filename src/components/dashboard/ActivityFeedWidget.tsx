import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Activity, CheckSquare, WalletCards, FileText, UserPlus } from 'lucide-react';
import { formatRelativeDate } from '../../utils/formatters';

export const ActivityFeedWidget: React.FC = () => {
  const { activities, setActiveTab } = useApp();

  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'money':
        return <WalletCards className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'person':
        return <UserPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Recent Activity</h3>
        </div>
        <button
          onClick={() => setActiveTab('activity')}
          className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium cursor-pointer"
        >
          View all →
        </button>
      </div>

      <div className="flex-1 py-3 space-y-3">
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No recent activity recorded yet.
          </div>
        ) : (
          activities.slice(0, 5).map((act) => (
            <div key={act.id} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-tight truncate">
                  {act.description}
                </p>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                  {formatRelativeDate(act.timestamp.split('T')[0])}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>Automatic chronological audit log</span>
      </div>
    </Card>
  );
};
