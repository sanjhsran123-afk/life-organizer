import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  WalletCards,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { MoneyTransaction, TransactionType, TransactionStatus } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  isOverdue,
  getDaysOverdue,
} from '../../utils/formatters';

type MoneyFilter = 'all' | 'lent' | 'borrowed' | 'pending' | 'overdue' | 'paid';

export const MoneyView: React.FC = () => {
  const {
    transactions,
    stats,
    profile,
    openTransactionModal,
    openPaymentModal,
    openPersonDetail,
    deleteTransaction,
  } = useApp();

  const [filter, setFilter] = useState<MoneyFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [txToDelete, setTxToDelete] = useState<MoneyTransaction | null>(null);

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    let result = [...transactions];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.personName.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q)
      );
    }

    if (filter === 'lent') {
      result = result.filter((t) => t.type === 'LENT');
    } else if (filter === 'borrowed') {
      result = result.filter((t) => t.type === 'BORROWED');
    } else if (filter === 'pending') {
      result = result.filter((t) => t.amount > t.paidAmount);
    } else if (filter === 'overdue') {
      result = result.filter(
        (t) => t.amount > t.paidAmount && isOverdue(t.expectedReturnDate)
      );
    } else if (filter === 'paid') {
      result = result.filter((t) => t.amount <= t.paidAmount);
    }

    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Sort by date descending
    result.sort((a, b) => b.date.localeCompare(a.date));

    return result;
  }, [transactions, search, filter, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            Personal Money & Debt Ledger
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track money lent to friends, borrowed funds, and incoming repayments.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="primary"
            icon={<ArrowUpRight className="w-4 h-4 text-emerald-200" />}
            onClick={() => openTransactionModal({ initialType: 'LENT' })}
            className="w-full sm:w-auto"
          >
            Lend Money
          </Button>

          <Button
            variant="outline"
            icon={<ArrowDownLeft className="w-4 h-4 text-amber-700" />}
            onClick={() => openTransactionModal({ initialType: 'BORROWED' })}
            className="w-full sm:w-auto"
          >
            Borrow Money
          </Button>
        </div>
      </div>

      {/* Top 4 Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Total Lent
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mt-2">
            {formatCurrency(stats.totalLent, profile.currency)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Given to other people</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Total Borrowed
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mt-2">
            {formatCurrency(stats.totalBorrowed, profile.currency)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            {stats.totalPendingBorrowed > 0
              ? `${formatCurrency(stats.totalPendingBorrowed, profile.currency)} to return`
              : 'Cleared'}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Received Back
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 mt-2">
            {formatCurrency(stats.totalReceived, profile.currency)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Recovered loans</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Money Pending
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-amber-800 mt-2">
            {formatCurrency(stats.totalPending, profile.currency)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Awaiting repayment</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200/80">
          {(
            [
              { id: 'all', label: 'All Transactions' },
              { id: 'lent', label: 'Lent Money' },
              { id: 'borrowed', label: 'Borrowed Money' },
              { id: 'pending', label: 'Pending Dues' },
              { id: 'overdue', label: 'Overdue Dues' },
              { id: 'paid', label: 'Settled & Paid' },
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3 sm:top-2.5" />
            <input
              type="text"
              placeholder="Search by person name, reason, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-zinc-200/90 rounded-xl text-base sm:text-xs pl-9 pr-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-zinc-200/90 rounded-xl text-base sm:text-xs px-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 text-zinc-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Personal">Personal</option>
            <option value="Friends">Friends</option>
            <option value="Family">Family</option>
            <option value="Travel">Travel</option>
            <option value="Food">Food</option>
            <option value="College">College</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTxs.length === 0 ? (
        <EmptyState
          icon={<WalletCards className="w-6 h-6" />}
          title="No transactions found"
          description="Record money lent or borrowed to keep a clear ledger of all mutual balances."
          actionLabel="+ Record Lent Money"
          onAction={() => openTransactionModal({ initialType: 'LENT' })}
        />
      ) : (
        <div className="space-y-3">
          {filteredTxs.map((tx) => {
            const isLent = tx.type === 'LENT';
            const remaining = Math.max(0, tx.amount - tx.paidAmount);
            const isSettled = remaining === 0;
            const overdue = !isSettled && isOverdue(tx.expectedReturnDate);
            const daysOverdue = overdue ? getDaysOverdue(tx.expectedReturnDate) : 0;

            const progressPct = Math.round((tx.paidAmount / tx.amount) * 100);

            return (
              <div
                key={tx.id}
                className={`p-4 bg-white rounded-2xl border transition-all duration-150 shadow-2xs hover:border-zinc-300 ${
                  isSettled ? 'border-zinc-200/60 bg-zinc-50/40' : 'border-zinc-200/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Contact + Type + Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isLent
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                      }`}
                    >
                      {isLent ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPersonDetail(tx.personId)}
                          className="text-sm font-bold text-zinc-900 hover:text-indigo-600 transition-colors cursor-pointer text-left truncate"
                        >
                          {tx.personName}
                        </button>
                        <Badge size="xs" variant={isLent ? 'success' : 'warning'}>
                          {isLent ? 'Lent' : 'Borrowed'}
                        </Badge>
                        <Badge size="xs" variant="neutral">
                          {tx.category}
                        </Badge>
                      </div>

                      {tx.notes && (
                        <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                          "{tx.notes}"
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mt-2">
                        <span>Given on: {formatDate(tx.date)}</span>
                        <span>•</span>
                        <span>
                          Expected:{' '}
                          <strong className={overdue ? 'text-rose-600 font-semibold' : 'text-zinc-700'}>
                            {formatDate(tx.expectedReturnDate)}
                          </strong>
                        </span>
                        {overdue && (
                          <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amounts & Settlement Actions */}
                  <div className="flex flex-col sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    <div className="flex items-baseline justify-between sm:block sm:text-right w-full sm:w-auto">
                      <div className="text-base sm:text-lg font-bold text-zinc-900">
                        {formatCurrency(tx.amount, profile.currency)}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {isSettled ? (
                          <span className="text-emerald-600 font-semibold">Fully Settled</span>
                        ) : tx.paidAmount > 0 ? (
                          <span className="text-purple-600 font-medium">
                            {formatCurrency(tx.paidAmount, profile.currency)} paid • {formatCurrency(remaining, profile.currency)} left
                          </span>
                        ) : (
                          <span className="text-amber-800 font-medium">
                            {formatCurrency(remaining, profile.currency)} pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar if partially paid */}
                    {tx.paidAmount > 0 && !isSettled && (
                      <div className="w-full sm:w-28 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pt-1 sm:pt-0">
                      {!isSettled ? (
                        <Button
                          size="xs"
                          variant="primary"
                          icon={<CheckCircle2 className="w-3 h-3" />}
                          onClick={() => openPaymentModal(tx)}
                          className="flex-1 sm:flex-initial py-2 sm:py-1 text-xs"
                        >
                          Settle ({formatCurrency(remaining, profile.currency)})
                        </Button>
                      ) : <div />}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openTransactionModal({ transaction: tx })}
                          className="p-2 sm:p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit transaction"
                          aria-label="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="p-2 sm:p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete transaction"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History Log if any repayments occurred */}
                {tx.paymentHistory && tx.paymentHistory.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 bg-zinc-50/50 p-2.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 block">
                      Repayment Receipts
                    </span>
                    {tx.paymentHistory.map((pay) => (
                      <div
                        key={pay.id}
                        className="flex items-center justify-between text-xs text-zinc-600"
                      >
                        <span>
                          {formatDate(pay.date)} • {pay.note || 'Repayment'}
                        </span>
                        <span className="font-semibold text-emerald-600">
                          +{formatCurrency(pay.amount, profile.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Transaction Modal */}
      <ConfirmModal
        isOpen={Boolean(txToDelete)}
        onClose={() => setTxToDelete(null)}
        onConfirm={() => {
          if (txToDelete) deleteTransaction(txToDelete.id);
        }}
        title="Delete Transaction"
        message={`Are you sure you want to remove this transaction with ${txToDelete?.personName}?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
