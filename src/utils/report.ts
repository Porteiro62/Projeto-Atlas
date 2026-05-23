import { format, parseISO, subMonths, addMonths } from 'date-fns';
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

  const latestFinancingTx = transactions
    .filter((t) => t.type === 'financing' && t.value > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const identifiedMonthlyInstallment = latestFinancingTx ? latestFinancingTx.value : 0;

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
      ['Aporte mensal (identificado)', currencyFormatter.format(identifiedMonthlyInstallment)],
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

  const filename = `atlas-relatorio-${format(generatedAt, 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(filename);

  // Save to notification history on the server asynchronously
  try {
    const pdfBase64 = doc.output('datauristring');
    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: filename, content: pdfBase64 }),
    }).catch((err) => console.error('Failed to save report to history:', err));
  } catch (e) {
    console.error('Error outputting pdf base64:', e);
  }
}

export function exportFinancingReportPdf(params: {
  transactions: Transaction[];
  financingMeta: FinancingMeta;
}) {
  const { transactions, financingMeta } = params;
  const doc = new jsPDF();
  const generatedAt = new Date();

  const initialValue = Number(financingMeta.initialValue) || 0;
  const target = Number(financingMeta.target) || 0;

  // Filter and sort all financing contributions chronologically
  const allContributions = transactions
    .filter((t) => t.type === 'financing')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Accumulate contributions up to today
  const accumulatedSum = transactions
    .filter((t) => t.type === 'financing' && parseISO(t.date) <= generatedAt)
    .reduce((sum, t) => sum + t.value, 0);

  const totalAccumulated = accumulatedSum + initialValue;
  const progressPercent = target > 0 ? (totalAccumulated / target) * 100 : 0;
  const remaining = Math.max(target - totalAccumulated, 0);

  const latestFinancingTx = transactions
    .filter((t) => t.type === 'financing' && t.value > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const identifiedMonthlyInstallment = latestFinancingTx ? latestFinancingTx.value : 0;

  const installmentsRemaining = identifiedMonthlyInstallment > 0 ? Math.ceil(remaining / identifiedMonthlyInstallment) : 0;
  const completionDate = installmentsRemaining > 0 ? addMonths(new Date(), installmentsRemaining) : new Date();

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Atlas - Relatório de Patrimônio', 14, 15);
  doc.setFontSize(10);
  doc.text('Extrato de Aportes e Evolução da Meta Patrimonial', 14, 23);
  doc.setTextColor(148, 163, 184);
  doc.text(`Gerado em ${format(generatedAt, 'dd/MM/yyyy HH:mm')}`, 14, 29);

  // Resume / Summary Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('Resumo da Meta', 14, 44);

  autoTable(doc, {
    startY: 48,
    head: [['Indicador', 'Informação']],
    body: [
      ['Valor da Meta', currencyFormatter.format(target)],
      ['Valor Inicial', currencyFormatter.format(initialValue)],
      ['Aporte Mensal Identificado', currencyFormatter.format(identifiedMonthlyInstallment)],
      ['Total Acumulado (Hoje)', currencyFormatter.format(totalAccumulated)],
      ['Progresso', `${progressPercent.toFixed(1)}%`],
      ['Valor Faltante', currencyFormatter.format(remaining)],
      ['Tempo Estimado', `${installmentsRemaining} parcelas (${format(completionDate, 'MMMM yyyy', { locale: ptBR })})`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 9.5 },
  });

  // Statement Section
  doc.setFontSize(12);
  doc.text('Extrato Detalhado de Aportes', 14, (doc as any).lastAutoTable.finalY + 12);

  // Calculate running balance for each contribution
  let currentRunningBalance = initialValue;
  const statementBody = allContributions.map((tx) => {
    currentRunningBalance += tx.value;
    const isFuture = parseISO(tx.date) > generatedAt;

    return [
      format(parseISO(tx.date), 'dd/MM/yyyy'),
      tx.description,
      tx.recurrence === 'none' ? 'Único' : 'Recorrente',
      isFuture ? 'Previsto' : 'Realizado',
      currencyFormatter.format(tx.value),
      currencyFormatter.format(currentRunningBalance),
    ];
  });

  // Add initial balance row if no transactions or as a starting line
  const tableBody = [
    ['-', 'Saldo Inicial (Abertura)', '-', '-', '-', currencyFormatter.format(initialValue)],
    ...statementBody
  ];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    head: [['Data', 'Descrição', 'Recorrência', 'Status', 'Valor do Aporte', 'Saldo Acumulado']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8.5 },
    columnStyles: {
      4: { halign: 'right' },
    },
  });

  const filename = `atlas-patrimonio-${format(generatedAt, 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(filename);

  // Save to notification history on the server asynchronously
  try {
    const pdfBase64 = doc.output('datauristring');
    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: filename, content: pdfBase64 }),
    }).catch((err) => console.error('Failed to save report to history:', err));
  } catch (e) {
    console.error('Error outputting pdf base64:', e);
  }
}

