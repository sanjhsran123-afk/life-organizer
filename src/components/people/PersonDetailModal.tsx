import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency, formatDate, isOverdue } from '../../utils/formatters';
import {
  Phone,
  Mail,
  Edit2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const PersonDetailModal: React.FC = () => {
  const {
    personDetailId,
    closePersonDetail,
    people,
    transactions,
    notes,
    openPersonModal,
    openTransactionModal,
    openPaymentModal,
    openNoteModal,
    getPersonStats,
    profile,
  } = useApp();

  if (!personDetailId) return null;

  const person = people.find((p) => p.id === personDetailId);
  if (!person) return null;

  const personStats = getPersonStats(person.id);
  const personTransactions = transactions.filter((t) => t.personId === person.id);
  const personNotes = notes.filter((n) => n.personId === person.id);

  const netBalance = personStats.netBalance;

  return (
    <Modal
      isOpen={Boolean(personDetailId)}
      onClose={closePersonDetail}
      maxWidth="xl"
      showCloseButton={true}
    >
      <div className="space-y-6">
        {/* Person Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3.5">
            <Avatar name={person.name} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{person.name}</h3>
                <button
                  onClick={() => openPersonModal(person)}
                  className="text-zinc-400 hover:text-zinc-600 p-1 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Edit contact info"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
                {person.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    {person.phone}
                  </span>
                )}
                {person.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-zinc-400" />
                    {person.email}
                  </span>
                )}
              </div>
              {person.notes && (
                <p className="text-xs text-zinc-600 mt-1 italic">{person.notes}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => openTransactionModal({ initialPersonId: person.id, initialType: 'LENT' })}
              className="w-full sm:w-auto"
            >
              Add Entry
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => openNoteModal({ initialPersonId: person.id })}
              className="w-full sm:w-auto"
            >
              Add Note
            </Button>
          </div>
        </div>

        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
            <span className="text-[11px] font-medium text-zinc-500 block">Total Lent</span>
            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">
              {formatCurrency(personStats.totalLent, profile.currency)}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
            <span className="text-[11px] font-medium text-zinc-500 block">Received Back</span>
            <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
              {formatCurrency(personStats.totalReceived, profile.currency)}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
            <span className="text-[11px] font-medium text-zinc-500 block">You Borrowed</span>
            <span className="text-sm font-bold text-amber-700 mt-0.5 block">
              {formatCurrency(personStats.totalBorrowed, profile.currency)}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              netBalance > 0
                ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                : netBalance < 0
                ? 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
            }`}
          >
            <span className="text-[11px] font-medium block">
              {netBalance > 0
                ? 'Owes You'
                : netBalance < 0
                ? 'You Owe Him'
                : 'Net Balance'}
            </span>
            <span className="text-sm font-bold mt-0.5 block">
              {netBalance === 0
                ? 'All Settled 🎉'
                : formatCurrency(Math.abs(netBalance), profile.currency)}
            </span>
          </div>
        </div>

        {/* Transactions Timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Transaction History ({personTransactions.length})
            </h4>
          </div>

          {personTransactions.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-4 text-center">
              No transactions recorded yet with {person.name}.
            </p>
          ) : (
            <div className="space-y-2.5">
              {personTransactions.map((tx) => {
                const remaining = Math.max(0, tx.amount - tx.paidAmount);
                const isLent = tx.type === 'LENT';
                const overdue = remaining > 0 && isOverdue(tx.expectedReturnDate);

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl border border-zinc-200/70 bg-white hover:border-zinc-300 transition-colors shadow-2xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isLent
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                              : 'bg-amber-50 text-amber-800 border border-amber-200/50'
                          }`}
                        >
                          {isLent ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-900">
                            {isLent ? 'Lent' : 'Borrowed'} {formatCurrency(tx.amount, profile.currency)}
                          </span>
                          <span className="text-xs text-zinc-400">•</span>
                          <span className="text-[11px] text-zinc-500">{formatDate(tx.date)}</span>
                          <span className="text-xs text-zinc-400">•</span>
                          <Badge size="xs" variant="neutral">
                            {tx.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="self-start sm:self-auto shrink-0">
                        <Badge
                          size="xs"
                          variant={
                            tx.status === 'paid'
                              ? 'success'
                              : overdue
                              ? 'danger'
                              : tx.status === 'partially_paid'
                              ? 'purple'
                              : 'warning'
                          }
                        >
                          {tx.status === 'paid'
                            ? 'Settled'
                            : overdue
                            ? 'Overdue'
                            : tx.status === 'partially_paid'
                            ? `Partially Paid (${formatCurrency(tx.paidAmount, profile.currency)})`
                            : 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    {tx.notes && (
                      <p className="text-xs text-zinc-600 bg-zinc-50/70 p-2 rounded-lg border border-zinc-100">
                        {tx.notes}
                      </p>
                    )}

                    {/* Footer with actions and expected date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-100">
                      <span>
                        Expected return:{' '}
                        <strong className="text-zinc-700 font-medium">
                          {formatDate(tx.expectedReturnDate)}
                        </strong>
                      </span>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {remaining > 0 && (
                          <button
                            onClick={() => openPaymentModal(tx)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer py-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Record Payment ({formatCurrency(remaining, profile.currency)})
                          </button>
                        )}
                        <button
                          onClick={() => openTransactionModal({ transaction: tx })}
                          className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer p-1"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Linked Notes */}
        {personNotes.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
              Notes about {person.name} ({personNotes.length})
            </h4>
            <div className="space-y-2">
              {personNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => openNoteModal({ note: n })}
                  className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 text-xs hover:border-zinc-300 transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-zinc-900">{n.title}</p>
                  <p className="text-zinc-600 mt-1 line-clamp-2">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
