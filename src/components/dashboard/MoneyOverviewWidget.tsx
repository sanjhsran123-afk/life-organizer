import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import { WalletCards, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';

export const MoneyOverviewWidget: React.FC = () => {
  const { stats, profile, openTransactionModal, setActiveTab } = useApp();

  const totalFlow = stats.totalLent + stats.totalBorrowed || 1;
  const lentPct = Math.round((stats.totalLent / totalFlow) * 100);
  const borrowedPct = 100 - lentPct;

  const recoveryPct =
    stats.totalLent > 0 ? Math.round((stats.totalReceived / stats.totalLent) * 100) : 100;

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <WalletCards className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Money Overview</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="outline"
            icon={<ArrowUpRight className="w-3 h-3 text-emerald-600" />}
            onClick={() => openTransactionModal({ initialType: 'LENT' })}
          >
            Lend
          </Button>
          <Button
            size="xs"
            variant="outline"
            icon={<ArrowDownLeft className="w-3 h-3 text-amber-700" />}
            onClick={() => openTransactionModal({ initialType: 'BORROWED' })}
          >
            Borrow
          </Button>
        </div>
      </div>

      {/* Numerical grid */}
      <div className="grid grid-cols-2 gap-3 py-3">
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Total Lent</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-base font-bold text-zinc-900 mt-1 block">
            {formatCurrency(stats.totalLent, profile.currency)}
          </span>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Given to friends/family</span>
        </div>

        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Borrowed</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <span className="text-base font-bold text-zinc-900 mt-1 block">
            {formatCurrency(stats.totalBorrowed, profile.currency)}
          </span>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Taken from contacts</span>
        </div>

        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Received Back</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <span className="text-base font-bold text-emerald-600 mt-1 block">
            {formatCurrency(stats.totalReceived, profile.currency)}
          </span>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">{recoveryPct}% recovered</span>
        </div>

        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-900">Pending Return</span>
            <span className="w-2 h-2 rounded-full bg-amber-600" />
          </div>
          <span className="text-base font-bold text-amber-900 mt-1 block">
            {formatCurrency(stats.totalPending, profile.currency)}
          </span>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Yet to be repaid</span>
        </div>
      </div>

      {/* Minimal Visual bar chart */}
      <div className="py-2 space-y-2 border-t border-zinc-100">
        <div className="flex items-center justify-between text-[11px] text-zinc-600 font-medium">
          <span>Loan Recovery Progress</span>
          <span className="font-semibold text-zinc-900">{recoveryPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, recoveryPct)}%` }}
            title={`Received: ${recoveryPct}%`}
          />
        </div>
      </div>

      <div className="mt-auto pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1 text-zinc-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Auto-computed ledger
        </span>
        <button
          onClick={() => setActiveTab('money')}
          className="text-indigo-600 hover:underline font-medium cursor-pointer"
        >
          View detailed ledger →
        </button>
      </div>
    </Card>
  );
};
