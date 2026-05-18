import React, { useEffect, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Home,
  Target,
  BarChart3,
  CalendarDays,
  TrendingUp,
  LineChart as LineChartIcon,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { TransactionForm } from '../transactions/TransactionForm';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useFinanceStore, Transaction } from '../../store/useFinanceStore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Dashboard() {
  const { summary, transactions, fetchSummary, fetchTransactions, financingMeta, deleteTransaction, deleteAllTransactions } = useFinanceStore();
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [confirmConfig, setConfirmConfig] = React.useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchSummary();
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

  const handleDeleteAll = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Zerar Banco de Dados',
      message: 'Deseja realmente excluir TODOS os dados do sistema? Esta ação é irreversível.',
      onConfirm: () => deleteAllTransactions()
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  // Filter for Financing (considering only dates <= today)
  const financingContributions = useMemo(() => {
    const today = new Date();
    return transactions
      .filter(t => t.type === 'financing' && parseISO(t.date) <= today)
      .reduce((acc, curr) => acc + curr.value, 0) + (financingMeta.initialValue || 0);
  }, [transactions, financingMeta]);
  
  const financingProgress = Math.min((financingContributions / financingMeta.target) * 100, 100);

  // Future transactions (pendentes)
  const futureExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [transactions]);

  // Data for Category Chart
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.value;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions]);

  // Monthly evolution data
  const monthlyData = useMemo(() => {
    const months: Record<string, { name: string, receitas: number, despesas: number }> = {};
    transactions.slice(0, 50).forEach(t => {
      const monthKey = format(parseISO(t.date), 'MMM', { locale: ptBR });
      if (!months[monthKey]) {
        months[monthKey] = { name: monthKey, receitas: 0, despesas: 0 };
      }
      if (t.type === 'income') months[monthKey].receitas += t.value;
      else if (t.type === 'expense') months[monthKey].despesas += t.value;
    });
    return Object.values(months);
  }, [transactions]);

  const COLORS = ['#26d0a8', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const stats = [
    { 
      label: 'Saldo Total', 
      value: summary.balance, 
      icon: Wallet, 
      color: 'text-stone-900',
      bg: 'bg-stone-50',
      trend: '+2.5%'
    },
    { 
      label: 'Receitas', 
      value: summary.income, 
      icon: ArrowUpRight, 
      color: 'text-atlas-emerald',
      bg: 'bg-atlas-emerald/10',
      trend: '+12%'
    },
    { 
      label: 'Despesas', 
      value: summary.expense, 
      icon: ArrowDownRight, 
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      trend: '-4%'
    },
    { 
      label: 'Despesas Futuras', 
      value: futureExpenses, 
      icon: CalendarDays, 
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      trend: 'Previsto'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Panorama Consolidado</h2>
          <p className="text-stone-500 text-sm">Visão geral de todos os seus módulos financeiros.</p>
        </div>
        <button 
          onClick={handleDeleteAll}
          className="flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-500 px-6 py-2.5 rounded-xl transition-all border border-rose-100 shadow-sm font-bold text-sm h-[42px]"
        >
          <Trash2 size={20} />
          Limpar Base de Dados
        </button>
      </header>

      {isFormOpen && <TransactionForm onClose={handleCloseForm} initialData={editingTransaction || undefined} />}
      {confirmConfig && (
        <ConfirmDialog 
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${
                stat.trend.startsWith('+') ? 'bg-atlas-emerald/10 text-atlas-emerald' : 
                stat.trend.startsWith('-') ? 'bg-rose-50 text-rose-600' : 'bg-stone-100 text-stone-500'
              }`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.value)}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white border border-stone-200 p-8 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Fluxo Mensal</h4>
              <p className="text-xs text-stone-400 font-medium">Histórico de movimentações por mês</p>
            </div>
            <BarChart3 size={20} className="text-stone-300" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData.length > 0 ? monthlyData : [{ name: 'N/A', receitas: 0, despesas: 0 }]}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#26d0a8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#26d0a8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="receitas" stroke="#26d0a8" fillOpacity={1} fill="url(#colorReceitas)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financing Progress */}
        <div className="bg-white p-8 rounded-3xl text-stone-900 shadow-sm flex flex-col justify-between relative overflow-hidden border border-stone-200">
          <div className="absolute top-0 right-0 p-6 opacity-[0.06] text-stone-900">
            <Target size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Home size={20} className="text-atlas-emerald" />
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Meta Patrimonial</h4>
            </div>
            
            <h3 className="text-4xl font-bold mb-2 tracking-tight text-stone-900">
              {financingProgress.toFixed(1)}%
            </h3>
            <p className="text-xs text-stone-500 font-medium leading-relaxed mb-8">
              Você já acumulou {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financingContributions)} para sua meta imobiliária.
            </p>

            <div className="space-y-4">
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-atlas-emerald transition-all duration-1000 shadow-[0_0_10px_rgba(38,208,168,0.4)]"
                  style={{ width: `${financingProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                <span>Início: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financingMeta.initialValue)}</span>
                <span>Alvo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financingMeta.target)}</span>
              </div>
            </div>
          </div>

          <button className="relative z-10 mt-8 w-full py-3 bg-stone-900 text-white border border-stone-900 rounded-2xl font-bold text-xs hover:bg-stone-800 transition-all active:scale-95 shadow-sm">
            Gerenciar Meta
          </button>
        </div>
      </div>

      {/* Category Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 p-8 rounded-3xl shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Gastos por Categoria</h4>
              <BarChart3 size={18} className="text-stone-300" />
           </div>
           
           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4">
                {categoryData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                    </span>
                  </div>
                ))}
              </div>
           </div>
        </div>

        <div className="bg-white border border-stone-200 p-8 rounded-3xl shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Timeline Consolidada</h4>
              <TrendingUp size={18} className="text-stone-300" />
           </div>
           <div className="space-y-6">
              {transactions.slice(0, 4).map(tx => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${
                      tx.type === 'income' ? 'bg-atlas-emerald/10 text-atlas-emerald' : 
                      tx.type === 'financing' ? 'bg-atlas-teal/10 text-atlas-teal' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{tx.description}</p>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-atlas-emerald' : 'text-stone-900'}`}>
                      {tx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.value)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEdit(tx)}
                        className="p-1 px-1.5 text-stone-300 hover:text-atlas-teal transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 px-1.5 text-stone-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
