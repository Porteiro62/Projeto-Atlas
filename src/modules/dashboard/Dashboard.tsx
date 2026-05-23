import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Target,
  Home,
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { FinancingMetaForm } from '../financing/FinancingMetaForm';
import { MonthYearPicker } from '../../components/MonthYearPicker';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { addMonths, format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const COLORS = ['#26d0a8', '#3b82f6', '#f59e0b', '#ef4444', '#0f172a', '#14b8a6'];

function getMonthLabel(month: number, year: number) {
  return format(new Date(year, month, 1), 'MMMM yyyy', { locale: ptBR });
}

export function Dashboard() {
  const {
    transactions,
    financingMeta,
    selectedMonth,
    selectedYear,
    setDate,
    fetchTransactions,
    fetchSummary,
    fetchFinancingMeta,
  } = useFinanceStore();
  const [isMetaFormOpen, setIsMetaFormOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
    fetchFinancingMeta();
  }, []);

  const changeMonth = (offset: number) => {
    const baseDate = addMonths(new Date(selectedYear, selectedMonth, 1), offset);
    setDate(baseDate.getMonth(), baseDate.getFullYear());
  };

  const monthlySummary = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
      const date = parseISO(transaction.date);
      if (date.getMonth() !== selectedMonth || date.getFullYear() !== selectedYear) {
        return acc;
      }

      if (transaction.type === 'income') {
        acc.income += transaction.value;
      }

      if (transaction.type === 'expense' || transaction.type === 'credit_card') {
        acc.expense += transaction.value;
      }

      acc.balance = acc.income - acc.expense;
      return acc;
    }, {
      income: 0,
      expense: 0,
      balance: 0,
    });
  }, [transactions, selectedMonth, selectedYear]);

  const annualSummary = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(selectedYear, index, 1);
      const summary = transactions.reduce((acc, transaction) => {
        const transactionDate = parseISO(transaction.date);
        if (transactionDate.getMonth() !== date.getMonth() || transactionDate.getFullYear() !== date.getFullYear()) {
          return acc;
        }

        if (transaction.type === 'income') {
          acc.income += transaction.value;
        }

        if (transaction.type === 'expense' || transaction.type === 'credit_card') {
          acc.expense += transaction.value;
        }

        acc.balance = acc.income - acc.expense;
        return acc;
      }, {
        income: 0,
        expense: 0,
        balance: 0,
      });

      return {
        label: format(date, 'MMM/yyyy', { locale: ptBR }),
        ...summary,
      };
    });
  }, [transactions, selectedYear]);

  const annualTotalSummary = useMemo(() => {
    return annualSummary.reduce((acc, month) => {
      acc.income += month.income;
      acc.expense += month.expense;
      acc.balance += month.balance;
      return acc;
    }, {
      income: 0,
      expense: 0,
      balance: 0,
    });
  }, [annualSummary]);

  const annualRangeLabel = useMemo(() => {
    if (annualSummary.length === 0) return 'Últimos 12 meses';
    const first = annualSummary[0].label;
    const last = annualSummary[annualSummary.length - 1].label;
    return `${first} a ${last}`;
  }, [annualSummary]);

  const annualDetails = useMemo(() => {
    return [
      { label: 'Total de receitas', value: annualTotalSummary.income, icon: ArrowUpRight, tone: 'text-atlas-emerald bg-atlas-emerald/10' },
      { label: 'Total de despesas', value: annualTotalSummary.expense, icon: ArrowDownRight, tone: 'text-rose-500 bg-rose-50' },
      { label: 'Saldo total', value: annualTotalSummary.balance, icon: Wallet, tone: 'text-stone-900 bg-stone-100' },
    ];
  }, [annualTotalSummary]);

  const monthlyDetails = [
    { label: 'Total de receitas', value: monthlySummary.income, icon: ArrowUpRight, tone: 'text-atlas-emerald bg-atlas-emerald/10' },
    { label: 'Total de despesas', value: monthlySummary.expense, icon: ArrowDownRight, tone: 'text-rose-500 bg-rose-50' },
    { label: 'Saldo total', value: monthlySummary.balance, icon: Wallet, tone: 'text-stone-900 bg-stone-100' },
  ];

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};

    transactions.forEach((transaction) => {
      const date = parseISO(transaction.date);
      if (date.getMonth() !== selectedMonth || date.getFullYear() !== selectedYear) return;
      if (transaction.type !== 'expense' && transaction.type !== 'credit_card') return;

      categories[transaction.category] = (categories[transaction.category] || 0) + transaction.value;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, selectedMonth, selectedYear]);

  const financingAccumulated = useMemo(() => {
    const today = new Date();
    return transactions
      .filter((transaction) => transaction.type === 'financing' && parseISO(transaction.date) <= today)
      .reduce((sum, transaction) => sum + transaction.value, 0) + (Number(financingMeta.initialValue) || 0);
  }, [transactions, financingMeta]);

  const identifiedMonthlyInstallment = useMemo(() => {
    const latestFinancingTx = transactions
      .filter((t) => t.type === 'financing' && t.value > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return latestFinancingTx ? latestFinancingTx.value : 0;
  }, [transactions]);

  const financingProgress = financingMeta.target > 0
    ? Math.min((financingAccumulated / financingMeta.target) * 100, 100)
    : 0;

  const remainingValue = Math.max((financingMeta.target || 0) - financingAccumulated, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Panorama Geral</h2>
          <p className="text-sm text-stone-500">Analise mensal e anual consolidada do Atlas.</p>
        </div>

        <MonthYearPicker
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChange={(m, y) => setDate(m, y)}
        />
      </header>

      <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-stone-100 text-stone-900">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Panorama Mensal</h3>
            <p className="text-xs text-stone-400 font-medium">Lista detalhada do mes selecionado.</p>
          </div>
        </div>

        <div className="space-y-4">
          {monthlyDetails.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${item.tone}`}>
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{item.label}</p>
                  <p className="text-sm text-stone-500">{getMonthLabel(selectedMonth, selectedYear)}</p>
                </div>
              </div>
              <p className={`text-lg font-bold ${(item.label === 'Total de despesas' || item.value < 0) ? 'text-rose-500' : 'text-stone-900'}`}>
                {currencyFormatter.format(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-atlas-teal/10 text-atlas-emerald">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Panorama Anual</h3>
            <p className="text-xs text-stone-400 font-medium">Acumulado dos últimos 12 meses.</p>
          </div>
        </div>

        <div className="space-y-4">
          {annualDetails.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${item.tone}`}>
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{item.label}</p>
                  <p className="text-sm text-stone-500">{annualRangeLabel}</p>
                </div>
              </div>
              <p className={`text-lg font-bold ${(item.label === 'Total de despesas' || item.value < 0) ? 'text-rose-500' : 'text-stone-900'}`}>
                {currencyFormatter.format(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Fluxo Mensal</h3>
            <p className="text-xs text-stone-400 font-medium">Receitas em area verde e despesas em linha vermelha.</p>
          </div>
          <LineChartIcon size={20} className="text-stone-300" />
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={annualSummary}>
              <defs>
                <linearGradient id="monthlyIncomeArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#26d0a8" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#26d0a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <Tooltip
                formatter={(value: number) => currencyFormatter.format(value)}
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="income" stroke="#26d0a8" fill="url(#monthlyIncomeArea)" strokeWidth={3} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Gastos por Categoria</h3>
            <p className="text-xs text-stone-400 font-medium">Distribuicao das despesas do mes selecionado.</p>
          </div>
          <PieChartIcon size={20} className="text-stone-300" />
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="h-[220px] w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.length ? categoryData : [{ name: 'Sem gastos', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(categoryData.length ? categoryData : [{ name: 'Sem gastos', value: 1 }]).map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 w-full space-y-3">
            {(categoryData.length ? categoryData : [{ name: 'Sem gastos no periodo', value: 0 }]).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl border border-stone-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-semibold text-stone-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-stone-900">{currencyFormatter.format(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-stone-900 text-white">
              <Home size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Meta Patrimonial</h3>
              <p className="text-xs text-stone-400 font-medium">Acompanhamento consolidado da meta cadastrada.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl border border-stone-100 bg-stone-50/80 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Acumulado</p>
              <p className="text-xl font-bold text-stone-900">{currencyFormatter.format(financingAccumulated)}</p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/80 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Meta</p>
              <p className="text-xl font-bold text-stone-900">{currencyFormatter.format(financingMeta.target || 0)}</p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/80 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Faltante</p>
              <p className="text-xl font-bold text-rose-500">{currencyFormatter.format(remainingValue)}</p>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Progresso da meta</span>
            <span className="text-sm font-bold text-atlas-emerald">{financingProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
            <div
              className="h-full bg-atlas-emerald transition-all duration-1000"
              style={{ width: `${financingProgress}%` }}
            />
          </div>
        </div>
      </section>

      {isMetaFormOpen && <FinancingMetaForm onClose={() => setIsMetaFormOpen(false)} />}
    </div>
  );
}
