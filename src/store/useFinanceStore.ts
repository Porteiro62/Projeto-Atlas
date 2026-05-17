import { create } from 'zustand';

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
  pin?: string;
}

interface FinanceState {
  transactions: Transaction[];
  summary: Summary;
  financingMeta: FinancingMeta;
  user: UserProfile;
  isAuthenticated: boolean;
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
  login: (username: string, pin: string) => boolean;
  register: (userData: UserProfile) => void;
  logout: () => void;
  setDate: (month: number, year: number) => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  summary: { income: 0, expense: 0, balance: 0 },
  financingMeta: { target: 0, initialValue: 0, monthlyInstallment: 0 },
  user: {
    name: 'padrao',
    username: '',
    photoUrl: null,
    pin: '1234',
  },
  isAuthenticated: false,
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
    user: { ...state.user, ...userData }
  })),

  login: (username, pin) => {
    const { user } = get();
    if ((user.username === username || username === '') && user.pin === pin) {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },

  register: (userData) => set({
    user: userData,
    isAuthenticated: true
  }),

  logout: () => set({ isAuthenticated: false }),

  setDate: (month, year) => set({ selectedMonth: month, selectedYear: year }),
}));
