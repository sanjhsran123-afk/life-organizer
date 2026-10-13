import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Settings,
  User,
  Coins,
  Palette,
  Database,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Shield,
  History,
  Sparkles,
  LogOut,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    currentUser,
    logout,
    exportDataJSON,
    importDataJSON,
    resetToSampleData,
    clearAllData,
    tasks,
    transactions,
    people,
    notes,
    mongoStatus,
    retryMongoConnection,
    authLogs,
    clearAuthLogs,
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [currencySymbol, setCurrencySymbol] = useState(profile.currency);
  const [currencyCode, setCurrencyCode] = useState(profile.currencyCode);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim() || 'Madhav',
      email: email.trim() || 'madhav@dayledger.app',
      currency: currencySymbol,
      currencyCode: currencyCode,
    });
  };

  const handleCurrencyChange = (val: string) => {
    const map: Record<string, { symbol: string; code: string }> = {
      INR: { symbol: '₹', code: 'INR' },
      USD: { symbol: '$', code: 'USD' },
      EUR: { symbol: '€', code: 'EUR' },
      GBP: { symbol: '£', code: 'GBP' },
      CAD: { symbol: 'CA$', code: 'CAD' },
      AUD: { symbol: 'AU$', code: 'AUD' },
      JPY: { symbol: '¥', code: 'JPY' },
    };
    if (map[val]) {
      setCurrencySymbol(map[val].symbol);
      setCurrencyCode(map[val].code);
      updateProfile({
        currency: map[val].symbol,
        currencyCode: map[val].code,
      });
    }
  };

  const handleExport = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DayLedger_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importDataJSON(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportAuthLogs = () => {
    const jsonStr = JSON.stringify(authLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DayLedger_Auth_Logs_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">
          Settings & Preferences
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Customize your profile, regional currency, and local data persistence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-zinc-900">User Account</h3>
            </div>
            {currentUser && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Logged In
              </span>
            )}
          </div>

          <form onSubmit={handleProfileSubmit} className="pt-4 space-y-3.5">
            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              hint="Shown in the dashboard greeting and contacts"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />

            {currentUser && (
              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60 text-zinc-600">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Phone Number</span>
                  <span className="font-semibold text-zinc-800">{currentUser.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Age / Date of Birth</span>
                  <span className="font-semibold text-zinc-800">
                    {currentUser.age ? `${currentUser.age} yrs` : 'N/A'} {currentUser.dateOfBirth ? `(${currentUser.dateOfBirth})` : ''}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button type="submit" size="sm" variant="primary">
                Save Profile
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />}
                onClick={logout}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                Log Out
              </Button>
            </div>
          </form>
        </Card>

        {/* Currency & Region Card */}
        <Card>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Coins className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-zinc-900">Currency & Formatting</h3>
          </div>

          <div className="pt-4 space-y-4">
            <Select
              label="Preferred Currency"
              value={currencyCode}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              options={[
                { value: 'INR', label: '₹ Indian Rupee (INR)' },
                { value: 'USD', label: '$ US Dollar (USD)' },
                { value: 'EUR', label: '€ Euro (EUR)' },
                { value: 'GBP', label: '£ British Pound (GBP)' },
                { value: 'CAD', label: 'CA$ Canadian Dollar (CAD)' },
                { value: 'AUD', label: 'AU$ Australian Dollar (AUD)' },
                { value: 'JPY', label: '¥ Japanese Yen (JPY)' },
              ]}
              hint="All ledger balances and transactions will format using this symbol"
            />

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-800 block mb-1">Preview Format:</span>
              <span>
                Sample: {currencySymbol}2,500.00 • Active code: {currencyCode}
              </span>
            </div>
          </div>
        </Card>

        {/* Appearance & Design Theme */}
        <Card>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Palette className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-zinc-900">Design Aesthetic</h3>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200/80 bg-indigo-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Premium Light Mode</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Minimal, airy, high-contrast typography and subtle borders
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-700">Active</span>
            </div>

            <div className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200/60">
              <p>
                Crafted following the modern design principles of Linear, Notion, and Apple:
                8px grid system, rounded-2xl cards, gentle elevation shadows, and micro-interactions.
              </p>
            </div>
          </div>
        </Card>

        {/* MongoDB Backend Card */}
        <Card>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Database className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-zinc-900">MongoDB Database</h3>
          </div>

          <div className="pt-4 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Connection Target:</span>
              <code className="text-indigo-600 font-mono text-[11px] bg-zinc-100 px-2 py-0.5 rounded">
                mongodb://localhost:27017/dayledger
              </code>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    mongoStatus.status === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">
                    {mongoStatus.status === 'connected'
                      ? 'Connected to MongoDB'
                      : 'Dual-Persisted (localStorage + Ready for MongoDB)'}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {mongoStatus.status === 'connected'
                      ? `Database "${mongoStatus.database || 'dayledger'}" is active`
                      : 'Backend server configured with Mongoose models & REST API'}
                  </p>
                </div>
              </div>

              <Button
                size="xs"
                variant="outline"
                icon={<RotateCcw className="w-3 h-3" />}
                onClick={retryMongoConnection}
              >
                Check
              </Button>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200/60 space-y-1">
              <p className="font-semibold text-zinc-700">How to launch backend server:</p>
              <p>Run <code className="bg-zinc-200/60 px-1 rounded text-zinc-800">npm run server</code> to start the Express API on port 5000.</p>
              <p>Ensure MongoDB is active on <code className="bg-zinc-200/60 px-1 rounded text-zinc-800">localhost:27017</code>.</p>
            </div>
          </div>
        </Card>

        {/* Data Persistence & Backups */}
        <Card>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Database className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-zinc-900">Data Persistence & Backups</h3>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Local Storage:</span>
              <span className="font-semibold text-zinc-800">Active (Instant sync)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
              <div className="p-2 bg-zinc-50 rounded-lg">
                <span className="block text-[10px] text-zinc-400">Tasks</span>
                <span className="font-bold text-zinc-800">{tasks.length} items</span>
              </div>
              <div className="p-2 bg-zinc-50 rounded-lg">
                <span className="block text-[10px] text-zinc-400">Transactions</span>
                <span className="font-bold text-zinc-800">{transactions.length} entries</span>
              </div>
              <div className="p-2 bg-zinc-50 rounded-lg">
                <span className="block text-[10px] text-zinc-400">Contacts</span>
                <span className="font-bold text-zinc-800">{people.length} people</span>
              </div>
              <div className="p-2 bg-zinc-50 rounded-lg">
                <span className="block text-[10px] text-zinc-400">Notes</span>
                <span className="font-bold text-zinc-800">{notes.length} notes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
              <Button
                size="sm"
                variant="outline"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExport}
                className="flex-1 text-xs"
              >
                Export JSON
              </Button>

              <Button
                size="sm"
                variant="outline"
                icon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 text-xs"
              >
                Import JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex-1 text-xs"
              >
                Load Test Data
              </Button>

              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setIsClearConfirmOpen(true)}
                className="flex-1 text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
        </Card>

        {/* Security & Authentication Logs Card */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-zinc-900">Security & Authentication History</h3>
            </div>
            <span className="text-xs text-zinc-500 font-medium">
              {authLogs.length} events logged
            </span>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <p>
                Every sign-in, account creation, and sign-out event is permanently saved locally and on the server.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  icon={<Download className="w-3 h-3" />}
                  onClick={handleExportAuthLogs}
                >
                  Export Logs
                </Button>
                {authLogs.length > 0 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={clearAuthLogs}
                    className="text-zinc-400 hover:text-rose-600"
                  >
                    Clear History
                  </Button>
                )}
              </div>
            </div>

            {authLogs.length === 0 ? (
              <div className="p-4 bg-zinc-50 rounded-xl text-center text-xs text-zinc-400">
                No authentication events recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {authLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/70 hover:bg-zinc-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          log.type === 'LOGIN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.type === 'LOGOUT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {log.type}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-800 mr-2">{log.name || 'User'}</span>
                        <span className="text-zinc-500 font-mono text-[11px] truncate">({log.email})</span>
                        {log.details && (
                          <span className="text-zinc-400 text-[11px] ml-2 hidden sm:inline">
                            • {log.details}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono shrink-0 ml-3">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Reset Confirmation */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetToSampleData}
        title="Load Starter Test Data?"
        message="This will load a clean minimal starter task, contact, and transaction for quick feature testing."
        confirmLabel="Load Test Data"
        variant="warning"
      />

      {/* Clear All Confirmation */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={clearAllData}
        title="Clear All Data?"
        message="This will remove all tasks, contacts, transactions, and notes from localStorage. This action cannot be reversed."
        confirmLabel="Clear All Data"
        variant="danger"
      />
    </div>
  );
};
