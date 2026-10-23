import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate, isOverdue } from '../../utils/formatters';
import { Users, CheckCircle2, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '../common/Button';

export const PendingDebtsWidget: React.FC = () => {
  const {
    people,
    transactions,
    openPersonDetail,
    openPaymentModal,
    openPersonModal,
    profile,
    getPersonStats,
    setActiveTab,
  } = useApp();

  // Find people who have active pending balances
  const peopleWithDues = people
    .map((p) => {
      const stats = getPersonStats(p.id);
      return {
        person: p,
        stats,
      };
    })
    .filter((item) => item.stats.netBalance !== 0)
    .sort((a, b) => Math.abs(b.stats.netBalance) - Math.abs(a.stats.netBalance));

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Pending Settlements
          </h3>
          <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-medium">
            {peopleWithDues.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="ghost"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => openPersonModal()}
          >
            Add Contact
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setActiveTab('people')}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            View all →
          </Button>
        </div>
      </div>

      <div className="flex-1 py-3 space-y-2.5">
        {peopleWithDues.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-2xl block mb-1">🤝</span>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">All accounts settled!</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              No outstanding dues or debts with any contacts.
            </p>
          </div>
        ) : (
          peopleWithDues.slice(0, 5).map(({ person, stats }) => {
            const owesMe = stats.netBalance > 0;
            const amount = Math.abs(stats.netBalance);

            // Find an open transaction to allow 1-click payment
            const openTx = transactions.find(
              (t) => t.personId === person.id && t.amount > t.paidAmount
            );

            return (
              <div
                key={person.id}
                className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-all shadow-2xs group"
              >
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  onClick={() => openPersonDetail(person.id)}
                >
                  <Avatar name={person.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {person.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {owesMe ? 'Owes you' : 'You owe'} {formatCurrency(amount, profile.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block ${
                        owesMe ? 'text-amber-800 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(amount, profile.currency)}
                    </span>
                    <Badge
                      size="xs"
                      variant={owesMe ? 'warning' : 'danger'}
                      className="mt-0.5"
                    >
                      {owesMe ? 'Pending' : 'To Pay'}
                    </Badge>
                  </div>

                  {openTx && (
                    <button
                      onClick={() => openPaymentModal(openTx)}
                      className="p-2 sm:p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Quick Settle / Record payment"
                      aria-label="Record payment"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 sm:text-zinc-400 dark:sm:text-zinc-500 sm:hover:text-emerald-600 dark:sm:hover:text-emerald-400" />
                    </button>
                  )}

                  <button
                    onClick={() => openPersonDetail(person.id)}
                    className="p-2 sm:p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                    title="View contact profile"
                    aria-label="View contact profile"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>Click contact to view transaction history</span>
        <button
          onClick={() => setActiveTab('people')}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
        >
          Manage people →
        </button>
      </div>
    </Card>
  );
};
