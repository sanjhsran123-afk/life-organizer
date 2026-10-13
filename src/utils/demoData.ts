import { Person, Task, MoneyTransaction, Note, ActivityItem, UserProfile } from '../types';

export const initialProfile: UserProfile = {
  name: 'Test User',
  email: 'test@dayledger.app',
  currency: '₹',
  currencyCode: 'INR',
  avatarSeed: 'TestUser',
};

// Clean minimal data for quick testing - user can add their own
export const initialPeople: Person[] = [
  {
    id: 'p-test-1',
    name: 'Sample Contact',
    phone: '+91 98000 00000',
    email: 'contact@example.com',
    notes: 'Test contact for tracking lent/borrowed money.',
    createdAt: new Date().toISOString(),
  },
];

export const initialTransactions: MoneyTransaction[] = [
  {
    id: 'tx-test-1',
    personId: 'p-test-1',
    personName: 'Sample Contact',
    type: 'LENT',
    amount: 500,
    paidAmount: 0,
    date: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    category: 'Personal',
    notes: 'Test transaction (you can delete or add your own).',
    createdAt: new Date().toISOString(),
    paymentHistory: [],
  },
];

export const initialTasks: Task[] = [
  {
    id: 'task-test-1',
    title: 'Explore DayLedger & add your first task',
    description: 'This is a test task. You can complete it, delete it, or create your own real-life tasks.',
    status: 'todo',
    priority: 'medium',
    category: 'Personal',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    notes: 'Click anywhere to view or edit this task.',
  },
];

export const initialNotes: Note[] = [
  {
    id: 'note-test-1',
    title: 'Welcome to DayLedger Notes',
    content: 'All demo data has been cleaned up. Use this workspace to keep your quick thoughts, study plans, or financial records.',
    tags: ['Welcome', 'Guide'],
    isPinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const initialActivities: ActivityItem[] = [
  {
    id: 'act-test-1',
    type: 'task',
    action: 'Workspace Ready',
    description: 'Welcome to DayLedger. Clean workspace initialized.',
    entityId: 'task-test-1',
    timestamp: new Date().toISOString(),
  },
];
