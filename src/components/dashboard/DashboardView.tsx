import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCards } from './StatCards';
import { TodayTasksWidget } from './TodayTasksWidget';
import { MoneyOverviewWidget } from './MoneyOverviewWidget';
import { PendingDebtsWidget } from './PendingDebtsWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';
import { RecentNotesWidget } from './RecentNotesWidget';
import { Button } from '../common/Button';
import {
  CheckSquare,
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  FileText,
} from 'lucide-react';
import { getGreeting } from '../../utils/formatters';

export const DashboardView: React.FC = () => {
  const {
    profile,
    openTaskModal,
    openTransactionModal,
    openPersonModal,
    openNoteModal,
  } = useApp();

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200/70 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            {greeting}, {profile.name} <span className="inline-block animate-bounce">👋</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Here’s what’s happening with your agenda, tasks, and money today.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none sm:flex-wrap">
          <Button
            size="sm"
            variant="primary"
            icon={<CheckSquare className="w-3.5 h-3.5" />}
            onClick={() => openTaskModal()}
          >
            Add Task
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />}
            onClick={() => openTransactionModal({ initialType: 'LENT' })}
          >
            Lend Money
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />}
            onClick={() => openTransactionModal({ initialType: 'BORROWED' })}
          >
            Borrow Money
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => openPersonModal()}
          >
            Add Person
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<FileText className="w-3.5 h-3.5 text-purple-600" />}
            onClick={() => openNoteModal()}
          >
            Add Note
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <StatCards />

      {/* Primary 2-Column Grid: Tasks & Money Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayTasksWidget />
        <MoneyOverviewWidget />
      </div>

      {/* Secondary 3-Column Grid: Pending Debts, Recent Activity & Recent Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PendingDebtsWidget />
        <ActivityFeedWidget />
        <RecentNotesWidget />
      </div>
    </div>
  );
};
