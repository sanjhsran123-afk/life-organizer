import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['Personal', 'College', 'Work', 'Finance', 'Health', 'Other'],
      default: 'Personal',
    },
    dueDate: { type: String, required: true },
    dueTime: { type: String, trim: true },
    deadline: { type: String, index: true },
    remindMe: { type: Boolean, default: false },
    reminder5MinSent: { type: Boolean, default: false },
    reminderDueSent: { type: Boolean, default: false },
    completedAt: { type: String },
    notes: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

taskSchema.index({ remindMe: 1, status: 1, deadline: 1 });
taskSchema.index({ userId: 1, status: 1 });

export const TaskModel = mongoose.model('Task', taskSchema);
