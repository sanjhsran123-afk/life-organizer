import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  CheckSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  AlertCircle,
  Users,
} from 'lucide-react';

export const StatCards: React.FC = () => {
  const { stats, profile, setActiveTab } = useApp();

  const cards = [
    {
      id: 'tasks',
      title: "Today's Tasks",
      value: stats.tasksTodayCount,
      subtext: `${stats.tasksCompletedCount} completed • ${stats.tasksPendingCount} pending`,
      badge: stats.tasksOverdueCount > 0 ? `${stats.tasksOverdueCount} overdue` : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
      icon: CheckSquare,
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200/60 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/50',
      tab: 'tasks' as const,
    },
    {
      id: 'lent',
      title: 'Money Lent',
      value: formatCurrency(stats.totalLent, profile.currency),
      subtext: `${formatCurrency(stats.totalReceived, profile.currency)} received back`,
      badge: 'Active loans',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
      icon: ArrowUpRight,
      iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200/60 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/50',
      tab: 'money' as const,
    },
    {
      id: 'borrowed',
      title: 'Money Borrowed',
      value: formatCurrency(stats.totalBorrowed, profile.currency),
      subtext: stats.totalPendingBorrowed > 0 ? `${formatCurrency(stats.totalPendingBorrowed, profile.currency)} left to repay` : 'Fully cleared',
      badge: stats.peopleOwedCount > 0 ? `${stats.peopleOwedCount} people` : undefined,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
      icon: ArrowDownLeft,
      iconColor: 'text-amber-800 bg-amber-50 border-amber-200/60 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/50',
      tab: 'money' as const,
    },
    {
      id: 'pending',
      title: 'Money Pending',
      value: formatCurrency(stats.totalPending, profile.currency),
      subtext: `To receive from ${stats.peopleOwingCount} ${stats.peopleOwingCount === 1 ? 'person' : 'people'}`,
      badge: stats.peopleOwingCount > 0 ? 'Pending return' : 'Cleared',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
      icon: Clock,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-200/60 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900/50',
      tab: 'people' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => setActiveTab(card.tab)}
            className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-card transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${card.iconColor}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {card.value}
              </span>
              {card.badge && (
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 truncate">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};
