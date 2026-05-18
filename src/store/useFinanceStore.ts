import { create } from 'zustand';
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'credit_card' | 'financing';
  description: string;
  category: string;
  value: number;
  date: string;
  recurrence: 'none' | 'monthly' | 'yearly';
  status: 'pending' | 'paid' | 'cancelled';
  observations: string | null;
  cardId?: string;
  financingId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
}

export interface FinancingMeta {
  target: number;
  initialValue: number;
  monthlyInstallment: number;
}

export interface UserProfile {
  name: string;
  username: string;
  photoUrl: string | null;
}

interface FinanceState {
  transactions: Transaction[];
  summary: Summary;
  financingMeta: FinancingMeta;
  user: UserProfile | null;
  isAuthenticated: boolean;
  authStatus: 'loading' | 'unregistered' | 'locked' | 'authenticated';
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;
  fetchTransactions: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  addTransactions: (txs: Omit<Transaction, 'id'>[]) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteAllTransactions: (type?: Transaction['type']) => Promise<void>;
  updateFinancingMeta: (meta: FinancingMeta) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  checkAuthStatus: () => Promise<void>;
  registerUser: (name: string, username: string, pin: string) => Promise<boolean>;
  loginUser: (pin: string) => Promise<boolean>;
  loginWithWindowsHello: () => Promise<boolean>;
  lockApp: () => Promise<void>;
  logout: () => void;
  setDate: (month: number, year: number) => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  summary: { income: 0, expense: 0, balance: 0 },
  financingMeta: { target: 0, initialValue: 0, monthlyInstallment: 0 },
  user: null,
  isAuthenticated: false,
  authStatus: 'loading',
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  loading: false,

  fetchTransactions: async () => {
    set({ loading: true });
    const res = await fetch('/api/transactions');
    const data = await res.json();
    set({ transactions: data, loading: false });
  },

  fetchSummary: async () => {
    const res = await fetch('/api/dashboard/summary');
    const data = await res.json();
    set({ summary: data });
  },

