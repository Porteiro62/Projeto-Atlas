import React, { useState } from 'react';
import { CreditCard as CardIcon, ShieldCheck, Zap, Plus } from 'lucide-react';
import { TransactionForm } from '../transactions/TransactionForm';

export function CreditCardModule() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Cartões de Crédito</h2>
          <p className="text-stone-500 text-sm">Gerencie seus limites e faturas localmente.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-atlas-dark hover:bg-atlas-teal text-white px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-black/20 border border-atlas-emerald/20 font-bold text-sm"
        >
          <Plus size={20} className="text-atlas-emerald" />
          Nova Despesa de Cartão
        </button>
      </header>

      {isFormOpen && <TransactionForm onClose={() => setIsFormOpen(false)} initialType="credit_card" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="aspect-[1.58/1] bg-atlas-dark p-8 rounded-3xl border border-atlas-teal/30 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <CardIcon size={120} className="text-white" />
          </div>
          <div className="h-full flex flex-col justify-between relative z-10">
            <div className="flex justify-between items-start">
              <div className="w-12 h-10 bg-atlas-emerald/20 rounded-lg border border-atlas-emerald/30"></div>
              <span className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">VISA PLATINUM</span>
            </div>
            
            <div>
              <p className="text-[10px] text-stone-500 font-bold mb-1 uppercase tracking-widest">Limite Disponível</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">R$ 4.250,00</h3>
            </div>

            <div className="flex justify-between items-end">
              <span className="text-xs font-mono text-stone-400">•••• •••• •••• 4590</span>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-atlas-emerald/80"></div>
                <div className="w-8 h-8 rounded-full bg-atlas-teal/80"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-dashed border-stone-200 p-6 rounded-3xl flex flex-col justify-center items-center gap-4 cursor-pointer hover:bg-stone-50 transition-colors group">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:text-stone-900 transition-colors">
            <CardIcon size={24} />
          </div>
          <div className="text-center">
            <p className="font-bold text-stone-900 text-sm">Adicionar Cartão</p>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Novo limite disponível</p>
          </div>
        </div>
      </div>

      <div className="bg-stone-100 border border-stone-200 p-6 rounded-2xl flex items-center gap-4">
        <div className="p-3 bg-atlas-emerald/10 rounded-xl text-atlas-emerald">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Segurança de Arquitetura</h4>
          <p className="text-sm text-stone-500">Todos os dados do seu cartão são armazenados localmente e nunca saem do seu computador.</p>
        </div>
      </div>
    </div>
  );
}
