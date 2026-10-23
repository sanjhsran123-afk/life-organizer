import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import {
  TransactionCategory,
  TransactionType,
  TransactionStatus,
} from '../../types';
import { getTodayDateString, isOverdue } from '../../utils/formatters';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const TransactionModal: React.FC = () => {
  const {
    transactionModal,
    closeTransactionModal,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    people,
    addPerson,
    profile,
  } = useApp();

  const isEditing = Boolean(transactionModal.transaction?.id);

  const [type, setType] = useState<TransactionType>('LENT');
  const [personId, setPersonId] = useState('');
  const [personName, setPersonName] = useState('');
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Personal');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (transactionModal.isOpen) {
      if (transactionModal.transaction) {
        const tx = transactionModal.transaction;
        setType(tx.type);
        setPersonId(tx.personId);
        setPersonName(tx.personName);
        setIsNewPerson(false);
        setAmount(String(tx.amount));
        setDate(tx.date);
        setExpectedReturnDate(tx.expectedReturnDate || '');
        setCategory(tx.category);
        setNotes(tx.notes || '');
        setStatus(tx.status);
      } else {
        const initialType = transactionModal.initialType || 'LENT';
        setType(initialType);
        if (transactionModal.initialPersonId) {
          const found = people.find((p) => p.id === transactionModal.initialPersonId);
          if (found) {
            setPersonId(found.id);
            setPersonName(found.name);
            setIsNewPerson(false);
          } else {
            setPersonId('');
            setPersonName('');
            setIsNewPerson(false);
          }
        } else if (people.length > 0) {
          setPersonId(people[0].id);
          setPersonName(people[0].name);
          setIsNewPerson(false);
        } else {
          setPersonId('');
          setPersonName('');
          setIsNewPerson(true);
        }
        setAmount('');
        setDate(getTodayDateString());
        // Default expected return date to 14 days from today
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 14);
        setExpectedReturnDate(defaultDue.toISOString().split('T')[0]);
        setCategory('Personal');
        setNotes('');
        setStatus('pending');
      }
      setErrors({});
    }
  }, [transactionModal.isOpen, transactionModal.transaction, transactionModal.initialType, transactionModal.initialPersonId, people]);

  const handlePersonSelectChange = (val: string) => {
    if (val === '__new__') {
      setIsNewPerson(true);
      setPersonId('');
      setPersonName('');
    } else {
      setIsNewPerson(false);
      setPersonId(val);
      const matched = people.find((p) => p.id === val);
      if (matched) setPersonName(matched.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }

    let finalPersonId = personId;
    let finalPersonName = personName;

    if (isNewPerson) {
      if (!personName.trim()) {
        newErrors.personName = 'Please enter person name';
      } else {
        // Automatically create this contact
        const createdPerson = addPerson({
          name: personName.trim(),
          notes: `Added via ${type === 'LENT' ? 'lent' : 'borrowed'} transaction`,
        });
        finalPersonId = createdPerson.id;
        finalPersonName = createdPerson.name;
      }
    } else if (!finalPersonId) {
      newErrors.personId = 'Please select a contact or add a new person';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Auto calculate status if creating
    let finalStatus: TransactionStatus = status;
    if (!isEditing) {
      finalStatus = isOverdue(expectedReturnDate) ? 'overdue' : 'pending';
    }

    if (isEditing && transactionModal.transaction) {
      updateTransaction(transactionModal.transaction.id, {
        type,
        personId: finalPersonId,
        personName: finalPersonName,
        amount: numericAmount,
        date,
        expectedReturnDate,
        category,
        notes: notes.trim() || undefined,
        status: finalStatus,
      });
    } else {
      addTransaction({
        type,
        personId: finalPersonId,
        personName: finalPersonName,
        amount: numericAmount,
        date,
        expectedReturnDate,
        category,
        notes: notes.trim() || undefined,
        status: finalStatus,
      });
    }

    closeTransactionModal();
  };

  return (
    <Modal
      isOpen={transactionModal.isOpen}
      onClose={closeTransactionModal}
      title={
        isEditing
          ? 'Edit Transaction'
          : type === 'LENT'
          ? 'Record Lent Money'
          : 'Record Borrowed Money'
      }
      subtitle={
        type === 'LENT'
          ? 'Track money you gave and when you expect to receive it'
          : 'Track money you borrowed and your payback commitment'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle switch (if creating new) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType('LENT')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                type === 'LENT'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              I Lent Money
            </button>
            <button
              type="button"
              onClick={() => setType('BORROWED')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                type === 'BORROWED'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              I Borrowed Money
            </button>
          </div>
        )}

        {/* Contact selection */}
        <div>
          {!isNewPerson && people.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700">
                  {type === 'LENT' ? 'Lent to (Person)' : 'Borrowed from (Person)'}
                  <span className="text-rose-500 ml-0.5">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewPerson(true);
                    setPersonId('');
                    setPersonName('');
                  }}
                  className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
                >
                  + Add new contact
                </button>
              </div>
              <Select
                value={personId}
                onChange={(e) => handlePersonSelectChange(e.target.value)}
                options={[
                  ...people.map((p) => ({ value: p.id, label: p.name })),
                  { value: '__new__', label: '+ Add new person...' },
                ]}
                error={errors.personId}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700">
                  Person Name
                  <span className="text-rose-500 ml-0.5">*</span>
                </label>
                {people.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPerson(false);
                      setPersonId(people[0].id);
                      setPersonName(people[0].name);
                    }}
                    className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
                  >
                    Select existing contact
                  </button>
                )}
              </div>
              <Input
                placeholder="e.g. Rahul, Aman, Rohan..."
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                error={errors.personName}
                required
              />
            </div>
          )}
        </div>

        {/* Amount */}
        <Input
          label="Amount"
          type="number"
          step="any"
          min="1"
          placeholder="e.g. 2500"
          leftIcon={<span className="font-semibold text-zinc-500">{profile.currency}</span>}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          required
        />

        {/* Date & Expected Return Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={type === 'LENT' ? 'Date Lent' : 'Date Borrowed'}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            label={type === 'LENT' ? 'Expected Return Date' : 'Expected Payback Date'}
            type="date"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            required
          />
        </div>

        {/* Category & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TransactionCategory)}
            options={[
              { value: 'Personal', label: 'Personal' },
              { value: 'Friends', label: 'Friends' },
              { value: 'Family', label: 'Family' },
              { value: 'Travel', label: 'Travel' },
              { value: 'Food', label: 'Food' },
              { value: 'College', label: 'College' },
              { value: 'Other', label: 'Other' },
            ]}
          />

          {isEditing ? (
            <Select
              label="Payment Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TransactionStatus)}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'partially_paid', label: 'Partially Paid' },
                { value: 'paid', label: 'Paid in Full' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
          ) : (
            <div className="flex flex-col justify-end">
              <span className="text-[11px] text-zinc-500 mb-2">Default Status</span>
              <div className="px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs text-zinc-600 font-medium">
                Pending (Awaiting settlement)
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <Textarea
          label="Notes / Reason (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Paid for trip booking, concert tickets, or cafeteria bill..."
          rows={2}
        />

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 gap-3">
          {isEditing && transactionModal.transaction ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                deleteTransaction(transactionModal.transaction!.id);
                closeTransactionModal();
              }}
            >
              Delete
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={closeTransactionModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isEditing ? 'Save Changes' : type === 'LENT' ? 'Record Lent Money' : 'Record Borrowed Money'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
