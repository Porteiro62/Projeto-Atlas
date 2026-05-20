import React, { useEffect, useState } from 'react';
import { useFinanceStore, Transaction } from '../../store/useFinanceStore';
import { Home, Target, TrendingUp, Calendar, Plus, ChevronRight, PieChart, Activity, ChevronLeft, Edit2, Trash2, Download } from 'lucide-react';
import { TransactionForm } from '../transactions/TransactionForm';
import { FinancingMetaForm } from './FinancingMetaForm';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { format, parseISO, differenceInMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx } from 'clsx';
import { exportFinancingReportPdf } from '../../utils/report';

export function FinancingModule() {
  const { transactions, financingMeta, selectedMonth, selectedYear, setDate, fetchTransactions, fetchFinancingMeta, deleteTransaction, deleteAllTransactions } = useFinanceStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMetaFormOpen, setIsMetaFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchFinancingMeta();
  }, []);

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Aporte',
      message: 'Deseja realmente excluir este aporte? Esta ação não pode ser desfeita.',
      onConfirm: () => deleteTransaction(id)
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const changeMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    else if (newMonth > 11) { newMonth = 0; newYear += 1; }
    setDate(newMonth, newYear);
  };

  const handleDeleteAll = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Limpar Aportes',
      message: 'Deseja realmente excluir TODOS os aportes? Esta ação é irreversível.',
      onConfirm: () => deleteAllTransactions('financing')
    });
  };

  const handleExportPdf = () => {
    exportFinancingReportPdf({
      transactions,
      financingMeta,
    });
  };

  // Filter financing contributions for CURRENT SELECTED MONTH
  const contributions = transactions
    .filter(t => {
      const date = parseISO(t.date);
      return t.type === 'financing' && date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ALL contributions for total sum (considering only dates <= today)
  const allContributionsSum = transactions
    .filter(t => {
      const today = new Date();
      return t.type === 'financing' && parseISO(t.date) <= today;
    })
    .reduce((acc, curr) => acc + curr.value, 0);

  const totalAccumulated = allContributionsSum + (Number(financingMeta.initialValue) || 0);
  const totalPlanned = transactions
    .filter(t => t.type === 'financing')
    .reduce((acc, curr) => acc + curr.value, 0) + (Number(financingMeta.initialValue) || 0);
    
  const progressPercent = Math.min((totalAccumulated / financingMeta.target) * 100, 100);
  const remaining = Math.max(financingMeta.target - totalAccumulated, 0);

  const installmentsRemaining = Math.ceil(remaining / (financingMeta.monthlyInstallment || 1));
  const completionDate = addMonths(new Date(), installmentsRemaining);

  const currentMonthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Cofre Imobiliário</h2>
          <p className="text-stone-500 text-sm">Acompanhamento da meta patrimonial para aquisição.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Slider */}
          <div className="flex items-center bg-white border border-stone-200 rounded-xl px-2 py-1 shadow-sm h-[42px]">
            <button onClick={() => changeMonth(-1)} className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-stone-700 min-w-[130px] text-center">
              {currentMonthName}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          <button 
            onClick={handleDeleteAll}
            className="flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-500 px-6 py-2.5 rounded-xl transition-all border border-rose-100 shadow-sm font-bold text-sm h-[42px]"
          >
            <Trash2 size={18} />
            Limpar Tudo
          </button>

          <button 
            onClick={handleExportPdf}
            className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 px-6 py-2.5 rounded-xl transition-all border border-stone-200 shadow-sm font-bold text-sm h-[42px]"
          >
            <Download size={18} />
            Emitir PDF
          </button>

          <button 
            onClick={() => setIsMetaFormOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 px-6 py-2.5 rounded-xl transition-all border border-stone-200 shadow-sm font-bold text-sm h-[42px]"
          >
            Gerenciar Metas
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl transition-all shadow-sm font-bold text-sm border border-stone-900 h-[42px]"
          >
            <Plus size={20} className="text-atlas-emerald" />
            Registrar Aporte
          </button>
        </div>
      </header>

      {isFormOpen && <TransactionForm onClose={handleCloseForm} initialType="financing" initialData={editingTransaction || undefined} />}
      {isMetaFormOpen && <FinancingMetaForm onClose={() => setIsMetaFormOpen(false)} />}
      {confirmConfig && (
        <ConfirmDialog 
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Card */}
          <div className="bg-white border border-stone-200 p-8 rounded-3xl relative overflow-hidden shadow-sm">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <Target size={150} />
             </div>
             
             <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="p-3 bg-stone-900 text-white rounded-2xl">
                <Home size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 tracking-tight">Meta Patrimonial</h3>
                <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">Ativo imobiliário</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase mb-1 tracking-wider">Já Realizado</p>
                <p className="text-2xl font-bold text-stone-900 tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAccumulated)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase mb-1 tracking-wider">Aporte Fixado</p>
                <p className="text-2xl font-bold text-atlas-emerald tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financingMeta.monthlyInstallment)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase mb-1 tracking-wider">Valor da Meta</p>
                <p className="text-3xl font-bold text-stone-900 tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financingMeta.target)}
                </p>
              </div>
            </div>

            <div className="relative pt-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Progresso da Conquista</span>
                <span className="text-sm font-bold text-atlas-emerald">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                <div 
                  className="h-full bg-atlas-emerald transition-all duration-1000 shadow-[0_0_12px_rgba(38,208,168,0.3)]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Timeline of contributions */}
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
             <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Timeline de Aportes ({currentMonthName})</h4>
                <TrendingUp size={16} className="text-stone-400" />
             </div>
             <div className="divide-y divide-stone-100 max-h-[400px] overflow-y-auto">
                {contributions.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-sm">Nenhum aporte registrado ainda.</div>
                ) : contributions.map(tx => (
                  <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs",
                        parseISO(tx.date) <= new Date() ? "bg-atlas-emerald/10 text-atlas-emerald" : "bg-stone-100 text-stone-400"
                      )}>
                        {format(parseISO(tx.date), 'dd')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-stone-900">{tx.description}</p>
                          {parseISO(tx.date) > new Date() && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-stone-100 text-stone-400 rounded-md font-bold uppercase tracking-widest">Previsto</span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 font-bold uppercase">{format(parseISO(tx.date), 'MMMM yyyy', { locale: ptBR })}</p>
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 text-stone-300 hover:text-atlas-teal hover:bg-stone-100 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="text-right min-w-[100px]">
                          <p className="text-sm font-bold text-stone-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.value)}
                          </p>
                          {tx.recurrence !== 'none' && (
                            <span className="text-[10px] font-bold text-atlas-emerald uppercase">Recorrente</span>
                          )}
                        </div>
                      </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl text-stone-900 shadow-sm relative overflow-hidden border border-stone-200">
            <div className="absolute top-0 right-0 p-4 opacity-[0.06] text-stone-900">
              <Calendar size={80} />
            </div>
            <Activity className="mb-6 text-atlas-emerald" size={32} />
            <h4 className="text-lg font-bold mb-3 tracking-tight text-stone-900">Quitação Prevista</h4>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Parcelas Restantes</p>
                <p className="text-3xl font-bold text-atlas-emerald">
                  {installmentsRemaining} <span className="text-sm text-stone-400 font-bold">meses</span>
                </p>
              </div>
              <div className="pt-2 border-t border-stone-200">
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Encerramento em</p>
                <p className="text-2xl font-bold text-stone-900">
                  {format(completionDate, 'MMMM yyyy', { locale: ptBR })}
                </p>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed font-medium">
                Com base no aporte fixado de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financingMeta.monthlyInstallment)}, você alcançará o objetivo em {completionDate.getFullYear()}.
              </p>
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-8 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieChart size={18} className="text-stone-400" />
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Resumo da Meta</h4>
            </div>
            <div className="space-y-5">
               <div className="flex justify-between text-sm">
                  <span className="text-stone-500 font-medium">Já Acumulado</span>
                  <span className="text-stone-900 font-bold">{((totalAccumulated/financingMeta.target)*100).toFixed(1)}%</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-stone-500 font-medium">Faltante</span>
                  <span className="text-rose-500 font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remaining)}
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
