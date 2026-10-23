import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  CheckSquare,
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  FileText,
  ChevronRight,
} from 'lucide-react';

export const QuickAddMenu: React.FC = () => {
  const {
    quickAddOpen,
    setQuickAddOpen,
    openTaskModal,
    openTransactionModal,
    openPersonModal,
    openNoteModal,
  } = useApp();

  const options = [
    {
      id: 'task',
      title: 'New Task',
      description: 'Add an action item, homework, or project milestone',
      icon: CheckSquare,
      color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
      action: () => {
        setQuickAddOpen(false);
        openTaskModal();
      },
    },
    {
      id: 'lend',
      title: 'Lend Money',
      description: 'Track money you gave to someone and expected return date',
      icon: ArrowUpRight,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
      action: () => {
        setQuickAddOpen(false);
        openTransactionModal({ initialType: 'LENT' });
      },
    },
    {
      id: 'borrow',
      title: 'Borrow Money',
      description: 'Track money you received and promised payback date',
      icon: ArrowDownLeft,
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
      action: () => {
        setQuickAddOpen(false);
        openTransactionModal({ initialType: 'BORROWED' });
      },
    },
    {
      id: 'person',
      title: 'Add Person / Contact',
      description: 'Create a new contact profile to manage their financial ledger',
      icon: UserPlus,
      color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60',
      action: () => {
        setQuickAddOpen(false);
        openPersonModal();
      },
    },
    {
      id: 'note',
      title: 'Create Note',
      description: 'Jot down an idea, reminder, or context for a transaction',
      icon: FileText,
      color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
      action: () => {
        setQuickAddOpen(false);
        openNoteModal();
      },
    },
  ];

  return (
    <Modal
      isOpen={quickAddOpen}
      onClose={() => setQuickAddOpen(false)}
      title="Create New"
      subtitle="What would you like to record in DayLedger?"
      maxWidth="md"
    >
      <div className="space-y-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={opt.action}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60 bg-white dark:bg-zinc-850/60 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${opt.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {opt.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{opt.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
