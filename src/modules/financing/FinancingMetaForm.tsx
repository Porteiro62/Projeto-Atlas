import React, { useState } from 'react';
import { useFinanceStore, FinancingMeta } from '../../store/useFinanceStore';
import { X, Save, Target, Calendar, Wallet, Plus } from 'lucide-react';
import { CurrencyInput } from '../../components/CurrencyInput';

export function FinancingMetaForm({ onClose }: { onClose: () => void }) {
  const { financingMeta, updateFinancingMeta } = useFinanceStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FinancingMeta>(financingMeta);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    updateFinancingMeta(formData);
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-atlas-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-atlas-teal/20 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <header className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-900 text-white">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Configurar Meta</h3>
            <p className="text-[10px] text-atlas-emerald uppercase font-bold tracking-[2px]">Patrimônio Imobiliário</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={12} /> Valor Total da Meta
            </label>
            <CurrencyInput 
              value={formData.target}
              onChange={(val) => setFormData({ ...formData, target: val })}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 font-bold focus:ring-1 focus:ring-atlas-emerald outline-none transition-all"
              placeholder="Ex: R$ 500.000,00"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <Wallet size={12} /> Valor Inicial Acumulado
            </label>
            <CurrencyInput 
              value={formData.initialValue}
              onChange={(val) => setFormData({ ...formData, initialValue: val })}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 font-bold focus:ring-1 focus:ring-atlas-emerald outline-none transition-all"
              placeholder="Quanto você já tem?"
            />
            <p className="text-[9px] text-stone-400 font-medium">Este valor é somado aos aportes registrados.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <Plus size={12} /> Valor do Aporte Mensal
            </label>
            <CurrencyInput 
              value={formData.monthlyInstallment}
              onChange={(val) => setFormData({ ...formData, monthlyInstallment: val })}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 font-bold focus:ring-1 focus:ring-atlas-emerald outline-none transition-all"
              placeholder="Ex: R$ 2.000,00"
            />
            <p className="text-[9px] text-stone-400 font-medium">Usado para calcular projeção de término.</p>
          </div>

          <footer className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white hover:bg-stone-50 text-stone-700 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border border-stone-200 shadow-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 border border-stone-900"
            >
              <Save size={18} className="text-atlas-emerald" />
              {loading ? 'Salvando...' : 'Salvar Meta'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
