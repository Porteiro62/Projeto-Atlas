import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.ts';

const sqlite = new Database('local.db');
export const db = drizzle(sqlite, { schema });

// Auto-migrate (simple way for this applet)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    value REAL NOT NULL,
    date TEXT NOT NULL,
    recurrence TEXT DEFAULT 'none',
    status TEXT DEFAULT 'pending',
    observations TEXT,
    card_id TEXT,
    financing_id TEXT,
    installment_number INTEGER,
    total_installments INTEGER
  );

  CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    limit_amount REAL NOT NULL,
    closing_day INTEGER NOT NULL,
    due_day INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    total_value REAL NOT NULL,
    annual_interest_rate REAL NOT NULL,
    total_installments INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    monthly_payment REAL NOT NULL
  );
`);