  addTransaction: async (tx) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (res.ok) {
      await get().fetchTransactions();
      await get().fetchSummary();
    }
  },

  addTransactions: async (txs) => {
    const res = await fetch('/api/transactions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txs),
    });
    if (res.ok) {
      await get().fetchTransactions();
      await get().fetchSummary();
    }
  },

  updateTransaction: async (id, tx) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (res.ok) {
      await get().fetchTransactions();
      await get().fetchSummary();
    }
  },

  deleteTransaction: async (id) => {
    console.log(`Store: Deleting transaction ${id}`);
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    console.log(`Store: Delete response status: ${res.status}`);
    if (res.ok) {
      await get().fetchTransactions();
      await get().fetchSummary();
    }
  },

  deleteAllTransactions: async (type) => {
    console.log(`Store: Deleting all transactions of type: ${type || 'all'}`);
    const url = type ? `/api/transactions?type=${type}` : '/api/transactions';
    const res = await fetch(url, {
      method: 'DELETE',
    });
    console.log(`Store: Delete all response status: ${res.status}`);
    if (res.ok) {
      await get().fetchTransactions();
      await get().fetchSummary();
    }
  },

  updateFinancingMeta: (meta) => set({ financingMeta: meta }),

  updateUser: (userData) => set((state) => ({
    user: state.user ? { ...state.user, ...userData } : null
  })),

  checkAuthStatus: async () => {
    set({ authStatus: 'loading' });
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.registered) {
        set({ authStatus: 'locked' });
      } else {
        set({ authStatus: 'unregistered' });
      }
    } catch (e) {
      console.error("[Zustand] checkAuthStatus failed:", e);
      set({ authStatus: 'unregistered' });
    }
  },

  registerUser: async (name, username, pin) => {
    try {
      if (!browserSupportsWebAuthn() || !(await platformAuthenticatorIsAvailable())) {
        return false;
      }
      if (!window.electronAPI || !(await window.electronAPI.safeStorageIsAvailable())) {
        return false;
      }

      // 1. Generate a local master key (32 bytes, hex)
      const rawMasterBytes = new Uint8Array(32);
      window.crypto.getRandomValues(rawMasterBytes);
      const masterKeyRaw = Array.from(rawMasterBytes)
        .map(b => b.toString(16).padStart(2, '0')).join('');

      // 2. Protect the master key locally for this Windows user
      const masterKeyEncrypted = await window.electronAPI.safeStorageEncrypt(masterKeyRaw);

      // 3. Start Windows Hello registration via WebAuthn platform authenticator
      const optionsRes = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username }),
      });
      if (!optionsRes.ok) return false;

      const options = await optionsRes.json();
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // 4. Register user on the backend after attestation verification
      const res = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username,
          pin,
          masterKeyEncrypted,
          masterKeyRaw,
          response: registrationResponse,
        })
      });

      if (res.ok) {
        set({
          user: { name, username, photoUrl: null },
          authStatus: 'authenticated',
          isAuthenticated: true
        });
        
        // Fetch fresh decrypted data
        await get().fetchTransactions();
        await get().fetchSummary();
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Zustand] registerUser failed:", err);
      return false;
    }
  },

  loginUser: async (pin) => {
    try {
      // 1. Check PIN at backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (!res.ok) return false;
      const data = await res.json();

      // 2. Decrypt the master key in the frontend using safeStorage DPAPI
      let masterKeyHex = data.masterKeyEncrypted;
      if (window.electronAPI && await window.electronAPI.safeStorageIsAvailable()) {
        masterKeyHex = await window.electronAPI.safeStorageDecrypt(data.masterKeyEncrypted);
      }

      // 3. Unlock SQLite database
      const unlockRes = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey: masterKeyHex })
      });

      if (unlockRes.ok) {
        set({
          user: { name: data.name, username: data.username, photoUrl: null },
          authStatus: 'authenticated',
          isAuthenticated: true
        });
        
        // Fetch fresh database transactions and summary
        await get().fetchTransactions();
        await get().fetchSummary();
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Zustand] loginUser failed:", err);
      return false;
    }
  },

  loginWithWindowsHello: async () => {
    try {
      if (!browserSupportsWebAuthn() || !(await platformAuthenticatorIsAvailable())) {
        return false;
      }
      if (!window.electronAPI || !(await window.electronAPI.safeStorageIsAvailable())) {
        return false;
      }

      const optionsRes = await fetch('/api/auth/webauthn/login/options');
      if (!optionsRes.ok) return false;
      const options = await optionsRes.json();
      const authenticationResponse = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authenticationResponse }),
      });
      if (!verifyRes.ok) return false;
      const verifyData = await verifyRes.json();

      const masterKeyHex = await window.electronAPI.safeStorageDecrypt(verifyData.masterKeyEncrypted);

      // Unlock SQLite database after a real Windows Hello prompt
      const unlockRes = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey: masterKeyHex })
      });

      if (unlockRes.ok) {
        set({
          user: { name: verifyData.name, username: verifyData.username, photoUrl: null },
          authStatus: 'authenticated',
          isAuthenticated: true
        });
        
        // Fetch fresh database transactions and summary
        await get().fetchTransactions();
        await get().fetchSummary();
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Zustand] loginWithWindowsHello failed:", err);
      return false;
    }
  },

  lockApp: async () => {
    try {
      await fetch('/api/auth/lock', { method: 'POST' });
    } catch (e) {}
    set({
      user: null,
      authStatus: 'locked',
      isAuthenticated: false,
      transactions: [],
      summary: { income: 0, expense: 0, balance: 0 }
    });
  },

  logout: () => {
    get().lockApp();
  },

  setDate: (month, year) => set({ selectedMonth: month, selectedYear: year }),
}));
