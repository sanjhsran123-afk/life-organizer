import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from 'lucide-react';
import { Person } from '../../types';

type PeopleFilter = 'all' | 'owes_me' | 'i_owe' | 'settled';

export const PeopleView: React.FC = () => {
  const { people, getPersonStats, openPersonModal, openPersonDetail, profile } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PeopleFilter>('all');

  const filteredPeople = useMemo(() => {
    let result = [...people];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q))
      );
    }

    if (filter === 'owes_me') {
      result = result.filter((p) => getPersonStats(p.id).netBalance > 0);
    } else if (filter === 'i_owe') {
      result = result.filter((p) => getPersonStats(p.id).netBalance < 0);
    } else if (filter === 'settled') {
      result = result.filter((p) => getPersonStats(p.id).netBalance === 0);
    }

    // Sort by largest absolute net balance first
    result.sort((a, b) => {
      const balA = Math.abs(getPersonStats(a.id).netBalance);
      const balB = Math.abs(getPersonStats(b.id).netBalance);
      return balB - balA;
    });

    return result;
  }, [people, search, filter, getPersonStats]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            People & Contact Ledgers
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage your network and review mutual financial accounts person by person.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => openPersonModal()}
          className="w-full sm:w-auto"
        >
          Add Contact
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-200/80 dark:border-zinc-800">
          {(
            [
              { id: 'all', label: 'All Contacts', count: people.length },
              {
                id: 'owes_me',
                label: 'People Who Owe Me',
                count: people.filter((p) => getPersonStats(p.id).netBalance > 0).length,
              },
              {
                id: 'i_owe',
                label: 'People I Owe',
                count: people.filter((p) => getPersonStats(p.id).netBalance < 0).length,
              },
              {
                id: 'settled',
                label: 'Settled',
                count: people.filter((p) => getPersonStats(p.id).netBalance === 0).length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  filter === tab.id ? 'bg-zinc-800 dark:bg-zinc-200 text-zinc-200 dark:text-zinc-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3 sm:top-2.5" />
          <input
            type="text"
            placeholder="Search by name, contact info, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-850 border border-zinc-200/90 dark:border-zinc-700 rounded-xl text-base sm:text-xs pl-9 pr-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>
      </div>

      {/* People Grid */}
      {filteredPeople.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No contacts found"
          description="Add friends, classmates, or colleagues to easily track who owes what."
          actionLabel="Add Contact"
          onAction={() => openPersonModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map((person) => {
            const stats = getPersonStats(person.id);
            const netBalance = stats.netBalance;
            const owesMe = netBalance > 0;
            const iOwe = netBalance < 0;
            const isSettled = netBalance === 0;

            return (
              <div
                key={person.id}
                onClick={() => openPersonDetail(person.id)}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4.5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-card transition-all duration-150 cursor-pointer flex flex-col justify-between group"
              >
                {/* Header: Avatar, Name & Phone */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={person.name} size="md" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {person.name}
                        </h3>
                        {person.phone && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                            <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                            {person.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge
                      size="xs"
                      variant={owesMe ? 'warning' : iOwe ? 'danger' : 'success'}
                    >
                      {owesMe ? 'Owes you' : iOwe ? 'You owe' : 'Settled'}
                    </Badge>
                  </div>

                  {person.notes && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mt-2.5 bg-zinc-50/70 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      {person.notes}
                    </p>
                  )}
                </div>

                {/* Ledger Snapshot */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">Total Lent</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(stats.totalLent, profile.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">Received Back</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(stats.totalReceived, profile.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {owesMe ? 'Pending Balance' : iOwe ? 'Payback Owed' : 'Net Balance'}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        owesMe
                          ? 'text-amber-800 dark:text-amber-400'
                          : iOwe
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isSettled
                        ? `${profile.currency}0 (Settled)`
                        : formatCurrency(Math.abs(netBalance), profile.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
                    <span>
                      {stats.lastTransactionDate
                        ? `Last activity: ${formatDate(stats.lastTransactionDate)}`
                        : 'No transactions yet'}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
                      View profile <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
