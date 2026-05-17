import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.ts';
import { runMigrations } from './migrations.ts';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine the persistent, cross-platform database path
export function getDatabasePath(): string {
  let baseDir: string;
  
  if (process.platform === 'win32') {
    // e.g. C:\Users\<Username>\AppData\Roaming
    baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    // e.g. /Users/<Username>/Library/Application Support
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    // Linux / Unix: e.g. /home/<Username>/.config
    baseDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }

  const atlasDir = path.join(baseDir, 'Atlas');
  
  if (!fs.existsSync(atlasDir)) {
    try {
      fs.mkdirSync(atlasDir, { recursive: true });
    } catch (err) {
      console.error(`[Database] Failed to create directory: ${atlasDir}`, err);
    }
  }

  return path.join(atlasDir, 'local.db');
}

// Migrate existing legacy database if present
const appDbPath = getDatabasePath();
const legacyDbPath = path.join(process.cwd(), 'local.db');

if (fs.existsSync(legacyDbPath) && !fs.existsSync(appDbPath)) {
  try {
    fs.copyFileSync(legacyDbPath, appDbPath);
    console.log(`[Database] Migrated legacy database from ${legacyDbPath} to ${appDbPath}`);
  } catch (err) {
    console.error(`[Database] Failed to migrate database:`, err);
  }
}

console.log(`[Database] Connecting to database at: ${appDbPath}`);
const sqlite = new Database(appDbPath);

// Run migrations on startup
try {
  runMigrations(sqlite);
} catch (migrationError) {
  console.error('[Database] Failed to run schema migrations:', migrationError);
}

export const db = drizzle(sqlite, { schema });
