import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  CheckSquare,
  WalletCards,
  Users,
  FileText,
  Plus,
  ArrowRight,
  X,
  MapPin,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const CommandPalette: React.FC = () => {
  const {
    searchOpen,
    setSearchOpen,
    tasks,
    people,
    transactions,
    notes,
    setActiveTab,
    openTaskModal,
    openTransactionModal,
    openPersonModal,
    openNoteModal,
    openPersonDetail,
    profile,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        tasks: tasks.slice(0, 3),
        people: people.slice(0, 3),
        transactions: transactions.slice(0, 3),
        notes: notes.slice(0, 3),
        actions: [
          { id: 'act-task', label: 'Create new task', icon: CheckSquare, action: () => openTaskModal() },
          { id: 'act-lend', label: 'Record lent money', icon: WalletCards, action: () => openTransactionModal({ initialType: 'LENT' }) },
          { id: 'act-borrow', label: 'Record borrowed money', icon: WalletCards, action: () => openTransactionModal({ initialType: 'BORROWED' }) },
          { id: 'act-note', label: 'Create new note', icon: FileText, action: () => openNoteModal() },
          { id: 'act-person', label: 'Add person / contact', icon: Users, action: () => openPersonModal() },
          { id: 'act-location', label: 'View current location & satellite map', icon: MapPin, action: () => { setActiveTab('location'); setSearchOpen(false); } },
        ],
      };
    }

    const matchedTasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
    );

    const matchedPeople = people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );

    const matchedTransactions = transactions.filter(
      (tx) =>
        tx.personName.toLowerCase().includes(q) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        tx.category.toLowerCase().includes(q)
    );

    const matchedNotes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((tag) => tag.toLowerCase().includes(q))
    );

    return {
      tasks: matchedTasks,
      people: matchedPeople,
      transactions: matchedTransactions,
      notes: matchedNotes,
      actions: [
        { id: 'act-task', label: `Add task "${query}"`, icon: Plus, action: () => openTaskModal({ title: query } as any) },
        { id: 'act-note', label: `Add note "${query}"`, icon: Plus, action: () => openNoteModal({ note: { title: query } as any }) },
      ],
    };
  }, [query, tasks, people, transactions, notes, openTaskModal, openTransactionModal, openPersonModal, openNoteModal]);

  const totalResultsCount =
    filteredResults.tasks.length +
    filteredResults.people.length +
    filteredResults.transactions.length +
    filteredResults.notes.length;

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-24 px-3 sm:px-4 overflow-y-auto safe-area-pt">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={() => setSearchOpen(false)}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-popover overflow-hidden z-10 animate-pop-in">
        {/* Search Input bar */}
        <div className="flex items-center px-3.5 sm:px-4 py-3 sm:py-3.5 border-b border-zinc-100 dark:border-zinc-800 gap-2.5 sm:gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, money, people, notes..."
            className="w-full text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700 font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {totalResultsCount === 0 && query && (
            <div className="py-8 text-center">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">No matching items found for "{query}"</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Try searching for a person name, task, or tag</p>
            </div>
          )}

          {/* Quick Actions */}
          {filteredResults.actions.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Quick Actions
              </div>
              <div className="space-y-1">
                {filteredResults.actions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={() => {
                        setSearchOpen(false);
                        act.action();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                        <span>{act.label}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {filteredResults.tasks.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Tasks</span>
                <span className="text-[10px] font-normal text-zinc-400">{filteredResults.tasks.length}</span>
              </div>
              <div className="space-y-1">
                {filteredResults.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setActiveTab('tasks');
                      openTaskModal(task);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className={`truncate ${task.status === 'completed' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge size="xs" variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}>
                        {task.priority}
                      </Badge>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatDate(task.dueDate)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* People Results */}
          {filteredResults.people.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>People</span>
                <span className="text-[10px] font-normal text-zinc-400">{filteredResults.people.length}</span>
              </div>
              <div className="space-y-1">
                {filteredResults.people.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      setSearchOpen(false);
                      openPersonDetail(person.id);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{person.name}</span>
                      {person.notes && <span className="text-zinc-400 dark:text-zinc-500 truncate text-[11px]">{person.notes}</span>}
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-medium shrink-0">View profile</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Money Transactions Results */}
          {filteredResults.transactions.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Money Transactions</span>
                <span className="text-[10px] font-normal text-zinc-400">{filteredResults.transactions.length}</span>
              </div>
              <div className="space-y-1">
                {filteredResults.transactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setActiveTab('money');
                      openTransactionModal({ transaction: tx });
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <WalletCards className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {tx.type === 'LENT' ? 'Lent to' : 'Borrowed from'} <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{tx.personName}</strong>
                        {tx.notes ? ` • ${tx.notes}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(tx.amount, profile.currency)}
                      </span>
                      <Badge
                        size="xs"
                        variant={tx.status === 'paid' ? 'success' : tx.status === 'overdue' ? 'danger' : 'warning'}
                      >
                        {tx.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Results */}
          {filteredResults.notes.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Notes</span>
                <span className="text-[10px] font-normal text-zinc-400">{filteredResults.notes.length}</span>
              </div>
              <div className="space-y-1">
                {filteredResults.notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setActiveTab('notes');
                      openNoteModal({ note });
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 mr-2">{note.title}</span>
                        <span className="text-zinc-400 dark:text-zinc-500">{note.content}</span>
                      </div>
                    </div>
                    {note.tags.length > 0 && (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                        #{note.tags[0]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
          <span>Search everything across DayLedger</span>
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
