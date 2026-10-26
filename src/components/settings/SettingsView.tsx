import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { ConfirmModal } from '../common/ConfirmModal';
import {
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
  LogOut,
  Smartphone,
  Sun,
  Moon,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { useTheme } from '../../context/ThemeContext';
export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    currentUser,
    updateCurrentUser,
    showToast,
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

  const { isInstalled, isIPhone, triggerInstall } = usePwa();
  const { theme, setTheme } = useTheme();

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
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Settings & Preferences
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Customize your profile, regional currency, visual theme, and local data persistence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">User Account</h3>
            </div>
            {currentUser && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
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
              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                <div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Phone Number</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentUser.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Age / Date of Birth</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
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
                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
              >
                Log Out
              </Button>
            </div>
          </form>
        </Card>

        {/* Phone & Friend Privacy Card */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Phone & Friend Privacy
              </h3>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase font-bold tracking-wider">
                  Registered Number
                </span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {currentUser?.phone || 'No phone number provided'}
                </span>
              </div>
            </div>

            {/* Informational policy box */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5">
              <p>
                • Signed-in DayLedger users can search for registered accounts by exact normalized phone number or exact full name.
              </p>
              <p>
                • Your phone number and email address are never exposed in search results.
              </p>
              <p>
                • Friend requests stay pending on the server until you sign in to accept or decline.
              </p>
            </div>
          </div>
        </Card>

        {/* Currency & Region Card */}
        <Card>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Currency & Formatting</h3>
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

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">Preview Format:</span>
              <span>
                Sample: {currencySymbol}2,500.00 • Active code: {currencyCode}
              </span>
            </div>
          </div>
        </Card>

        {/* Appearance & Design Theme */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Appearance & Theme</h3>
            </div>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Saved Setting
            </span>
          </div>

          <div className="pt-4 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select your preferred appearance. Your choice persists after closing and reopening the app.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Light Mode Option */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Sun className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Light Mode</span>
                  </div>
                  {theme === 'light' ? (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
                  Clean, crisp, high-contrast typography with airy white surfaces (Default).
                </p>
              </button>

              {/* Dark Mode Option */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Dark Mode</span>
                  </div>
                  {theme === 'dark' && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
                  Sleek, deep zinc surfaces tailored for low-light focus and comfort.
                </p>
              </button>
            </div>

            <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
              <p>
                Applied uniformly across the website, mobile PWA, and Capacitor builds. You can also toggle anytime using the Sun/Moon icon in the top navigation bar.
              </p>
            </div>
          </div>
        </Card>

        {/* Web App & Installation (PWA) Card */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Web App & Installation (PWA)</h3>
            </div>
            {isInstalled ? (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Installed
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                Ready to Install
              </span>
            )}
          </div>

          <div className="pt-4 space-y-3.5">
            {isInstalled ? (
              <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>DayLedger is running as an installed standalone app</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  App shell, assets, and icons are cached via the service worker. You have full
                  offline interface availability on this device.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Install DayLedger to your Home Screen or desktop for quick access, standalone
                  window mode, and offline cache support.
                </p>

                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/icons/icon-192.png"
                      alt="DayLedger"
                      className="w-8 h-8 rounded-lg shadow-2xs border border-zinc-200 dark:border-zinc-700"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">DayLedger Home Screen App</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {isIPhone ? 'Optimized for iPhone Safari' : 'Fast, native-like experience'}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={triggerInstall}
                  >
                    Install DayLedger
                  </Button>
                </div>
              </div>
            )}

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">PWA Specifications:</p>
              <p>• Web Manifest with standalone display mode and high-resolution maskable icons.</p>
              <p>• Apple mobile web app metadata for status bar and home screen icon.</p>
              <p>• Service worker app-shell caching (API requests remain strictly live & un-cached).</p>
            </div>
          </div>
        </Card>

        {/* MongoDB Backend Card */}
        <Card>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">MongoDB Database</h3>
          </div>

          <div className="pt-4 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Connection Target:</span>
              <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                mongodb://localhost:27017/dayledger
              </code>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    mongoStatus.status === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {mongoStatus.status === 'connected'
                      ? 'Connected to MongoDB'
                      : 'Dual-Persisted (localStorage + Ready for MongoDB)'}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
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

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">How to launch backend server:</p>
              <p>Run <code className="bg-zinc-200/60 dark:bg-zinc-700 px-1 rounded text-zinc-800 dark:text-zinc-200">npm run server</code> to start the Express API on port 5000.</p>
              <p>Ensure MongoDB is active on <code className="bg-zinc-200/60 dark:bg-zinc-700 px-1 rounded text-zinc-800 dark:text-zinc-200">localhost:27017</code>.</p>
            </div>
          </div>
        </Card>

        {/* Data Persistence & Backups */}
        <Card>
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Data Persistence & Backups</h3>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
              <span>Local Storage:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Active (Instant sync)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg">
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">Tasks</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{tasks.length} items</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg">
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">Transactions</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{transactions.length} entries</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg">
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">Contacts</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{people.length} people</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg">
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">Notes</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{notes.length} notes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Security & Authentication History</h3>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {authLogs.length} events logged
            </span>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              <p>
                Every sign-in, account creation, and sign-out event is permanently saved locally and on the server.
              </p>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
                    className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    Clear History
                  </Button>
                )}
              </div>
            </div>

            {authLogs.length === 0 ? (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center text-xs text-zinc-400 dark:text-zinc-500">
                No authentication events recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {authLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          log.type === 'LOGIN'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : log.type === 'LOGOUT'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                        }`}
                      >
                        {log.type}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 mr-1.5">{log.name || 'User'}</span>
                        <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px] truncate">({log.email})</span>
                        {log.details && (
                          <span className="text-zinc-400 dark:text-zinc-500 text-[11px] ml-2 hidden sm:inline">
                            • {log.details}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0 self-end sm:self-auto sm:ml-3">
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
