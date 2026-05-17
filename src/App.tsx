/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './modules/dashboard/Dashboard';
import { TransactionList } from './modules/transactions/TransactionList';
import { CreditCardModule } from './modules/credit-card/CreditCard';
import { FinancingModule } from './modules/financing/Financing';
import { Settings, Search, User } from 'lucide-react';
import { useFinanceStore } from './store/useFinanceStore';
import { ProfileSettings } from './modules/profile/ProfileSettings';
import { LockScreen } from './modules/auth/LockScreen';
import { SplashScreen } from './modules/auth/SplashScreen';
import { UpdateModal } from './components/UpdateModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { user, isAuthenticated, checkAuthStatus, lockApp } = useFinanceStore();

  // Run initial authentication status check
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Handle auto-lock on user inactivity (15 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("[App] User inactive. Locking app automatically.");
        lockApp();
      }, INACTIVITY_TIMEOUT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, lockApp]);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen to update availability to show premium update modal
    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable(() => {
      setShowUpdateModal(true);
    });

    const unsubscribeDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setShowUpdateModal(true);
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeDownloaded();
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
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <TransactionList />;
      case 'income': return <TransactionList filterType="income" />;
      case 'expenses': return <TransactionList filterType="expense" />;
      case 'credit-card': return <TransactionList filterType="credit_card" />;
      case 'financing': return <FinancingModule />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-50 text-stone-900">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
        <header className="h-20 bg-stone-50/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8 border-b border-stone-200 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
             <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Procurar transações, categorias ou relatórios..."
                  className="w-full bg-white border border-stone-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
              onClick={() => setIsProfileSettingsOpen(true)}
              className="flex items-center gap-2 hover:bg-stone-100 p-1 rounded-full transition-colors pr-3"
            >
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-500/10 overflow-hidden">
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-sm font-semibold text-stone-700">{user?.name}</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">@{user?.username}</span>
                </div>
             </button>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>

        </div>
      {isProfileSettingsOpen && <ProfileSettings onClose={() => setIsProfileSettingsOpen(false)} />}
      {showUpdateModal && <UpdateModal onClose={() => setShowUpdateModal(false)} />}
    </div>
  );
}
