import {
  Task,
  Person,
  MoneyTransaction,
  Note,
  ActivityItem,
  UserProfile,
  RegisterFormData,
  AdminUser,
  AdminActivityItem,
  AdminOverviewStats,
  AdminUsersResponse,
  AdminActivityResponse,
} from '../types';

/**
 * Resolves the backend API base endpoint.
 * - In production (or when VITE_API_URL is configured), routes API calls to the Render backend.
 * - In local development (when VITE_API_URL is omitted), defaults to '/api' to use Vite's local dev proxy.
 * - Strips any trailing slashes and ensures '/api' is correctly included without duplication or omission.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();

  // If VITE_API_URL is provided, normalize and use it.
  // In production without VITE_API_URL, default to the Render backend service.
  // In local development without VITE_API_URL, default to empty to route through Vite's local '/api' proxy.
  const targetUrl = envUrl || (import.meta.env.PROD ? 'https://life-organizer-gmpc.onrender.com' : '');

  if (!targetUrl) {
    return '/api';
  }

  // Strip trailing slashes
  const cleanUrl = targetUrl.replace(/\/+$/, '');

  // If the URL already ends with /api, use it as is; otherwise append /api
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}

export const API_BASE = getApiBaseUrl();
const AUTH_TOKEN_KEY = 'dayledger_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {}
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ==================== AUTH & LOGS ====================
export interface AuthResponse {
  token: string;
  user: {
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
  };
  message?: string;
  isOfflineSession?: boolean;
}

const REGISTERED_USERS_KEY = 'dayledger_registered_users';
export const AUTH_LOGS_KEY = 'dayledger_auth_logs';

export interface StoredUserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  dateOfBirth?: string;
  password: string;
  currency: string;
  currencyCode: string;
  createdAt: string;
}

// Get all local registered users
export function getStoredUsers(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) {
      // Seed default test account
      const defaultUsers: StoredUserAccount[] = [
        {
          id: 'user_test_default',
          name: 'Test Account',
          email: 'test@dayledger.app',
          phone: '+919876543210',
          age: 24,
          dateOfBirth: '2002-05-15',
          password: 'password123',
          currency: '₹',
          currencyCode: 'INR',
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Save local registered user
export function saveStoredUser(user: StoredUserAccount): void {
  try {
    const users = getStoredUsers();
    const existingIdx = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (existingIdx >= 0) {
      users[existingIdx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch {}
}

// Get all stored auth logs
export function getStoredAuthLogs(): any[] {
  try {
    const raw = localStorage.getItem(AUTH_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Record an auth log entry
export function recordAuthLogEntry(
  type: 'LOGIN' | 'LOGOUT' | 'REGISTER',
  email: string,
  name: string,
  details: string = ''
): any {
  try {
    const logs = getStoredAuthLogs();
    const newLog = {
      id: `auth_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      email: email || 'unknown',
      name: name || 'User',
      timestamp: new Date().toISOString(),
      details,
    };
    logs.unshift(newLog);
    // Keep last 150 entries
    if (logs.length > 150) logs.pop();
    localStorage.setItem(AUTH_LOGS_KEY, JSON.stringify(logs));
    return newLog;
  } catch {
    return null;
  }
}

export async function apiRegister(data: RegisterFormData): Promise<AuthResponse> {
  const normalizedEmail = data.email.toLowerCase().trim();
  const normalizedPhone = data.phone ? data.phone.replace(/[\s\-\(\)\.]/g, '').trim() : '';

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        email: normalizedEmail,
        phone: normalizedPhone,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const body = await res.json();
      // Store in local accounts list as well for fallback
      saveStoredUser({
        id: body.user.id,
        name: body.user.name,
        email: normalizedEmail,
        phone: body.user.phone || normalizedPhone,
        age: body.user.age || Number(data.age),
        dateOfBirth: body.user.dateOfBirth || data.dateOfBirth,
        password: data.password,
        currency: body.user.currency || '₹',
        currencyCode: body.user.currencyCode || 'INR',
        createdAt: new Date().toISOString(),
      });
      recordAuthLogEntry('REGISTER', normalizedEmail, data.name.trim(), `Registered in MongoDB (Phone: ${normalizedPhone})`);
      return body;
    } else {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Registration failed');
    }
  } catch (err: any) {
    // If it's a validation error from server, rethrow
    if (err.message && (err.message.includes('already exists') || err.message.includes('inconsistent') || err.message.includes('required') || err.message.includes('match'))) {
      throw err;
    }

    // Offline / Standalone Fallback
    const existingUsers = getStoredUsers();
    if (existingUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email already exists.');
    }
    if (normalizedPhone && existingUsers.some((u) => u.phone === normalizedPhone)) {
      throw new Error('An account with this phone number already exists.');
    }

    const dummyId = `user_${Date.now()}`;
    const newUser: StoredUserAccount = {
      id: dummyId,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      age: Number(data.age),
      dateOfBirth: data.dateOfBirth,
      password: data.password,
      currency: '₹',
      currencyCode: 'INR',
      createdAt: new Date().toISOString(),
    };
    saveStoredUser(newUser);

    const token = `offline_token_${dummyId}_${Date.now()}`;
    recordAuthLogEntry('REGISTER', normalizedEmail, data.name.trim(), 'Registered in Local Session');

    return {
      token,
      isOfflineSession: true,
      message: 'Account created successfully (Local Storage)',
      user: {
        id: dummyId,
        name: data.name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        age: Number(data.age),
        dateOfBirth: data.dateOfBirth,
        currency: '₹',
        currencyCode: 'INR',
      },
    };
  }
}

export async function apiLogin(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const normalizedEmail = data.email.toLowerCase().trim();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const body = await res.json();
      saveStoredUser({
        id: body.user.id,
        name: body.user.name,
        email: normalizedEmail,
        password: data.password,
        currency: body.user.currency || '₹',
        currencyCode: body.user.currencyCode || 'INR',
        createdAt: new Date().toISOString(),
      });
      recordAuthLogEntry('LOGIN', normalizedEmail, body.user.name, 'Signed in via Server API');
      return body;
    } else {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Invalid credentials');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Invalid')) {
      throw err;
    }

    // Offline / Standalone Fallback: check stored local users
    const users = getStoredUsers();
    const matched = users.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.password === data.password
    );

    if (matched) {
      const token = `offline_token_${matched.id}_${Date.now()}`;
      recordAuthLogEntry('LOGIN', matched.email, matched.name, 'Signed in via Local Storage');
      return {
        token,
        isOfflineSession: true,
        message: 'Signed in successfully (Offline Session)',
        user: {
          id: matched.id,
          name: matched.name,
          email: matched.email,
          currency: matched.currency || '₹',
          currencyCode: matched.currencyCode || 'INR',
        },
      };
    }

    // Check default test credentials
    if (
      normalizedEmail === 'test@dayledger.app' &&
      data.password === 'password123'
    ) {
      const token = `offline_token_test_${Date.now()}`;
      recordAuthLogEntry('LOGIN', normalizedEmail, 'Test Account', 'Quick Test Login');
      return {
        token,
        isOfflineSession: true,
        message: 'Signed in as Test Account',
        user: {
          id: 'user_test_default',
          name: 'Test Account',
          email: normalizedEmail,
          currency: '₹',
          currencyCode: 'INR',
        },
      };
    }

    throw new Error('Invalid email or password. Please verify your credentials.');
  }
}

export async function apiLogout(email?: string, name?: string, userId?: string): Promise<void> {
  recordAuthLogEntry('LOGOUT', email || 'User', name || 'Active Session', 'User logged out');
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, name, userId }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Ignore server error on logout
  }
}

export async function apiGetMe(): Promise<UserProfile | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.user || null;
  } catch {
    return null;
  }
}

// ==================== HEALTH & STATE ====================
export async function checkBackendHealth(): Promise<{
  connected: boolean;
  status: 'connected' | 'disconnected' | 'offline';
  database?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { connected: false, status: 'disconnected' };
    const data = await res.json();
    const isDbConnected = data.database === 'connected' || Boolean(data.database);
    return {
      connected: data.status === 'ok' || data.status === 'connected',
      status: isDbConnected ? 'connected' : 'disconnected',
      database: data.database,
    };
  } catch {
    return { connected: false, status: 'offline' };
  }
}

export async function fetchAllData(): Promise<{
  tasks: Task[];
  people: Person[];
  transactions: MoneyTransaction[];
  notes: Note[];
  activities: ActivityItem[];
  profile: UserProfile;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/all`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Tasks
export async function apiAddTask(task: Task): Promise<void> {
  fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(task),
  }).catch(() => {});
}

export async function apiUpdateTask(id: string, updates: Partial<Task>): Promise<void> {
  fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  }).catch(() => {});
}

export async function apiDeleteTask(id: string): Promise<void> {
  fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).catch(() => {});
}

// People
export async function apiAddPerson(person: Person): Promise<void> {
  fetch(`${API_BASE}/people`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(person),
  }).catch(() => {});
}

export async function apiUpdatePerson(id: string, updates: Partial<Person>): Promise<void> {
  fetch(`${API_BASE}/people/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  }).catch(() => {});
}

export async function apiDeletePerson(id: string): Promise<void> {
  fetch(`${API_BASE}/people/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).catch(() => {});
}

// Transactions
export async function apiAddTransaction(tx: MoneyTransaction): Promise<void> {
  fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(tx),
  }).catch(() => {});
}

export async function apiUpdateTransaction(id: string, updates: Partial<MoneyTransaction>): Promise<void> {
  fetch(`${API_BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  }).catch(() => {});
}

export async function apiDeleteTransaction(id: string): Promise<void> {
  fetch(`${API_BASE}/transactions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).catch(() => {});
}

export async function apiRecordPayment(id: string, amount: number, note?: string): Promise<void> {
  fetch(`${API_BASE}/transactions/${id}/payment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ amount, note }),
  }).catch(() => {});
}

// Notes
export async function apiAddNote(note: Note): Promise<void> {
  fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(note),
  }).catch(() => {});
}

export async function apiUpdateNote(id: string, updates: Partial<Note>): Promise<void> {
  fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  }).catch(() => {});
}

export async function apiDeleteNote(id: string): Promise<void> {
  fetch(`${API_BASE}/notes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).catch(() => {});
}

// Activities
export async function apiAddActivity(activity: ActivityItem): Promise<void> {
  fetch(`${API_BASE}/activities`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(activity),
  }).catch(() => {});
}

// Profile
export async function apiUpdateProfile(profile: Partial<UserProfile>): Promise<void> {
  fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profile),
  }).catch(() => {});
}

// Seed / Bulk Sync
export async function apiSeedDatabase(data: any): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/seed`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ==================== ADMIN API ====================

export async function adminGetOverview(): Promise<AdminOverviewStats> {
  const res = await fetch(`${API_BASE}/admin/overview`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Admin overview request failed (${res.status})`);
  }
  return res.json();
}

export async function adminGetUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<AdminUsersResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.role) q.set('role', params.role);
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE}/admin/users?${q.toString()}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Admin users request failed (${res.status})`);
  }
  return res.json();
}

export async function adminGetUserDetail(id: string): Promise<{
  user: AdminUser;
  recentActivity: AdminActivityItem[];
}> {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Admin user detail request failed (${res.status})`);
  }
  return res.json();
}

export async function adminUpdateUserRole(id: string, role: 'user' | 'admin'): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ role }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Admin role update failed (${res.status})`);
  }
  const data = await res.json();
  return data.user;
}

export async function adminGetActivity(params: {
  page?: number;
  limit?: number;
  eventType?: string;
  search?: string;
} = {}): Promise<AdminActivityResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.eventType) q.set('eventType', params.eventType);
  if (params.search) q.set('search', params.search);

  const res = await fetch(`${API_BASE}/admin/activity?${q.toString()}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Admin activity request failed (${res.status})`);
  }
  return res.json();
}

export async function adminExportUsers(format: 'csv' | 'json' = 'csv'): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/admin/export/users?format=${format}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to export user data.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dayledger-users-${Date.now()}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function apiRecordSessionExpired(email?: string, name?: string, userId?: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/session-expired`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, userId }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {}
}

