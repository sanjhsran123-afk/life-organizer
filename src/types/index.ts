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
  dueTime?: string; // HH:mm format (optional)
  deadline?: string; // ISO 8601 UTC timestamp (optional, timezone-safe)
  remindMe?: boolean; // reminder notification active
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
  isPhoneVerified?: boolean;
  phoneDiscoverable?: boolean;
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
  isPhoneVerified?: boolean;
  phoneDiscoverable?: boolean;
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'declined' | 'blocked';

export interface FriendSearchResult {
  found: boolean;
  message?: string;
  user?: {
    id: string;
    name: string;
    avatarSeed: string;
    friendshipStatus: FriendshipStatus;
    friendshipId?: string | null;
  };
}

export interface FriendItem {
  id: string;
  friendshipId: string;
  name: string;
  avatarSeed: string;
  since?: string;
}

export interface FriendRequestItem {
  id: string; // friendshipId
  requesterId?: string;
  recipientId?: string;
  name: string;
  avatarSeed: string;
  createdAt: string;
}

export interface BlockedUserItem {
  id: string;
  name: string;
  avatarSeed: string;
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

export type TabType = 'overview' | 'tasks' | 'money' | 'people' | 'friends' | 'notes' | 'activity' | 'location' | 'settings' | 'admin';

export interface MessageItem {
  id: string;
  pairKey: string;
  senderId: string;
  recipientId: string;
  type: 'text' | 'file';
  text?: string;
  file?: {
    key: string;
    name: string;
    size: number;
    mimeType: string;
  };
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export type CallStatus =
  | 'idle'
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended';

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  isIncoming: boolean;
  isMuted: boolean;
  status: CallStatus;
  startedAt?: number;
  duration: number;
}

export interface IceServerConfig {
  iceServers: RTCIceServer[];
  turnConfigured: boolean;
  audioConstraints?: MediaTrackConstraints;
}

export interface CloudCapabilities {
  r2Configured: boolean;
  turnConfigured: boolean;
  maxFileSizeMb: number;
}

