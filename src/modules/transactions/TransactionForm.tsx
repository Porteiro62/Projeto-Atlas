import React, { useState, useEffect } from 'react';
import { useFinanceStore, Transaction } from '../../store/useFinanceStore';
import { X, Save } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { CurrencyInput } from '../../components/CurrencyInput';

export function TransactionForm({ onClose, initialType, initialData }: { onClose: () => void, initialType?: Transaction['type'], initialData?: Transaction }) {
  const { addTransaction, addTransactions, updateTransaction, financingMeta, transactions } = useFinanceStore();
  const [loading, setLoading] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'monthly' | 'yearly'>(initialData?.recurrence || 'none');
  const [untilGoal, setUntilGoal] = useState(false);
  const [calculatedInstallments, setCalculatedInstallments] = useState(1);
  const [currentValue, setCurrentValue] = useState(initialData?.value || 0);

  const isEditing = !!initialData;

  const totalAccumulated = transactions
    .filter(t => t.type === 'financing')
    .reduce((acc, curr) => acc + curr.value, 0) + (Number(financingMeta.initialValue) || 0);

  useEffect(() => {
    if (untilGoal && currentValue > 0) {
      const remaining = Math.max(financingMeta.target - totalAccumulated, 0);
      const needed = Math.ceil(remaining / currentValue);
      setCalculatedInstallments(needed > 0 ? needed : 1);
    }
  }, [untilGoal, currentValue, financingMeta.target, totalAccumulated]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const type = formData.get('type') as any;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const value = currentValue;
    const dateStr = formData.get('date') as string;
    const recurrenceVal = formData.get('recurrence') as any || 'none';
    const status = formData.get('status') as any || 'pending';
    const observations = formData.get('observations') as string;

    if (isEditing && initialData) {
      await updateTransaction(initialData.id, {
        type,
        description,
        category,
        value,
        date: dateStr,
        recurrence: recurrenceVal,
        status,
        observations,
      });
    } else {
      const installments = (type === 'financing' && recurrenceVal === 'monthly' && untilGoal) 
        ? calculatedInstallments 
        : (Number(formData.get('installments')) || 1);

      if (recurrenceVal === 'monthly' && installments > 1) {
        const baseDate = parseISO(dateStr);
        const txs: Omit<Transaction, 'id'>[] = [];
        
        for (let i = 0; i < installments; i++) {
          const currentDate = addMonths(baseDate, i);
          txs.push({
            type,
            description: installments > 1 ? `${description} (${i + 1}/${installments})` : description,
            category,
            value,
            date: format(currentDate, 'yyyy-MM-dd'),
            recurrence: 'none', 
            status: i === 0 ? status : 'pending',
            observations,
            installmentNumber: i + 1,
            totalInstallments: installments
          });
        }
        await addTransactions(txs);
      } else {
        await addTransaction({
          type,
          description,
          category,
          value,
          date: dateStr,
          recurrence: recurrenceVal,
          status,
          observations,
        });
      }
    }
    
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-atlas-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-atlas-teal/20 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <header className="p-6 border-b border-stone-100 flex items-center justify-between bg-atlas-dark text-white">
          <div>
            <h3 className="text-xl font-bold tracking-tight">{isEditing ? 'Editar Transação' : 'Nova Transação'}</h3>
            <p className="text-[10px] text-atlas-emerald uppercase font-bold tracking-[2px]">Atlas Financeiro</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Tipo</label>
              <select 
                name="type" 
                defaultValue={initialData?.type || initialType || 'expense'}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="financing">Financiamento (Aporte)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Valor</label>
              <CurrencyInput 
                name="value" 
                value={currentValue}
                onChange={(val) => setCurrentValue(val)}
                required 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all" 
                placeholder="R$ 0,00" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Descrição</label>
            <input name="description" defaultValue={initialData?.description} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all" placeholder="Ex: Mercado mensal" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Categoria</label>
              <input name="category" defaultValue={initialData?.category} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all" placeholder="Ex: Alimentação" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Data</label>
              <input name="date" type="date" required defaultValue={initialData?.date || new Date().toISOString().split('T')[0]} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all" />
            </div>
          </div>

          <div className={recurrence === 'monthly' && !isEditing ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Recorrência</label>
              <select 
                name="recurrence" 
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all"
              >
                <option value="none">Única</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            
            {recurrence === 'monthly' && !isEditing && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Parcelas</label>
                <input 
                  name="installments" 
                  type="number" 
                  min="1" 
                  max="122"
                  defaultValue="1"
                  disabled={untilGoal && (initialData?.type === 'financing' || initialType === 'financing')}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all disabled:opacity-50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Status</label>
              <select name="status" defaultValue={initialData?.status || 'pending'} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm focus:ring-1 focus:ring-atlas-emerald outline-none transition-all">
                <option value="pending">Pendente</option>
                <option value="paid">Confirmado</option>
              </select>
            </div>
          </div>

          {!isEditing && recurrence === 'monthly' && (initialData?.type === 'financing' || initialType === 'financing') && (
            <div className="bg-atlas-emerald/5 p-4 rounded-2xl border border-atlas-emerald/10 flex items-center gap-3">
              <input 
                type="checkbox" 
                id="untilGoal"
                checked={untilGoal}
                onChange={(e) => setUntilGoal(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-atlas-emerald focus:ring-atlas-emerald"
              />
              <label htmlFor="untilGoal" className="text-[10px] font-bold text-stone-600 uppercase tracking-widest cursor-pointer flex-1">
                Lançar mensalmente até atingir a meta final
                {untilGoal && (
                  <span className="block text-atlas-emerald mt-1 font-mono normal-case">
                    Serão geradas {calculatedInstallments} parcelas para completar R$ {financingMeta.target.toLocaleString('pt-BR')}
                  </span>
                )}
              </label>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Observações</label>
            <textarea name="observations" defaultValue={initialData?.observations || ''} rows={2} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-sm resize-none focus:ring-1 focus:ring-atlas-emerald outline-none transition-all"></textarea>
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
              className="flex-1 px-4 py-3 bg-atlas-dark hover:bg-atlas-teal text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2 border border-atlas-emerald/20"
            >
              <Save size={18} className="text-atlas-emerald" />
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
