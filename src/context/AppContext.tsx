import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Task,
  Person,
  MoneyTransaction,
  Note,
  ActivityItem,
  NotificationItem,
  UserProfile,
  AuthUser,
  AuthLogEntry,
  RegisterFormData,
  TabType,
} from '../types';
import {
  initialProfile,
  initialPeople,
  initialTransactions,
  initialTasks,
  initialNotes,
  initialActivities,
} from '../utils/demoData';
import { getTodayDateString, isOverdue, formatCurrency } from '../utils/formatters';
import {
  checkBackendHealth,
  fetchAllData,
  apiLogin,
  apiRegister,
  apiLogout,
  getStoredAuthLogs,
  apiGetMe,
  setAuthToken,
  clearAuthToken,
  apiAddTask,
  apiUpdateTask,
  apiDeleteTask,
  apiAddPerson,
  apiUpdatePerson,
  apiDeletePerson,
  apiAddTransaction,
  apiUpdateTransaction,
  apiDeleteTransaction,
  apiRecordPayment,
  apiAddNote,
  apiUpdateNote,
  apiDeleteNote,
  apiAddActivity,
  apiUpdateProfile,
  apiSeedDatabase,
} from '../api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error' | 'warning';
  title?: string;
  message: string;
}

interface AppContextType {
  // Authentication
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (credentials: RegisterFormData) => Promise<void>;
  logout: () => void;
  authLogs: AuthLogEntry[];
  clearAuthLogs: () => void;

  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;

  // Search & Global Modals
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  notificationOpen: boolean;
  setNotificationOpen: (open: boolean) => void;

  // Modals for specific entity operations
  taskModal: { isOpen: boolean; task?: Task };
  openTaskModal: (task?: Task) => void;
  closeTaskModal: () => void;

  transactionModal: { isOpen: boolean; transaction?: MoneyTransaction; initialType?: 'LENT' | 'BORROWED'; initialPersonId?: string };
  openTransactionModal: (opts?: { transaction?: MoneyTransaction; initialType?: 'LENT' | 'BORROWED'; initialPersonId?: string }) => void;
  closeTransactionModal: () => void;

  paymentModal: { isOpen: boolean; transaction?: MoneyTransaction };
  openPaymentModal: (transaction: MoneyTransaction) => void;
  closePaymentModal: () => void;

  personModal: { isOpen: boolean; person?: Person };
  openPersonModal: (person?: Person) => void;
  closePersonModal: () => void;

  personDetailId: string | null;
  openPersonDetail: (personId: string) => void;
  closePersonDetail: () => void;

  noteModal: { isOpen: boolean; note?: Note; initialPersonId?: string; initialTaskId?: string };
  openNoteModal: (opts?: { note?: Note; initialPersonId?: string; initialTaskId?: string }) => void;
  closeNoteModal: () => void;

