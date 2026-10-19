import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { QuickAddMenu } from './components/layout/QuickAddMenu';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksView } from './components/tasks/TasksView';
import { MoneyView } from './components/money/MoneyView';
import { PeopleView } from './components/people/PeopleView';
import { NotesView } from './components/notes/NotesView';
import { ActivityView } from './components/activity/ActivityView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminPanel } from './components/admin/AdminPanel';

// Modals
import { TaskModal } from './components/tasks/TaskModal';
import { TransactionModal } from './components/money/TransactionModal';
import { RecordPaymentModal } from './components/money/RecordPaymentModal';
import { PersonModal } from './components/people/PersonModal';
import { PersonDetailModal } from './components/people/PersonDetailModal';
import { NoteModal } from './components/notes/NoteModal';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthPage } from './components/auth/AuthPage';

const MainLayout: React.FC = () => {
  const { activeTab, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardView />;
      case 'tasks':
        return <TasksView />;
      case 'money':
        return <MoneyView />;
      case 'people':
        return <PeopleView />;
      case 'notes':
        return <NotesView />;
      case 'activity':
        return <ActivityView />;
      case 'settings':
        return <SettingsView />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col md:flex-row text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop / Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <TopNavbar />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-pop-in">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Modals & Command Palettes */}
      <CommandPalette />
      <NotificationDrawer />
      <QuickAddMenu />
      <TaskModal />
      <TransactionModal />
      <RecordPaymentModal />
      <PersonModal />
      <PersonDetailModal />
      <NoteModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
