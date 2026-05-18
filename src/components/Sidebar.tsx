import logoImg from '../assets/logo.png';
import React from 'react';
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  Home,
  ListOrdered,
  Settings,
  Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  appVersion: string | null;
}

export function Sidebar({ activeTab, setActiveTab, appVersion }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Panorama', icon: LayoutDashboard },
    { id: 'transactions', label: 'Histórico', icon: ListOrdered },
    { id: 'income', label: 'Receitas', icon: ArrowUpCircle },
    { id: 'expenses', label: 'Despesas', icon: ArrowDownCircle },
    { id: 'credit-card', label: 'Cartões', icon: CreditCard },
    { id: 'financing', label: 'Patrimônio', icon: Home },
  ];

  return (
    <aside className="w-64 atlas-sidebar flex flex-col h-screen sticky top-0 shrink-0">
      <div className="w-full overflow-hidden flex justify-center items-center">
        <img src={logoImg} className="w-full h-auto" alt="Logo" />
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-widest",
              activeTab === item.id
                ? "bg-atlas-teal text-atlas-emerald border border-atlas-emerald/20 shadow-lg shadow-black/40"
                : "text-stone-500 hover:text-atlas-cream hover:bg-atlas-teal/30"
            )}
          >
            <item.icon size={16} className={cn(activeTab === item.id ? "opacity-100" : "opacity-40")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-atlas-teal/20">
        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest text-center opacity-40">
          {appVersion ? `v${appVersion}` : '...'}
        </p>
      </div>
    </aside>
  );
}