  // Data
  profile: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => void;
  tasks: Task[];
  people: Person[];
  transactions: MoneyTransaction[];
  notes: Note[];
  activities: ActivityItem[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;

  // CRUD Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  // CRUD People
  addPerson: (person: Omit<Person, 'id' | 'createdAt'>) => Person;
  updatePerson: (id: string, person: Partial<Person>) => void;
  deletePerson: (id: string) => void;

  // CRUD Money Transactions
  addTransaction: (tx: Omit<MoneyTransaction, 'id' | 'createdAt' | 'paidAmount' | 'paymentHistory'>) => MoneyTransaction;
  updateTransaction: (id: string, tx: Partial<MoneyTransaction>) => void;
  deleteTransaction: (id: string) => void;
  recordPayment: (id: string, amount: number, note?: string) => void;

  // CRUD Notes
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note;
  updateNote: (id: string, note: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;

  // Activity & Notifications
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;

  // Calculated Stats
  stats: {
    totalLent: number;
    totalBorrowed: number;
    totalReceived: number;
    totalPending: number;
    totalPendingBorrowed: number;
    tasksTodayCount: number;
    tasksCompletedCount: number;
    tasksPendingCount: number;
    tasksOverdueCount: number;
    peopleOwingCount: number;
    peopleOwedCount: number;
  };

  // Helper calculation for a specific person
  getPersonStats: (personId: string) => {
    totalLent: number;
    totalReceived: number;
    totalBorrowed: number;
    totalPaidToThem: number;
    netBalance: number; // positive = they owe me, negative = I owe them
    activeTransactionsCount: number;
    lastTransactionDate?: string;
  };

  // Backend & MongoDB status
  mongoStatus: {
    status: 'connected' | 'disconnected' | 'offline';
    database?: string;
  };
  retryMongoConnection: () => Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning', title?: string) => void;
  removeToast: (id: string) => void;

  // System
  triggerCelebration: () => void;
  resetToSampleData: () => void;
  clearAllData: () => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonString: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'dayledger_state_v2';
const USER_KEY = 'dayledger_active_user';

// Helper to filter out previous demo mock items
function filterOldDemo<T extends { id: string }>(items: any): T[] {
  if (!Array.isArray(items)) return [];
  const oldDemoIds = new Set([
    'task-1', 'task-2', 'task-3', 'task-4', 'task-5',
    'p-1', 'p-2', 'p-3', 'p-4',
    'tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5',
    'note-1', 'note-2', 'note-3',
    'act-1', 'act-2', 'act-3', 'act-4', 'act-5',
  ]);
  return (items as T[]).filter((item) => item && !oldDemoIds.has(item.id));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & UI state with URL hash and query param sync
  const getInitialTab = (): TabType => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['overview', 'tasks', 'money', 'people', 'notes', 'activity', 'settings', 'admin'].includes(hash)) {
        return hash as TabType;
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      if (tabParam && ['overview', 'tasks', 'money', 'people', 'notes', 'activity', 'settings', 'admin'].includes(tabParam)) {
        return tabParam as TabType;
      }
    } catch {}
    return 'overview';
  };

  const [activeTab, setActiveTabState] = useState<TabType>(getInitialTab);

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    try {
      window.location.hash = tab;
    } catch {}
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['overview', 'tasks', 'money', 'people', 'notes', 'activity', 'settings', 'admin'].includes(hash)) {
        setActiveTabState(hash as TabType);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [quickAddOpen, setQuickAddOpen] = useState<boolean>(false);
  const [notificationOpen, setNotificationOpen] = useState<boolean>(false);

  // Active Authenticated User
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Authentication Logs
  const [authLogs, setAuthLogs] = useState<AuthLogEntry[]>(() => getStoredAuthLogs());

  const isAuthenticated = !!currentUser;

  // Modals state
  const [taskModal, setTaskModal] = useState<{ isOpen: boolean; task?: Task }>({ isOpen: false });
  const [transactionModal, setTransactionModal] = useState<{
    isOpen: boolean;
    transaction?: MoneyTransaction;
    initialType?: 'LENT' | 'BORROWED';
    initialPersonId?: string;
  }>({ isOpen: false });
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; transaction?: MoneyTransaction }>({ isOpen: false });
  const [personModal, setPersonModal] = useState<{ isOpen: boolean; person?: Person }>({ isOpen: false });
  const [personDetailId, setPersonDetailId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    note?: Note;
    initialPersonId?: string;
    initialTaskId?: string;
  }>({ isOpen: false });

