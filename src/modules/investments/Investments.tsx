import React, { useState } from 'react';
import { useFinanceStore, Investment, InvestmentTransaction } from '../../store/useFinanceStore';
import { exportInvestmentsReportPdf } from '../../utils/report';
import { TrendingUp, Plus, Trash2, Calendar, PiggyBank, ArrowUpRight, Percent, ArrowLeftRight, X, Clock, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx } from 'clsx';

export function InvestmentsModule() {
  const {
    investments,
    investmentTransactions,
    addInvestment,
    deleteInvestment,
    addInvestmentTransaction,
    deleteInvestmentTransaction
  } = useFinanceStore();

  const [isNewInvOpen, setIsNewInvOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isExtratoOpen, setIsExtratoOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Investment | null>(null);

  // Form states for New Investment
  const [newInvName, setNewInvName] = useState('');
  const [newInvValue, setNewInvValue] = useState('');
  const [newInvDate, setNewInvDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states for Update (Aporte/Juros)
  const [updateType, setUpdateType] = useState<'aporte' | 'juros'>('aporte');
  const [updateValue, setUpdateValue] = useState('');
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate calculations per investment
  const getInvestmentDetails = (inv: Investment) => {
    const txs = investmentTransactions.filter(t => t.investmentId === inv.id);
    const totalAportes = txs
      .filter(t => t.type === 'aporte')
      .reduce((acc, curr) => acc + curr.value, 0);
    const totalJuros = txs
      .filter(t => t.type === 'juros')
      .reduce((acc, curr) => acc + curr.value, 0);
    const currentTotal = inv.initialValue + totalAportes + totalJuros;

    return {
      totalAportes,
      totalJuros,
      currentTotal,
      txs
    };
  };

  // Global calculations
  const totalInitial = investments.reduce((acc, curr) => acc + curr.initialValue, 0);
  const totalAportesGlobal = investmentTransactions
    .filter(t => t.type === 'aporte')
    .reduce((acc, curr) => acc + curr.value, 0);
  const totalJurosGlobal = investmentTransactions
    .filter(t => t.type === 'juros')
    .reduce((acc, curr) => acc + curr.value, 0);
  const totalPortfolioValue = totalInitial + totalAportesGlobal + totalJurosGlobal;

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName.trim() || !newInvValue || Number(newInvValue) <= 0) return;

    await addInvestment({
      name: newInvName.trim(),
      initialValue: Number(newInvValue),
      date: newInvDate,
    });

    setNewInvName('');
    setNewInvValue('');
    setNewInvDate(new Date().toISOString().split('T')[0]);
    setIsNewInvOpen(false);
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv || !updateValue || Number(updateValue) <= 0) return;

    await addInvestmentTransaction({
      investmentId: selectedInv.id,
      type: updateType,
      value: Number(updateValue),
      date: updateDate,
    });

    setUpdateValue('');
    setUpdateDate(new Date().toISOString().split('T')[0]);
    setIsUpdateOpen(false);
  };

  const handleDeleteInv = async (id: string) => {
    if (confirm('Deseja realmente remover este investimento e todo o seu histórico?')) {
      await deleteInvestment(id);
      if (selectedInv?.id === id) {
        setSelectedInv(null);
        setIsExtratoOpen(false);
      }
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (confirm('Deseja excluir esta atualização do extrato?')) {
      await deleteInvestmentTransaction(txId);
    }
  };

  const handleExportPdf = () => {
    exportInvestmentsReportPdf({ investments, investmentTransactions });
  };

  // Format helper for BRL currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Meus Investimentos</h2>
          <p className="text-stone-500 text-sm">Gerencie sua carteira, aportes e rendimentos acumulados.</p>
        </div>
        <div className="flex">
          <button
            onClick={() => setIsNewInvOpen(true)}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl transition-all shadow-sm font-bold text-sm border border-stone-900 h-[42px] cursor-pointer"
          >
            <Plus size={20} className="text-atlas-emerald" />
            Novo Investimento
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 bg-stone-700 hover:bg-stone-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm font-bold text-sm border border-stone-700 h-[42px] cursor-pointer ml-2"
          >
            <FileText size={20} className="text-atlas-emerald" />
            Emitir PDF
          </button>
        </div>
      </header>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Patrimônio Consolidado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} className="text-atlas-emerald animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Patrimônio Consolidado</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-white">
              {formatCurrency(totalPortfolioValue)}
            </p>
            <p className="text-xs text-stone-400 font-medium">
              Capital inicial + aportes + rendimentos
            </p>
          </div>

          {/* Total Aplicado */}
          <div className="space-y-2 md:border-l md:border-stone-700/50 md:pl-8">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Aplicado</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(totalInitial + totalAportesGlobal)}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold uppercase">
              <span>Base: {formatCurrency(totalInitial)}</span>
              <span>•</span>
              <span>Aportes: {formatCurrency(totalAportesGlobal)}</span>
            </div>
          </div>

          {/* Rendimentos (Juros) */}
          <div className="space-y-2 md:border-l md:border-stone-700/50 md:pl-8">
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-atlas-emerald" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Rendimentos (Juros)</span>
            </div>
            <p className="text-2xl font-bold text-atlas-emerald tracking-tight">
              {formatCurrency(totalJurosGlobal)}
            </p>
            <p className="text-xs text-stone-400 font-medium">
              Rentabilidade acumulada da carteira
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid of Investments */}
      {investments.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-16 text-center max-w-2xl mx-auto shadow-sm">
          <TrendingUp size={48} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-bold text-stone-900 tracking-tight mb-1">Nenhum investimento registrado</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Comece a acompanhar seu patrimônio adicionando ativos como Renda Fixa, Ações, Fundos ou Poupança.
          </p>
          <button
            onClick={() => setIsNewInvOpen(true)}
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl transition-all shadow-sm font-bold text-sm cursor-pointer"
          >
            <Plus size={18} className="text-atlas-emerald" />
            Adicionar Primeiro Investimento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investments.map(inv => {
            const { currentTotal, totalAportes, totalJuros } = getInvestmentDetails(inv);
            return (
              <div
                key={inv.id}
                className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-4">
                      <h4 className="font-bold text-stone-900 text-base tracking-tight truncate max-w-[180px]">
                        {inv.name}
                      </h4>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <Calendar size={10} /> Desde {format(parseISO(inv.date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteInv(inv.id)}
                      className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Excluir investimento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Main Value Display */}
                  <div className="mb-6">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Montante Acumulado</span>
                    <p className="text-2xl font-black text-stone-900 tracking-tight mt-0.5">
                      {formatCurrency(currentTotal)}
                    </p>
                  </div>

                  {/* Details breakdown */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100 text-xs mb-6">
                    <div>
                      <span className="text-stone-400 font-medium block">Inicial + Aportes</span>
                      <span className="font-semibold text-stone-800">
                        {formatCurrency(inv.initialValue + totalAportes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-medium block">Juros Rendidos</span>
                      <span className="font-semibold text-atlas-emerald">
                        {formatCurrency(totalJuros)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons inside Card */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setSelectedInv(inv);
                      setUpdateType('aporte');
                      setIsUpdateOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-xl font-bold text-xs text-stone-700 transition-all cursor-pointer"
                  >
                    <Plus size={14} className="text-atlas-emerald" />
                    Atualizar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInv(inv);
                      setIsExtratoOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-900 hover:bg-stone-800 rounded-xl font-bold text-xs text-white transition-all cursor-pointer"
                  >
                    <ArrowLeftRight size={14} className="text-stone-400" />
                    Extrato
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Investment */}
      {isNewInvOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-md p-6 shadow-2xl animate-in scale-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-stone-900">Novo Investimento</h3>
              <button
                onClick={() => setIsNewInvOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateInvestment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nome do Investimento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tesouro Selic, FII MXRF11, CDB Banco X"
                  value={newInvName}
                  onChange={e => setNewInvName(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Valor Inicial</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="R$ 0,00"
                    value={newInvValue}
                    onChange={e => setNewInvValue(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Data de Início</label>
                  <input
                    type="date"
                    required
                    value={newInvDate}
                    onChange={e => setNewInvDate(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewInvOpen(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 rounded-xl font-bold text-sm text-stone-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-sm cursor-pointer"
                >
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Update (Aporte/Juros) */}
      {isUpdateOpen && selectedInv && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-md p-6 shadow-2xl animate-in scale-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Atualizar Saldo</h3>
                <p className="text-xs text-stone-400">Ativo: {selectedInv.name}</p>
              </div>
              <button
                onClick={() => setIsUpdateOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Tipo de Atualização</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateType('aporte')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs uppercase transition-all cursor-pointer",
                      updateType === 'aporte'
                        ? "bg-stone-900 border-stone-900 text-white shadow-sm"
                        : "border-stone-200 text-stone-500 hover:bg-stone-50"
                    )}
                  >
                    Aporte
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType('juros')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs uppercase transition-all cursor-pointer",
                      updateType === 'juros'
                        ? "bg-stone-900 border-stone-900 text-white shadow-sm"
                        : "border-stone-200 text-stone-500 hover:bg-stone-50"
                    )}
                  >
                    Rendimento (Juros)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="R$ 0,00"
                    value={updateValue}
                    onChange={e => setUpdateValue(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input
                    type="date"
                    required
                    value={updateDate}
                    onChange={e => setUpdateDate(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateOpen(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 rounded-xl font-bold text-sm text-stone-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-sm cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal/Slide-over: Statement (Extrato) */}
      {isExtratoOpen && selectedInv && (() => {
        const { txs, currentTotal } = getInvestmentDetails(selectedInv);
        const sortedTxs = [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-2xl p-6 shadow-2xl animate-in scale-in duration-200 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-stone-100 pb-4 mb-4 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-stone-900 tracking-tight">Extrato de Atualizações</h3>
                  <p className="text-xs text-stone-400 font-medium">Investimento: {selectedInv.name}</p>
                </div>
                <button
                  onClick={() => setIsExtratoOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Top info row */}
              <div className="grid grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl mb-4 flex-shrink-0">
                <div>
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Investimento Inicial</span>
                  <p className="font-bold text-stone-950 text-sm mt-0.5">{formatCurrency(selectedInv.initialValue)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Taxa de Atualizações</span>
                  <p className="font-bold text-stone-950 text-sm mt-0.5">{txs.length} registros</p>
                </div>
                <div>
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Montante Acumulado</span>
                  <p className="font-bold text-atlas-emerald text-base mt-0.5">{formatCurrency(currentTotal)}</p>
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-stone-100 pr-2">
                {/* Initial investment record */}
                <div className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center font-bold text-xs">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">Aporte Inicial (Abertura)</p>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                        {format(parseISO(selectedInv.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-900">{formatCurrency(selectedInv.initialValue)}</p>
                    <span className="text-[8px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Depósito</span>
                  </div>
                </div>

                {/* Subsequent transactions */}
                {sortedTxs.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs font-medium">
                    Nenhuma atualização (aportes ou juros) registrada além do valor inicial.
                  </div>
                ) : (
                  sortedTxs.map(tx => (
                    <div key={tx.id} className="py-3.5 flex items-center justify-between hover:bg-stone-50/50 rounded-xl px-2 transition-colors group/row">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                          tx.type === 'aporte' ? "bg-emerald-50 text-emerald-600" : "bg-teal-50 text-teal-600"
                        )}>
                          {tx.type === 'aporte' ? <Plus size={14} /> : <Percent size={12} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900">
                            {tx.type === 'aporte' ? 'Aporte de Capital' : 'Rendimento de Juros'}
                          </p>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                            {format(parseISO(tx.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={clsx(
                            "text-xs font-bold",
                            tx.type === 'aporte' ? "text-stone-900" : "text-atlas-emerald"
                          )}>
                            +{formatCurrency(tx.value)}
                          </p>
                          <span className={clsx(
                            "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                            tx.type === 'aporte' ? "bg-emerald-100/40 text-emerald-700" : "bg-teal-100/40 text-teal-700"
                          )}>
                            {tx.type === 'aporte' ? 'Aporte' : 'Juros'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-0 group-hover/row:opacity-100"
                          title="Remover transação"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-stone-100 pt-4 mt-4 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setIsExtratoOpen(false)}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-sm cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
