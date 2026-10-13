import mongoose from 'mongoose';

const paymentRecordSchema = new mongoose.Schema({
  id: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  note: { type: String },
});

const moneyTransactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    personId: { type: String, required: true },
    personName: { type: String, required: true },
    type: {
      type: String,
      enum: ['LENT', 'BORROWED'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    date: { type: String, required: true },
    expectedReturnDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'overdue'],
      default: 'pending',
    },
    category: {
      type: String,
      enum: ['Personal', 'Friends', 'Family', 'Travel', 'Food', 'College', 'Other'],
      default: 'Personal',
    },
    notes: { type: String },
    paymentHistory: [paymentRecordSchema],
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const MoneyTransactionModel = mongoose.model('MoneyTransaction', moneyTransactionSchema);