  // Core Data loaded from localStorage or initialized with defaults
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_profile`);
      return saved ? JSON.parse(saved) : initialProfile;
    } catch {
      return initialProfile;
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_tasks`);
      if (saved) {
        const filtered = filterOldDemo<Task>(JSON.parse(saved));
        return filtered.length > 0 ? filtered : initialTasks;
      }
      return initialTasks;
    } catch {
      return initialTasks;
    }
  });

  const [people, setPeople] = useState<Person[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_people`);
      if (saved) {
        const filtered = filterOldDemo<Person>(JSON.parse(saved));
        return filtered.length > 0 ? filtered : initialPeople;
      }
      return initialPeople;
    } catch {
      return initialPeople;
    }
  });

  const [transactions, setTransactions] = useState<MoneyTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
      if (saved) {
        const filtered = filterOldDemo<MoneyTransaction>(JSON.parse(saved));
        return filtered.length > 0 ? filtered : initialTransactions;
      }
      return initialTransactions;
    } catch {
      return initialTransactions;
    }
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_notes`);
      if (saved) {
        const filtered = filterOldDemo<Note>(JSON.parse(saved));
        return filtered.length > 0 ? filtered : initialNotes;
      }
      return initialNotes;
    } catch {
      return initialNotes;
    }
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_activities`);
      if (saved) {
        const filtered = filterOldDemo<ActivityItem>(JSON.parse(saved));
        return filtered.length > 0 ? filtered : initialActivities;
      }
      return initialActivities;
    } catch {
      return initialActivities;
    }
  });

  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_read_notifs`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // MongoDB & Backend Status
  const [mongoStatus, setMongoStatus] = useState<{
    status: 'connected' | 'disconnected' | 'offline';
    database?: string;
  }>({ status: 'offline' });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_profile`, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_tasks`, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_people`, JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_notes`, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_activities`, JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_read_notifs`, JSON.stringify(readNotifications));
  }, [readNotifications]);

  // Toast dispatch helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' | 'warning' = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Connect & Sync with Backend on Startup / User Change
  useEffect(() => {
    let mounted = true;
    const initBackend = async () => {
      // 1. If currentUser is set, verify/refresh session
      if (currentUser) {
        try {
          const me = await apiGetMe();
          if (mounted && me) {
            if (me.role && currentUser.role !== me.role) {
              const updated = { ...currentUser, role: me.role };
              setCurrentUser(updated);
              localStorage.setItem(USER_KEY, JSON.stringify(updated));
            }
            setProfile((prev) => ({
              ...prev,
              name: me.name || prev.name,
              email: me.email || prev.email,
              role: me.role || prev.role,
            }));
          }
        } catch {}
      }

      // 2. Health check
      const health = await checkBackendHealth();
      if (!mounted) return;
      setMongoStatus({ status: health.status, database: health.database });

      // 3. If connected to MongoDB and authenticated, fetch user collections
      if (health.connected && currentUser) {
        const remote = await fetchAllData();
        if (!mounted || !remote) return;

        if (remote.tasks) setTasks(remote.tasks);
        if (remote.people) setPeople(remote.people);
        if (remote.transactions) setTransactions(remote.transactions);
        if (remote.notes) setNotes(remote.notes);
        if (remote.activities) setActivities(remote.activities);
        if (remote.profile) setProfile(remote.profile);
      }
    };

    initBackend();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Auth Operations
  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const res = await apiLogin(credentials);
      setAuthToken(res.token);
      const userObj: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone,
        age: res.user.age,
        dateOfBirth: res.user.dateOfBirth,
        currentAge: res.user.currentAge,
        role: res.user.role || 'user',
        currency: res.user.currency || '₹',
        currencyCode: res.user.currencyCode || 'INR',
      };
      setCurrentUser(userObj);
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      setProfile((prev) => ({
        ...prev,
        name: userObj.name,
        email: userObj.email,
        phone: userObj.phone,
        age: userObj.age,
        dateOfBirth: userObj.dateOfBirth,
        currentAge: userObj.currentAge,
        role: userObj.role,
        currency: userObj.currency || '₹',
        currencyCode: userObj.currencyCode || 'INR',
        avatarSeed: userObj.name,
      }));

      // Synchronize their account data from MongoDB backend
      const health = await checkBackendHealth();
      if (health.connected) {
        const remote = await fetchAllData();
        if (remote) {
          if (remote.tasks) setTasks(remote.tasks);
          if (remote.people) setPeople(remote.people);
          if (remote.transactions) setTransactions(remote.transactions);
          if (remote.notes) setNotes(remote.notes);
          if (remote.activities) setActivities(remote.activities);
          if (remote.profile) setProfile(remote.profile);
        }
      }
      setAuthLogs(getStoredAuthLogs());
      showToast(`Welcome back, ${userObj.name}!`, 'success');
    },
    [showToast]
  );

  const register = useCallback(
    async (credentials: RegisterFormData) => {
      const res = await apiRegister(credentials);
      setAuthToken(res.token);
      const userObj: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone || credentials.phone,
        age: res.user.age || Number(credentials.age),
        dateOfBirth: res.user.dateOfBirth || credentials.dateOfBirth,
        currentAge: res.user.currentAge,
        role: res.user.role || 'user',
        currency: res.user.currency || '₹',
        currencyCode: res.user.currencyCode || 'INR',
      };
      setCurrentUser(userObj);
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      setProfile((prev) => ({
        ...prev,
        name: userObj.name,
        email: userObj.email,
        phone: userObj.phone,
        age: userObj.age,
        dateOfBirth: userObj.dateOfBirth,
        currentAge: userObj.currentAge,
        role: userObj.role,
        currency: userObj.currency || '₹',
        currencyCode: userObj.currencyCode || 'INR',
        avatarSeed: userObj.name,
      }));

      // Initialize clean workspace for the new user
      setTasks(initialTasks);
      setPeople(initialPeople);
      setTransactions(initialTransactions);
      setNotes(initialNotes);
      setActivities(initialActivities);

      setAuthLogs(getStoredAuthLogs());
      showToast(`Account created! Welcome to DayLedger, ${userObj.name}`, 'success');
    },
    [showToast]
  );

  const logout = useCallback(() => {
    const userEmail = currentUser?.email;
    const userName = currentUser?.name;
    const userId = currentUser?.id;
    apiLogout(userEmail, userName, userId);
    clearAuthToken();
    localStorage.removeItem(USER_KEY);
    setCurrentUser(null);
    setAuthLogs(getStoredAuthLogs());
    showToast('Logged out successfully. Please sign in or create an account to continue.', 'info');
  }, [currentUser, showToast]);

  const clearAuthLogs = useCallback(() => {
    localStorage.removeItem('dayledger_auth_logs');
    setAuthLogs([]);
    showToast('Authentication activity history cleared.', 'info');
  }, [showToast]);

  const retryMongoConnection = useCallback(async () => {
    const health = await checkBackendHealth();
    setMongoStatus({ status: health.status, database: health.database });
    if (health.connected) {
      showToast('Connected to MongoDB: mongodb://localhost:27017/dayledger', 'success');
      if (currentUser) {
        const remote = await fetchAllData();
        if (remote) {
          if (remote.tasks && remote.tasks.length > 0) setTasks(remote.tasks);
          if (remote.people && remote.people.length > 0) setPeople(remote.people);
          if (remote.transactions && remote.transactions.length > 0) setTransactions(remote.transactions);
          if (remote.notes && remote.notes.length > 0) setNotes(remote.notes);
          if (remote.profile) setProfile(remote.profile);
        }
      }
    } else {
      showToast('MongoDB not reachable at mongodb://localhost:27017', 'warning');
    }
  }, [showToast, currentUser]);

  // Keyboard shortcut listener for global Search (⌘K / Ctrl+K) and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Confetti micro-interaction
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#6366f1'],
        disableForReducedMotion: true,
      });
    } catch {
      // safe fallback
    }
  }, []);

  // Activity logger helper
  const addActivity = useCallback((item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newAct: ActivityItem = {
      ...item,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newAct, ...prev.slice(0, 49)]);
  }, []);

  // Dynamic notifications engine
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];
    const today = getTodayDateString();

    // Check overdue tasks
    const overdueTasks = tasks.filter((t) => t.status !== 'completed' && isOverdue(t.dueDate));
    if (overdueTasks.length > 0) {
      list.push({
        id: 'notif-tasks-overdue',
        title: 'Overdue Tasks',
        message: `You have ${overdueTasks.length} pending ${overdueTasks.length === 1 ? 'task' : 'tasks'} that passed due date.`,
        type: 'warning',
        linkTab: 'tasks',
        isRead: readNotifications.includes('notif-tasks-overdue'),
        createdAt: today,
      });
    }

    // Check tasks due today
    const todayTasks = tasks.filter((t) => t.status !== 'completed' && t.dueDate === today);
    if (todayTasks.length > 0) {
      list.push({
        id: 'notif-tasks-today',
        title: "Today's Agenda",
        message: `${todayTasks.length} ${todayTasks.length === 1 ? 'task is' : 'tasks are'} scheduled for today.`,
        type: 'info',
        linkTab: 'tasks',
        isRead: readNotifications.includes('notif-tasks-today'),
        createdAt: today,
      });
    }

    // Check money overdue or due soon
    transactions.forEach((tx) => {
      const remaining = tx.amount - tx.paidAmount;
      if (remaining > 0 && tx.expectedReturnDate) {
        if (isOverdue(tx.expectedReturnDate)) {
          const isLent = tx.type === 'LENT';
          const notifId = `notif-tx-overdue-${tx.id}`;
          list.push({
            id: notifId,
            title: isLent ? 'Repayment Overdue' : 'Payback Overdue',
            message: isLent
              ? `${formatCurrency(remaining, profile.currency)} payment from ${tx.personName} is past the expected date.`
              : `You borrowed ${formatCurrency(remaining, profile.currency)} from ${tx.personName} — repayment was due.`,
            type: 'alert',
            linkTab: 'money',
            entityId: tx.id,
            isRead: readNotifications.includes(notifId),
            createdAt: tx.expectedReturnDate,
          });
        }
      }
    });

    return list;
  }, [tasks, transactions, profile.currency, readNotifications]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    setReadNotifications((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifications((prev) => Array.from(new Set([...prev, ...allIds])));
    showToast('All notifications marked as read', 'info');
  }, [notifications, showToast]);

  const dismissNotification = useCallback((id: string) => {
    setReadNotifications((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // CRUD Tasks
  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    apiAddTask(newTask);
    addActivity({
      type: 'task',
      action: 'Created task',
      description: `Created task "${newTask.title}"`,
      entityId: newTask.id,
    });
    showToast(`Task created: "${newTask.title}"`, 'success');
    return newTask;
  }, [addActivity, showToast]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          return updated;
        }
        return t;
      })
    );
    apiUpdateTask(id, updates);
    showToast('Task updated', 'info');
  }, [showToast]);

  const deleteTask = useCallback((id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    apiDeleteTask(id);
    if (taskToDelete) {
      addActivity({
        type: 'task',
        action: 'Deleted task',
        description: `Deleted task "${taskToDelete.title}"`,
      });
      showToast('Task deleted', 'info');
    }
  }, [tasks, addActivity, showToast]);

  const toggleTaskStatus = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'completed';
          const nextStatus = isDone ? 'todo' : 'completed';
          const completedAt = isDone ? undefined : new Date().toISOString();
          apiUpdateTask(id, { status: nextStatus, completedAt });
          if (!isDone) {
            triggerCelebration();
            showToast(`Task completed! 🎉`, 'success');
            addActivity({
              type: 'task',
              action: 'Completed task',
              description: `Completed "${t.title}"`,
              entityId: t.id,
            });
          } else {
            showToast(`Task reopened: "${t.title}"`, 'info');
          }
          return {
            ...t,
            status: nextStatus,
            completedAt,
          };
        }
        return t;
      })
    );
  }, [triggerCelebration, showToast, addActivity]);

  // CRUD People
  const addPerson = useCallback((personData: Omit<Person, 'id' | 'createdAt'>) => {
    const newPerson: Person = {
      ...personData,
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setPeople((prev) => [...prev, newPerson]);
    apiAddPerson(newPerson);
    addActivity({
      type: 'person',
      action: 'Added person',
      description: `Added "${newPerson.name}" to contacts`,
      entityId: newPerson.id,
    });
    showToast(`Added ${newPerson.name} to people`, 'success');
    return newPerson;
  }, [addActivity, showToast]);

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          // If name changed, keep transactions denormalized name in sync
          if (updates.name && updates.name !== p.name) {
            setTransactions((txs) =>
              txs.map((tx) => (tx.personId === id ? { ...tx, personName: updates.name! } : tx))
            );
          }
          return updated;
        }
        return p;
      })
    );
    apiUpdatePerson(id, updates);
    showToast('Contact details updated', 'info');
  }, [showToast]);

  const deletePerson = useCallback((id: string) => {
    const person = people.find((p) => p.id === id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
    apiDeletePerson(id);
    if (person) {
      showToast(`Removed ${person.name}`, 'info');
    }
  }, [people, showToast]);

  // CRUD Money Transactions
  const addTransaction = useCallback((txData: Omit<MoneyTransaction, 'id' | 'createdAt' | 'paidAmount' | 'paymentHistory'>) => {
    const newTx: MoneyTransaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      paidAmount: 0,
      paymentHistory: [],
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    apiAddTransaction(newTx);

    const isLent = newTx.type === 'LENT';
    const actionLabel = isLent ? 'Lent money' : 'Borrowed money';
    const desc = isLent
      ? `Lent ${formatCurrency(newTx.amount, profile.currency)} to ${newTx.personName}`
      : `Borrowed ${formatCurrency(newTx.amount, profile.currency)} from ${newTx.personName}`;

    addActivity({
      type: 'money',
      action: actionLabel,
      description: desc,
      entityId: newTx.id,
    });
    showToast(desc, 'success');
    return newTx;
  }, [profile.currency, addActivity, showToast]);

  const updateTransaction = useCallback((id: string, updates: Partial<MoneyTransaction>) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          // Re-evaluate status based on paid amount
          if (updates.paidAmount !== undefined || updates.amount !== undefined) {
            const paid = updates.paidAmount ?? t.paidAmount;
            const total = updates.amount ?? t.amount;
            if (paid >= total) {
              updated.status = 'paid';
            } else if (paid > 0) {
              updated.status = 'partially_paid';
            } else if (isOverdue(updated.expectedReturnDate)) {
              updated.status = 'overdue';
            } else {
              updated.status = 'pending';
            }
          }
          return updated;
        }
        return t;
      })
    );
    apiUpdateTransaction(id, updates);
    showToast('Transaction updated', 'info');
  }, [showToast]);

  const deleteTransaction = useCallback((id: string) => {
    const tx = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    apiDeleteTransaction(id);
    if (tx) {
      showToast('Transaction removed', 'info');
    }
  }, [transactions, showToast]);

  const recordPayment = useCallback((id: string, amount: number, note?: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newPaidAmount = Math.min(t.amount, t.paidAmount + amount);
          const isFullySettled = newPaidAmount >= t.amount;
          const status = isFullySettled ? 'paid' : 'partially_paid';

          const newHistoryItem = {
            id: `pay-${Date.now()}`,
            amount,
            date: getTodayDateString(),
            note: note || (isFullySettled ? 'Fully settled payment' : 'Partial payment'),
          };

          const isLent = t.type === 'LENT';
          const actionText = isLent ? 'Received repayment' : 'Paid back';
          const desc = isLent
            ? `Received ${formatCurrency(amount, profile.currency)} from ${t.personName}`
            : `Paid ${formatCurrency(amount, profile.currency)} to ${t.personName}`;

          addActivity({
            type: 'money',
            action: actionText,
            description: desc,
            entityId: t.id,
          });

          if (isFullySettled) {
            triggerCelebration();
            showToast(`Settled in full! ${desc}`, 'success');
          } else {
            showToast(`Recorded: ${desc}`, 'success');
          }

          return {
            ...t,
            paidAmount: newPaidAmount,
            status,
            paymentHistory: [newHistoryItem, ...(t.paymentHistory || [])],
          };
        }
        return t;
      })
    );
    apiRecordPayment(id, amount, note);
  }, [profile.currency, addActivity, showToast, triggerCelebration]);

  // CRUD Notes
  const addNote = useCallback((noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [newNote, ...prev]);
    apiAddNote(newNote);
    addActivity({
      type: 'note',
      action: 'Created note',
      description: `Created note "${newNote.title}"`,
      entityId: newNote.id,
    });
    showToast(`Note "${newNote.title}" saved`, 'success');
    return newNote;
  }, [addActivity, showToast]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return n;
      })
    );
    apiUpdateNote(id, updates);
    showToast('Note updated', 'info');
  }, [showToast]);

  const deleteNote = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    apiDeleteNote(id);
    if (note) {
      showToast('Note deleted', 'info');
    }
  }, [notes, showToast]);

  const togglePinNote = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const isPin = !n.isPinned;
          apiUpdateNote(id, { isPinned: isPin });
          showToast(isPin ? 'Note pinned to top' : 'Note unpinned', 'info');
          return { ...n, isPinned: isPin };
        }
        return n;
      })
    );
  }, [showToast]);

  // Profile update
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    apiUpdateProfile(updates);
    showToast('Preferences updated', 'success');
  }, [showToast]);

  // Calculated Stats
  const stats = useMemo(() => {
    let totalLent = 0;
    let totalBorrowed = 0;
    let totalReceived = 0;
    let totalPendingLent = 0;
    let totalPendingBorrowed = 0;

    transactions.forEach((tx) => {
      const remaining = Math.max(0, tx.amount - tx.paidAmount);
      if (tx.type === 'LENT') {
        totalLent += tx.amount;
        totalReceived += tx.paidAmount;
        totalPendingLent += remaining;
      } else {
        totalBorrowed += tx.amount;
        totalPendingBorrowed += remaining;
      }
    });

    const today = getTodayDateString();
    const tasksTodayCount = tasks.filter((t) => t.dueDate === today).length;
    const tasksCompletedCount = tasks.filter((t) => t.status === 'completed').length;
    const tasksPendingCount = tasks.filter((t) => t.status !== 'completed').length;
    const tasksOverdueCount = tasks.filter((t) => t.status !== 'completed' && isOverdue(t.dueDate)).length;

    // People owing me vs people I owe
    const peopleBalanceMap: Record<string, number> = {};
    transactions.forEach((tx) => {
      const remaining = Math.max(0, tx.amount - tx.paidAmount);
      if (!peopleBalanceMap[tx.personId]) peopleBalanceMap[tx.personId] = 0;
      if (tx.type === 'LENT') {
        peopleBalanceMap[tx.personId] += remaining;
      } else {
        peopleBalanceMap[tx.personId] -= remaining;
      }
    });

    let peopleOwingCount = 0;
    let peopleOwedCount = 0;
    Object.values(peopleBalanceMap).forEach((bal) => {
      if (bal > 0) peopleOwingCount++;
      if (bal < 0) peopleOwedCount++;
    });

    return {
      totalLent,
      totalBorrowed,
      totalReceived,
      totalPending: totalPendingLent, // pending money to receive back
      totalPendingBorrowed,
      tasksTodayCount,
      tasksCompletedCount,
      tasksPendingCount,
      tasksOverdueCount,
      peopleOwingCount,
      peopleOwedCount,
    };
  }, [transactions, tasks]);

  // Person stats helper
  const getPersonStats = useCallback(
    (personId: string) => {
      const personTxs = transactions.filter((t) => t.personId === personId);
      let totalLent = 0;
      let totalReceived = 0;
      let totalBorrowed = 0;
      let totalPaidToThem = 0;
      let activeCount = 0;
      let lastDate: string | undefined;

      personTxs.forEach((tx) => {
        if (!lastDate || tx.date > lastDate) lastDate = tx.date;
        const remaining = tx.amount - tx.paidAmount;
        if (remaining > 0) activeCount++;

        if (tx.type === 'LENT') {
          totalLent += tx.amount;
          totalReceived += tx.paidAmount;
        } else {
          totalBorrowed += tx.amount;
          totalPaidToThem += tx.paidAmount;
        }
      });

      // Net balance: positive means they owe me; negative means I owe them
      const netBalance = (totalLent - totalReceived) - (totalBorrowed - totalPaidToThem);

      return {
        totalLent,
        totalReceived,
        totalBorrowed,
        totalPaidToThem,
        netBalance,
        activeTransactionsCount: activeCount,
        lastTransactionDate: lastDate,
      };
    },
    [transactions]
  );

  // System actions
  const resetToSampleData = useCallback(() => {
    setProfile(initialProfile);
    setTasks(initialTasks);
    setPeople(initialPeople);
    setTransactions(initialTransactions);
    setNotes(initialNotes);
    setActivities(initialActivities);
    setReadNotifications([]);
    showToast('Reset to original sample data', 'info');
  }, [showToast]);

  const clearAllData = useCallback(() => {
    setTasks([]);
    setPeople([]);
    setTransactions([]);
    setNotes([]);
    setActivities([]);
    setReadNotifications([]);
    showToast('Cleared all data', 'warning');
  }, [showToast]);

  const exportDataJSON = useCallback(() => {
    const data = {
      profile,
      tasks,
      people,
      transactions,
      notes,
      activities,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(data, null, 2);
  }, [profile, tasks, people, transactions, notes, activities]);

  const importDataJSON = useCallback(
    (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.tasks && Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
        if (parsed.people && Array.isArray(parsed.people)) setPeople(parsed.people);
        if (parsed.transactions && Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (parsed.notes && Array.isArray(parsed.notes)) setNotes(parsed.notes);
        if (parsed.profile) setProfile(parsed.profile);
        showToast('Data imported successfully!', 'success');
        return true;
      } catch (err) {
        showToast('Invalid JSON backup file', 'error');
        return false;
      }
    },
    [showToast]
  );

  // Modal helpers
  const openTaskModal = useCallback((task?: Task) => setTaskModal({ isOpen: true, task }), []);
  const closeTaskModal = useCallback(() => setTaskModal({ isOpen: false }), []);

  const openTransactionModal = useCallback((opts?: { transaction?: MoneyTransaction; initialType?: 'LENT' | 'BORROWED'; initialPersonId?: string }) => {
    setTransactionModal({
      isOpen: true,
      transaction: opts?.transaction,
      initialType: opts?.initialType,
      initialPersonId: opts?.initialPersonId,
    });
  }, []);
  const closeTransactionModal = useCallback(() => setTransactionModal({ isOpen: false }), []);

  const openPaymentModal = useCallback((transaction: MoneyTransaction) => setPaymentModal({ isOpen: true, transaction }), []);
  const closePaymentModal = useCallback(() => setPaymentModal({ isOpen: false }), []);

  const openPersonModal = useCallback((person?: Person) => setPersonModal({ isOpen: true, person }), []);
  const closePersonModal = useCallback(() => setPersonModal({ isOpen: false }), []);

  const openPersonDetail = useCallback((personId: string) => setPersonDetailId(personId), []);
  const closePersonDetail = useCallback(() => setPersonDetailId(null), []);

  const openNoteModal = useCallback((opts?: { note?: Note; initialPersonId?: string; initialTaskId?: string }) => {
    setNoteModal({
      isOpen: true,
      note: opts?.note,
      initialPersonId: opts?.initialPersonId,
      initialTaskId: opts?.initialTaskId,
    });
  }, []);
  const closeNoteModal = useCallback(() => setNoteModal({ isOpen: false }), []);

  return (
    <AppContext.Provider
      value={{
        // Auth
        currentUser,
        isAuthenticated,
        login,
        register,
        logout,

        // Navigation
        activeTab,
        setActiveTab,
        sidebarCollapsed,
        setSidebarCollapsed,
        searchOpen,
        setSearchOpen,
        quickAddOpen,
        setQuickAddOpen,
        notificationOpen,
        setNotificationOpen,

        taskModal,
        openTaskModal,
        closeTaskModal,

        transactionModal,
        openTransactionModal,
        closeTransactionModal,

        paymentModal,
        openPaymentModal,
        closePaymentModal,

        personModal,
        openPersonModal,
        closePersonModal,

        personDetailId,
        openPersonDetail,
        closePersonDetail,

        noteModal,
        openNoteModal,
        closeNoteModal,

        profile,
        updateProfile,
        tasks,
        people,
        transactions,
        notes,
        activities,
        notifications,
        unreadNotificationCount,

        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,

        addPerson,
        updatePerson,
        deletePerson,

        addTransaction,
        updateTransaction,
        deleteTransaction,
        recordPayment,

        addNote,
        updateNote,
        deleteNote,
        togglePinNote,

        addActivity,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        dismissNotification,

        stats,
        getPersonStats,

        mongoStatus,
        retryMongoConnection,

        toasts,
        showToast,
        removeToast,

        triggerCelebration,
        resetToSampleData,
        clearAllData,
        exportDataJSON,
        importDataJSON,
        authLogs,
        clearAuthLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
