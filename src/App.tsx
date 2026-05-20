/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Search, Bell, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './modules/dashboard/Dashboard';
import { TransactionList } from './modules/transactions/TransactionList';
import { FinancingModule } from './modules/financing/Financing';
import { ProfileSettings } from './modules/profile/ProfileSettings';
import { LockScreen } from './modules/auth/LockScreen';
import { SplashScreen } from './modules/auth/SplashScreen';
import { UpdateModal } from './components/UpdateModal';
import { useFinanceStore } from './store/useFinanceStore';

interface ReportFile {
  name: string;
  createdAt: string;
  size: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const { user, isAuthenticated, checkAuthStatus, fetchFinancingMeta, fetchUserProfile, lockApp } = useFinanceStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [reports, setReports] = useState<ReportFile[]>([]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    }
  };

  const handleOpenReport = async (name: string) => {
    try {
      await fetch('/api/reports/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } catch (e) {
      console.error('Failed to open report:', e);
    }
  };

  const groupReportsByDate = (reportsList: ReportFile[]) => {
    const groups: { [key: string]: ReportFile[] } = {};
    
    reportsList.forEach((report) => {
      const date = new Date(report.createdAt);
      const day = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      
      const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      
      let label = day;
      if (day === today) {
        label = 'Hoje';
      } else if (day === yesterdayStr) {
        label = 'Ontem';
      }
      
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(report);
    });
    
    return groups;
  };

  const formatReportTitle = (name: string) => {
    const isPatrimonio = name.includes('patrimonio');
    const typeLabel = isPatrimonio ? 'Extrato de Patrimônio' : 'Relatório Mensal / Anual';
    
    const timeMatch = name.match(/-(\d{2})(\d{2})\.pdf$/);
    if (timeMatch) {
      return `${typeLabel} - ${timeMatch[1]}h${timeMatch[2]}`;
    }
    return name;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchFinancingMeta();
    fetchUserProfile();
  }, [isAuthenticated, fetchFinancingMeta, fetchUserProfile]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const inactivityTimeout = 15 * 60 * 1000;
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('[App] User inactive. Locking app automatically.');
        lockApp();
      }, inactivityTimeout);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, lockApp]);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.getAppVersion().then(setCurrentVersion).catch(() => {
      setCurrentVersion(null);
    });

    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable((info) => {
      setUpdateAvailable(true);
      setAvailableVersion(info.version);
      setShowUpdateModal(true);
    });

    const unsubscribeDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateAvailable(true);
      setAvailableVersion(info.version);
      setShowUpdateModal(true);
    });

    const unsubscribeNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
      setUpdateAvailable(false);
      setAvailableVersion(null);
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeDownloaded();
      unsubscribeNotAvailable();
    };
  }, []);

  if (isInitializing) {
    return <SplashScreen onFinish={() => setIsInitializing(false)} />;
  }

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionList />;
      case 'income':
        return <TransactionList filterType="income" />;
      case 'expenses':
        return <TransactionList filterType="expense" />;
      case 'credit-card':
        return <TransactionList filterType="credit_card" />;
      case 'financing':
        return <FinancingModule />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-50 text-stone-900">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          appVersion={currentVersion}
          user={user}
          onProfileClick={() => setIsProfileSettingsOpen(true)}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-20 bg-stone-50/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8 border-b border-stone-200 shadow-sm">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type="text"
                  placeholder="Procurar transacoes, categorias ou relatorios..."
                  className="w-full bg-white border border-stone-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) {
                      fetchReports();
                    }
                  }}
                  className={`relative p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-all shadow-sm flex items-center justify-center cursor-pointer ${
                    updateAvailable
                      ? 'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/20'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Bell size={18} className={updateAvailable ? 'animate-bounce' : ''} />

                  {(updateAvailable || reports.length > 0) ? (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-stone-300"></span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 top-full mt-2 w-[380px] z-50 origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                          <div>
                            <h3 className="text-sm font-bold text-stone-900">Notificações</h3>
                            <p className="text-[10px] text-stone-400 font-medium">Atualizações e documentos gerados</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); fetchReports(); }}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Atualizar"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>

                        {/* Update Status */}
                        <div className="px-5 py-3 border-b border-stone-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${updateAvailable ? 'bg-emerald-50 text-emerald-500' : 'bg-stone-100 text-stone-400'}`}>
                              <Bell size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-stone-900">
                                {updateAvailable ? 'Atualização disponível!' : 'Sistema atualizado'}
                              </p>
                              <p className="text-[10px] text-stone-400 truncate">
                                {updateAvailable
                                  ? `Atlas v${availableVersion || '?'} pronta para instalar`
                                  : `Versão estável${currentVersion ? ` v${currentVersion}` : ''}`}
                              </p>
                            </div>
                            {updateAvailable && (
                              <button
                                onClick={() => { setShowUpdateModal(true); setShowNotifications(false); }}
                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                Instalar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reports History */}
                        <div className="max-h-[360px] overflow-y-auto">
                          {reports.length === 0 ? (
                            <div className="px-5 py-8 text-center">
                              <FileText size={28} className="mx-auto text-stone-300 mb-2" />
                              <p className="text-xs text-stone-400 font-medium">Nenhum documento gerado ainda.</p>
                              <p className="text-[10px] text-stone-300 mt-1">Emita um relatório PDF para vê-lo aqui.</p>
                            </div>
                          ) : (
                            Object.entries(groupReportsByDate(reports)).map(([dateLabel, dateReports]) => (
                              <div key={dateLabel}>
                                <div className="px-5 py-2 bg-stone-50/80 sticky top-0">
                                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{dateLabel}</p>
                                </div>
                                {dateReports.map((report) => (
                                  <div
                                    key={report.name}
                                    className="px-5 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors cursor-pointer group/item"
                                    onClick={() => handleOpenReport(report.name)}
                                  >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                      report.name.includes('patrimonio')
                                        ? 'bg-atlas-teal/10 text-atlas-emerald'
                                        : 'bg-blue-50 text-blue-500'
                                    }`}>
                                      <FileText size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-stone-900 truncate">{formatReportTitle(report.name)}</p>
                                      <p className="text-[10px] text-stone-400">
                                        {new Date(report.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        {' · '}
                                        {formatSize(report.size)}
                                      </p>
                                    </div>
                                    <ExternalLink size={14} className="text-stone-300 group-hover/item:text-stone-500 transition-colors flex-shrink-0" />
                                  </div>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>
          </header>

          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{renderContent()}</div>
          </div>
        </main>
      </div>

      {isProfileSettingsOpen && <ProfileSettings onClose={() => setIsProfileSettingsOpen(false)} />}
      {showUpdateModal && <UpdateModal onClose={() => setShowUpdateModal(false)} />}
    </div>
  );
}
