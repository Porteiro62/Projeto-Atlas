import Database from 'better-sqlite3';

export interface Migration {
  id: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: '0001_baseline_tables',
    up: (db) => {
      db.exec(`
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

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    }
  },
  {
    id: 2,
    name: '0002_app_settings_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    }
  }
];

export function runMigrations(db: Database.Database) {
  console.log('[Migrations] Starting verification...');
  
  // 1. Create migrations tracking table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  // 2. Query already applied migrations
  const appliedMigrations = db.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  const appliedSet = new Set(appliedMigrations.map(m => m.name));

  console.log(`[Migrations] Found ${appliedSet.size} applied migrations.`);

  // 3. Run pending migrations in transaction
  const transaction = db.transaction(() => {
    for (const migration of migrations) {
      if (!appliedSet.has(migration.name)) {
        console.log(`[Migrations] Running migration: ${migration.name}`);
        try {
          migration.up(db);
          db.prepare('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)')
            .run(migration.id, migration.name, new Date().toISOString());
          console.log(`[Migrations] Successfully applied: ${migration.name}`);
        } catch (err) {
          console.error(`[Migrations] Failed to apply ${migration.name}:`, err);
          throw err; // Rolback transaction on failure
        }
      }
    }
  });

  transaction();
  console.log('[Migrations] All migrations verified/applied successfully.');
}
