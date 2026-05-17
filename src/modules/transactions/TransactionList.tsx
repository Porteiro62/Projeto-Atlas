import React, { useEffect, useState } from 'react';
import { useFinanceStore, Transaction } from '../../store/useFinanceStore';
import { TransactionForm } from './TransactionForm';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, MoreHorizontal, Download, Trash2, Plus, ChevronLeft, ChevronRight, Edit2, CreditCard } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function TransactionList({ filterType }: { filterType?: Transaction['type'] }) {
  const { transactions, fetchTransactions, loading, selectedMonth, selectedYear, setDate, deleteTransaction, deleteAllTransactions } = useFinanceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Transação',
      message: 'Deseja realmente excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: () => deleteTransaction(id)
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteAll = async () => {
    setConfirmConfig({
      isOpen: true,
      title: `Limpar ${getTitle()}`,
      message: `Deseja realmente excluir TODOS os dados de ${getTitle()}? Esta ação é irreversível.`,
      onConfirm: () => deleteAllTransactions(filterType)
    });
  };

  const changeMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    setDate(newMonth, newYear);
  };

  const creditCardTotal = React.useMemo(() => {
    return transactions
      .filter(t => {
        const date = parseISO(t.date);
        return t.type === 'credit_card' && 
               date.getMonth() === selectedMonth && 
               date.getFullYear() === selectedYear;
      })
      .reduce((sum, t) => sum + t.value, 0);
  }, [transactions, selectedMonth, selectedYear]);

  const filteredTransactions = transactions.filter(t => {
    const date = parseISO(t.date);
    const matchesMonth = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType ? t.type === filterType : true;
    return matchesMonth && matchesSearch && matchesType;
  });

  const displayTransactions = React.useMemo(() => {
    let list = [...filteredTransactions];
    if (filterType === 'expense' && creditCardTotal > 0 && !searchTerm) {
      list.push({
        id: 'virtual-cc-fatura',
        type: 'expense',
        description: 'Fatura do cartão',
        category: 'Cartão de Crédito',
        value: creditCardTotal,
        date: new Date(selectedYear, selectedMonth, 1).toISOString(),
        status: 'pending',
        observations: 'Valor total das compras no cartão para este mês.'
      } as Transaction);
    }
    return list;
  }, [filteredTransactions, filterType, creditCardTotal, searchTerm, selectedMonth, selectedYear]);

  const handleExportCSV = () => {
    if (displayTransactions.length === 0) return;

    const headers = ['Data', 'Descricao', 'Categoria', 'Valor', 'Tipo', 'Status'];
    const rows = displayTransactions.map(tx => [
      format(parseISO(tx.date), 'dd/MM/yyyy'),
      tx.description,
      tx.category,
      tx.value.toFixed(2),
      tx.type,
      tx.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTitle = () => {
    switch (filterType) {
      case 'income': return 'Receitas';
      case 'expense': return 'Despesas';
      case 'credit_card': return 'Cartão de Crédito';
      case 'financing': return 'Patrimônio (Aportes)';
      default: return 'Histórico Geral';
    }
  };

  const currentMonthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">{getTitle()}</h2>
          <p className="text-stone-500 text-sm">Controle sua timeline financeira.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Month Slider */}
          <div className="flex items-center bg-white border border-stone-200 rounded-xl px-2 py-1 shadow-sm mr-2">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-xs font-bold uppercase tracking-widest text-stone-700 min-w-[140px] text-center">
              {currentMonthName}
            </span>
            <button 
              onClick={() => changeMonth(1)}
              className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={handleDeleteAll}
            className="flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-500 px-4 py-2 rounded-lg transition-colors border border-rose-100 shadow-sm font-semibold text-sm"
          >
            <Trash2 size={18} />
            Limpar Tudo
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 px-4 py-2 rounded-lg transition-colors border border-stone-200 shadow-sm font-semibold text-sm"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-atlas-dark hover:bg-atlas-teal text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-black/20 border border-atlas-emerald/20 font-bold text-xs uppercase tracking-widest"
          >
            <Plus size={18} className="text-atlas-emerald" />
            Nova {filterType === 'income' ? 'Receita' : filterType === 'credit_card' ? 'Compra no Cartão' : 'Despesa'}
          </button>
        </div>
      </header>

      {isFormOpen && <TransactionForm onClose={handleCloseForm} initialType={filterType} initialData={editingTransaction || undefined} />}
      
      {filterType === 'credit_card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-atlas-dark p-8 rounded-3xl border border-atlas-teal/20 shadow-xl flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-atlas-teal/10 flex items-center justify-center text-atlas-emerald">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Fatura Estimada</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditCardTotal)}
                </h3>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs font-mono text-stone-400 tracking-widest">VISA PLATINUM •••• 4590</span>
              <div className="px-2 py-1 bg-atlas-emerald/10 rounded text-[10px] font-bold text-atlas-emerald uppercase">Fechamento: 05/{String(selectedMonth + 1).padStart(2, '0')}</div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-8 rounded-3xl shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <MoreHorizontal size={24} />
              </div>
              <div>
                 <h4 className="font-bold text-stone-900">Limite Utilizado</h4>
                 <p className="text-xs text-stone-400">Referente a {currentMonthName}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Gasto Atual</span>
                <span className="font-bold text-stone-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditCardTotal)}</span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min((creditCardTotal / 5000) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-stone-400 text-right font-bold uppercase tracking-widest">Limite total: R$ 5.000,00</p>
            </div>
          </div>
        </div>
      )}
      {confirmConfig && (
        <ConfirmDialog 
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
        />
      )}

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por descrição ou categoria..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 pl-10 pr-4 text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-atlas-emerald shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors border border-stone-100">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/50 text-stone-400 text-[10px] uppercase tracking-widest leading-none">
                <th className="px-6 py-5 font-bold">Data</th>
                <th className="px-6 py-5 font-bold">Descrição</th>
                <th className="px-6 py-5 font-bold">Categoria</th>
                <th className="px-6 py-5 font-bold text-right">Valor</th>
                <th className="px-6 py-5 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400 font-medium">Carregando transações...</td>
                </tr>
              ) : displayTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400 font-medium font-medium">Nenhuma transação encontrada.</td>
                </tr>
              ) : (
                displayTransactions.map((tx) => (
                  <tr key={tx.id} className={clsx(
                    "hover:bg-stone-50/50 transition-colors group",
                    tx.id === 'virtual-cc-fatura' && "bg-amber-50/30 border-l-4 border-l-amber-400"
                  )}>
                    <td className="px-6 py-4 text-sm text-stone-400 font-medium">
                      {format(parseISO(tx.date), 'dd MMM yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-stone-900">{tx.description}</div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                        {tx.id === 'virtual-cc-fatura' ? 'Agregado' : tx.type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
                        {tx.category}
                      </span>
                    </td>
                    <td className={clsx(
                      "px-6 py-4 text-sm font-bold text-right",
                      tx.type === 'income' ? "text-atlas-emerald" : "text-stone-900"
                    )}>
                      {tx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.value)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {tx.id !== 'virtual-cc-fatura' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(tx)}
                            className="p-1.5 text-stone-300 hover:text-atlas-teal hover:bg-stone-100 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-bold uppercase italic">Automático</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
