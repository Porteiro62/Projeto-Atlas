import { format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FinancingMeta, Transaction } from '../store/useFinanceStore';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

type MonthSummary = {
  label: string;
  income: number;
  expense: number;
  balance: number;
};

function monthBounds(month: number, year: number) {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

function buildMonthlySummary(transactions: Transaction[], month: number, year: number) {
  const { start, end } = monthBounds(month, year);

  return transactions.reduce((acc, transaction) => {
    const date = parseISO(transaction.date);
    if (date < start || date > end) return acc;

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
}

function buildAnnualSummary(transactions: Transaction[], month: number, year: number): MonthSummary[] {
  return Array.from({ length: 12 }, (_, index) => {
    const date = subMonths(new Date(year, month, 1), 11 - index);
    const summary = buildMonthlySummary(transactions, date.getMonth(), date.getFullYear());

    return {
      label: format(date, 'MMM/yyyy', { locale: ptBR }),
      ...summary,
    };
  });
}

function buildCategoryBreakdown(transactions: Transaction[], month: number, year: number) {
  const { start, end } = monthBounds(month, year);
  const categories = new Map<string, number>();

  transactions.forEach((transaction) => {
    const date = parseISO(transaction.date);
    if (date < start || date > end) return;
    if (transaction.type !== 'expense' && transaction.type !== 'credit_card') return;

    const current = categories.get(transaction.category) || 0;
    categories.set(transaction.category, current + transaction.value);
  });

  return Array.from(categories.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

export function exportFinanceReportPdf(params: {
  title: string;
  transactions: Transaction[];
  financingMeta: FinancingMeta;
  selectedMonth: number;
  selectedYear: number;
}) {
  const { title, transactions, financingMeta, selectedMonth, selectedYear } = params;
  const doc = new jsPDF();
  const generatedAt = new Date();
  const monthly = buildMonthlySummary(transactions, selectedMonth, selectedYear);
  const annual = buildAnnualSummary(transactions, selectedMonth, selectedYear);
  const categories = buildCategoryBreakdown(transactions, selectedMonth, selectedYear);
  const selectedMonthTransactions = transactions
    .filter((transaction) => {
      const date = parseISO(transaction.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const financingAccumulated = transactions
    .filter((transaction) => transaction.type === 'financing' && parseISO(transaction.date) <= generatedAt)
    .reduce((sum, transaction) => sum + transaction.value, 0) + (Number(financingMeta.initialValue) || 0);

  const financingTarget = Number(financingMeta.target) || 0;
  const financingProgress = financingTarget > 0 ? (financingAccumulated / financingTarget) * 100 : 0;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Atlas Financeiro', 14, 15);
  doc.setFontSize(11);
  doc.text(title, 14, 23);
  doc.setTextColor(148, 163, 184);
  doc.text(`Gerado em ${format(generatedAt, 'dd/MM/yyyy HH:mm')}`, 14, 29);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text('Panorama mensal', 14, 44);

  autoTable(doc, {
    startY: 48,
    head: [['Indicador', 'Valor']],
    body: [
      ['Receitas', currencyFormatter.format(monthly.income)],
      ['Despesas', currencyFormatter.format(monthly.expense)],
      ['Saldo', currencyFormatter.format(monthly.balance)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 10 },
  });

  doc.setFontSize(14);
  doc.text('Panorama anual (12 meses)', 14, (doc as any).lastAutoTable.finalY + 12);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    head: [['Mes', 'Receitas', 'Despesas', 'Saldo']],
    body: annual.map((item) => [
      item.label,
      currencyFormatter.format(item.income),
      currencyFormatter.format(item.expense),
      currencyFormatter.format(item.balance),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 9 },
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Gastos por categoria', 14, 18);

  autoTable(doc, {
    startY: 22,
    head: [['Categoria', 'Valor']],
    body: (categories.length ? categories : [{ category: 'Sem gastos no periodo', value: 0 }]).map((item) => [
      item.category,
      currencyFormatter.format(item.value),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 10 },
  });

  doc.setFontSize(14);
  doc.text('Meta patrimonial', 14, (doc as any).lastAutoTable.finalY + 12);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    head: [['Indicador', 'Valor']],
    body: [
      ['Valor da meta', currencyFormatter.format(financingTarget)],
      ['Valor inicial', currencyFormatter.format(financingMeta.initialValue || 0)],
      ['Aporte mensal', currencyFormatter.format(financingMeta.monthlyInstallment || 0)],
      ['Acumulado', currencyFormatter.format(financingAccumulated)],
      ['Progresso', `${financingProgress.toFixed(1)}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 10 },
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Detalhamento mensal', 14, 18);

  autoTable(doc, {
    startY: 22,
    head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Status', 'Valor']],
    body: (selectedMonthTransactions.length
      ? selectedMonthTransactions.map((transaction) => [
          format(parseISO(transaction.date), 'dd/MM/yyyy'),
          transaction.description,
          transaction.category,
          transaction.type,
          transaction.status,
          currencyFormatter.format(transaction.value),
        ])
      : [[
          format(new Date(selectedYear, selectedMonth, 1), 'dd/MM/yyyy'),
          'Sem movimentacoes no periodo',
          '-',
          '-',
          '-',
          currencyFormatter.format(0),
        ]]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8.5 },
    columnStyles: {
      5: { halign: 'right' },
    },
  });

  doc.save(`atlas-relatorio-${format(generatedAt, 'yyyy-MM-dd-HHmm')}.pdf`);
}
