import React from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import {
  LayoutDashboard,
  CheckSquare,
  WalletCards,
  Users,
  FileText,
  Menu,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'money', label: 'Money', icon: WalletCards },
    { id: 'people', label: 'People', icon: Users },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-zinc-200/80 px-2 py-1.5 flex items-center justify-around safe-area-pb">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              isActive ? 'text-indigo-600 font-semibold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-indigo-600' : 'text-zinc-400'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* Settings / More tab */}
      <button
        onClick={() => setActiveTab('settings')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
          activeTab === 'settings' || activeTab === 'activity'
            ? 'text-indigo-600 font-semibold'
            : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Menu className="w-4 h-4 mb-0.5" />
        <span>More</span>
      </button>
    </nav>
  );
};
