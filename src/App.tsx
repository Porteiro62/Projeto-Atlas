/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Search, Bell } from 'lucide-react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const { user, isAuthenticated, checkAuthStatus, fetchFinancingMeta, fetchUserProfile, lockApp } = useFinanceStore();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

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
              <div className="relative group">
                <button
                  onClick={() => {
                    if (updateAvailable) {
                      setShowUpdateModal(true);
                    }
                  }}
                  className={`relative p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-all shadow-sm flex items-center justify-center cursor-pointer ${
                    updateAvailable
                      ? 'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/20'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Bell size={18} className={updateAvailable ? 'animate-bounce' : ''} />

                  {updateAvailable ? (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-stone-300"></span>
                  )}
                </button>

                <div className="absolute right-0 top-full mt-2 w-64 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-50 origin-top-right">
                  <div className="rounded-xl border border-stone-800 bg-stone-900 px-3.5 py-2.5 shadow-xl text-stone-100 text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`h-1.5 w-1.5 rounded-full ${updateAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <span>{updateAvailable ? 'Atualizacao disponivel!' : 'Sistema atualizado'}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-stone-400 leading-normal">
                      {updateAvailable
                        ? `Uma nova versao do Atlas${availableVersion ? ` (v${availableVersion})` : ''} esta pronta. Clique no sino para instalar!`
                        : `Voce esta rodando a versao estavel mais recente${currentVersion ? ` (v${currentVersion})` : ''}.`}
                    </p>
                  </div>
                </div>
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
