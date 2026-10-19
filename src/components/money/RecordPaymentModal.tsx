import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2 } from 'lucide-react';

export const RecordPaymentModal: React.FC = () => {
  const { paymentModal, closePaymentModal, recordPayment, profile } = useApp();
  const tx = paymentModal.transaction;

  const [paymentAmount, setPaymentAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const remaining = tx ? Math.max(0, tx.amount - tx.paidAmount) : 0;

  useEffect(() => {
    if (paymentModal.isOpen && tx) {
      setPaymentAmount(String(remaining));
      setNote('');
      setError('');
    }
  }, [paymentModal.isOpen, tx, remaining]);

  if (!tx) return null;

  const isLent = tx.type === 'LENT';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (amountNum > remaining) {
      setError(`Amount cannot exceed the remaining balance of ${formatCurrency(remaining, profile.currency)}`);
      return;
    }

    recordPayment(tx.id, amountNum, note.trim() || undefined);
    closePaymentModal();
  };

  return (
    <Modal
      isOpen={paymentModal.isOpen}
      onClose={closePaymentModal}
      title={isLent ? 'Record Payment Received' : 'Record Repayment Made'}
      subtitle={
        isLent
          ? `Record money received back from ${tx.personName}`
          : `Record money returned to ${tx.personName}`
      }
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Balance snapshot card */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Total Transaction Amount</span>
            <span className="font-semibold text-zinc-900">
              {formatCurrency(tx.amount, profile.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Already Settled</span>
            <span className="font-semibold text-emerald-600">
              {formatCurrency(tx.paidAmount, profile.currency)}
            </span>
          </div>
          <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">Remaining Balance</span>
            <span className="font-bold text-indigo-700">
              {formatCurrency(remaining, profile.currency)}
            </span>
          </div>
        </div>

        {/* Amount to record */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-700">
              {isLent ? 'Amount Received' : 'Amount Paid'}
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <button
              type="button"
              onClick={() => setPaymentAmount(String(remaining))}
              className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
            >
              Pay in full ({formatCurrency(remaining, profile.currency)})
            </button>
          </div>
          <Input
            type="number"
            step="any"
            min="1"
            max={remaining}
            value={paymentAmount}
            onChange={(e) => {
              setPaymentAmount(e.target.value);
              if (error) setError('');
            }}
            leftIcon={<span className="font-semibold text-zinc-500">{profile.currency}</span>}
            error={error}
            required
          />
        </div>

        {/* Note */}
        <Input
          label="Note (Optional)"
          placeholder="e.g. Received via GPay, Cash, Bank Transfer..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
          <Button type="button" variant="outline" size="sm" onClick={closePaymentModal}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
