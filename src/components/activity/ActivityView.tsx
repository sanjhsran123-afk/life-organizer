import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import {
  Activity,
  CheckSquare,
  WalletCards,
  FileText,
  UserPlus,
  Calendar,
  Clock,
} from 'lucide-react';
import { formatRelativeDate, formatDate } from '../../utils/formatters';

type ActivityFilter = 'all' | 'task' | 'money' | 'note' | 'person';

export const ActivityView: React.FC = () => {
  const { activities } = useApp();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter((a) => a.type === filter);
  }, [activities, filter]);

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, typeof activities> = {};
    filteredActivities.forEach((act) => {
      const dateKey = act.timestamp ? act.timestamp.split('T')[0] : 'Unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(act);
    });
    return groups;
  }, [filteredActivities]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-4 h-4 text-indigo-600" />;
      case 'money':
        return <WalletCards className="w-4 h-4 text-emerald-600" />;
      case 'note':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'person':
        return <UserPlus className="w-4 h-4 text-sky-600" />;
      default:
        return <Activity className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'bg-indigo-50 border-indigo-200/60';
      case 'money':
        return 'bg-emerald-50 border-emerald-200/60';
      case 'note':
        return 'bg-purple-50 border-purple-200/60';
      case 'person':
        return 'bg-sky-50 border-sky-200/60';
      default:
        return 'bg-zinc-50 border-zinc-200/60';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Activity Timeline</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Audit trail of tasks completed, repayments recorded, notes updated, and contacts added.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200/80">
        {(
          [
            { id: 'all', label: 'All Activities' },
            { id: 'money', label: 'Financial Records' },
            { id: 'task', label: 'Tasks' },
            { id: 'note', label: 'Notes' },
            { id: 'person', label: 'Contacts' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              filter === tab.id
                ? 'bg-zinc-900 text-white font-semibold shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-6 h-6" />}
          title="No activity recorded"
          description="Your actions will automatically populate this chronological audit log."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 px-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{formatRelativeDate(dateKey)}</span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  ({formatDate(dateKey)})
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs divide-y divide-zinc-100 overflow-hidden">
                {items.map((act) => {
                  let timeStr = '';
                  try {
                    timeStr = new Date(act.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  } catch {
                    timeStr = '';
                  }

                  return (
                    <div
                      key={act.id}
                      className="flex items-start gap-3.5 p-3.5 sm:px-4 hover:bg-zinc-50/60 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getBgColor(
                          act.type
                        )}`}
                      >
                        {getIcon(act.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-900">
                            {act.action}
                          </span>
                          {timeStr && (
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-zinc-300" />
                              {timeStr}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
