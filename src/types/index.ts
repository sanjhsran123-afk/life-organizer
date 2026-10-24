export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskCategory = 'Personal' | 'College' | 'Work' | 'Finance' | 'Health' | 'Other';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string; // YYYY-MM-DD
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export type TransactionType = 'LENT' | 'BORROWED';
export type TransactionStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';
export type TransactionCategory = 'Personal' | 'Friends' | 'Family' | 'Travel' | 'Food' | 'College' | 'Other';

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface MoneyTransaction {
  id: string;
  personId: string;
  personName: string;
  type: TransactionType;
  amount: number;
  paidAmount: number;
  date: string;
  expectedReturnDate: string;
  status: TransactionStatus;
  category: TransactionCategory;
  notes?: string;
  createdAt: string;
  paymentHistory: PaymentRecord[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  personId?: string;
  taskId?: string;
  transactionId?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'task' | 'money' | 'note' | 'person';
  action: string;
  description: string;
  entityId?: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  linkTab?: TabType;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  age?: number;
  dateOfBirth?: string;
  currentAge?: number;
  role?: 'user' | 'admin';
  currency: string;
  currencyCode: string;
  avatarSeed?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  dateOfBirth?: string;
  currentAge?: number;
  role?: 'user' | 'admin';
  currency?: string;
  currencyCode?: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  age: number;
  dateOfBirth: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthLogEntry {
  id: string;
  type: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'SIGNUP' | 'SESSION_EXPIRED' | 'ROLE_CHANGED';
  email: string;
  name: string;
  timestamp: string;
  details?: string;
}

export interface AdminUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  dateOfBirth: string;
  currentAge?: number;
  role: 'user' | 'admin';
  currency?: string;
  currencyCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminActivityItem {
  _id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  eventType: 'SIGNUP' | 'LOGIN' | 'LOGOUT' | 'SESSION_EXPIRED' | 'ROLE_CHANGED' | 'PROFILE_UPDATED';
  status: 'SUCCESS' | 'FAILED';
  ipAddress: string;
  userAgent: string;
  details?: string;
  timestamp: string;
}

export interface AdminOverviewStats {
  databaseStatus: string;
  totalUsers: number;
  adminUsers: number;
  standardUsers: number;
  signupsLast7Days: number;
  loginsLast7Days: number;
  recentSignups: AdminUser[];
  recentActivities: AdminActivityItem[];
  lastUpdated: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface AdminActivityResponse {
  activities: AdminActivityItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export type TabType = 'overview' | 'tasks' | 'money' | 'people' | 'notes' | 'activity' | 'location' | 'settings' | 'admin';
