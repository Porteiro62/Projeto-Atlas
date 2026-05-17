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
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
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
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-atlas-emerald/40 to-atlas-teal rounded-xl flex items-center justify-center border border-atlas-emerald/20">
            <div className="flex items-end gap-[2px]">
              <div className="w-1.5 h-2 bg-atlas-emerald/60 rounded-[1px]"></div>
              <div className="w-1.5 h-3.5 bg-atlas-emerald/80 rounded-[1px]"></div>
              <div className="w-1.5 h-5 bg-atlas-emerald rounded-[1px]"></div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[0.15em] text-white leading-none uppercase">
              Atlas
            </h1>
            <span className="text-[7px] uppercase tracking-[2px] font-bold text-atlas-emerald font-mono">
              FINANCEIRO
            </span>
          </div>
        </div>
        <p className="text-[8px] text-stone-500 font-bold uppercase tracking-widest leading-relaxed mt-2 opacity-60">
          Caminho • Patrimônio • Futuro
        </p>
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
          v1.4.2
        </p>
      </div>
    </aside>
  );
}
