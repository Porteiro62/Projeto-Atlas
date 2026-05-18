import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.ts';
import { runMigrations } from './migrations.ts';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { encryptBuffer, decryptBuffer } from '../utils/crypto.ts';

// Cross-platform database directory finder
export function getAtlasDir(): string {
  let baseDir: string;
  if (process.platform === 'win32') {
    baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
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
  return atlasDir;
}

export const appDbPath = path.join(getAtlasDir(), 'local.db');
export const appDbEncPath = path.join(getAtlasDir(), 'local.db.enc');
export const authConfigPath = path.join(getAtlasDir(), 'auth.json');

// Migrate existing legacy database at project root if present to our persistent folder
const legacyDbPath = path.join(process.cwd(), 'local.db');
if (fs.existsSync(legacyDbPath) && !fs.existsSync(appDbPath) && !fs.existsSync(appDbEncPath)) {
  try {
    fs.copyFileSync(legacyDbPath, appDbPath);
    console.log(`[Database] Migrated legacy database from ${legacyDbPath} to ${appDbPath}`);
  } catch (err) {
    console.error(`[Database] Failed to migrate legacy database:`, err);
  }
}

let sqliteInstance: any = null;
let drizzleInstance: any = null;
let activeMasterKey: Buffer | null = null;

export interface StoredWebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
}

export interface AuthConfig {
  name: string;
  username: string;
  pinHash: string;
  salt: string;
  masterKeyEncrypted: string;
  webauthnCredential?: StoredWebAuthnCredential;
}

/**
 * Database Access Proxy.
 * Acts as the same 'db' instance imported throughout the application.
 * Any operations attempted while locked will throw a clear DATABASE_LOCKED error.
 */
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (!drizzleInstance) {
      throw new Error("DATABASE_LOCKED: O banco de dados está criptografado e bloqueado.");
    }
    return Reflect.get(drizzleInstance, prop, receiver);
  }
});

export function isDatabaseUnlocked(): boolean {
  return drizzleInstance !== null;
}

export function isDatabaseRegistered(): boolean {
  return fs.existsSync(authConfigPath);
}

export function getAuthConfig(): AuthConfig | null {
  if (!isDatabaseRegistered()) return null;
  try {
    return JSON.parse(fs.readFileSync(authConfigPath, 'utf8'));
  } catch (e) {
    console.error('[Database] Failed to read auth config', e);
    return null;
  }
}

export function saveAuthConfig(config: AuthConfig) {
  fs.writeFileSync(authConfigPath, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Unlocks the database using the provided raw master key.
 * Decrypts local.db.enc to local.db and opens the Drizzle connection.
 */
export function unlockDatabase(masterKeyHex: string) {
  if (drizzleInstance) return; // Already unlocked

  activeMasterKey = Buffer.from(masterKeyHex, 'hex');

  // Decrypt local.db.enc if it exists
  if (fs.existsSync(appDbEncPath)) {
    try {
      const encryptedBuffer = fs.readFileSync(appDbEncPath);
      const decryptedBuffer = decryptBuffer(encryptedBuffer, activeMasterKey);
      fs.writeFileSync(appDbPath, decryptedBuffer);
      console.log("[Database] Database file decrypted successfully.");
    } catch (err) {
      console.error("[Database] Failed to decrypt database. Master key might be incorrect.", err);
      activeMasterKey = null;
      throw new Error("FAIL_DECRYPT: Chave de criptografia inválida.");
    }
  } else {
    // If no encrypted database exists, but a plaintext one does, we will encrypt it upon locking.
    console.log("[Database] No encrypted database file found. Plaintext or new database will be used.");
  }

  // Open SQLite connection on decrypted local.db
  sqliteInstance = new Database(appDbPath);

  // Run schema migrations automatically
  try {
    runMigrations(sqliteInstance);
  } catch (migrationError) {
    console.error('[Database] Failed to run schema migrations:', migrationError);
  }

  drizzleInstance = drizzle(sqliteInstance, { schema });
}

/**
 * Locks the database.
 * Closes SQLite, encrypts local.db to local.db.enc, and securely erases the plaintext file.
 */
export function lockDatabase() {
  if (!drizzleInstance) return; // Already locked

  if (sqliteInstance) {
    try {
      sqliteInstance.close();
    } catch (e) {
      console.error('[Database] Error closing SQLite', e);
    }
    sqliteInstance = null;
  }
  drizzleInstance = null;

  if (fs.existsSync(appDbPath) && activeMasterKey) {
    try {
      const plaintextBuffer = fs.readFileSync(appDbPath);
      
      // Encrypt using AES-256-GCM
      const encryptedBuffer = encryptBuffer(plaintextBuffer, activeMasterKey);
      fs.writeFileSync(appDbEncPath, encryptedBuffer);
      
      // Secure erase: overwrite with zeros before deletion to prevent data recovery
      const zeros = Buffer.alloc(plaintextBuffer.length);
      fs.writeFileSync(appDbPath, zeros);
      fs.unlinkSync(appDbPath);
      
      console.log("[Database] Database encrypted and plaintext erased successfully.");
    } catch (err) {
      console.error("[Database] Failed to lock and encrypt database:", err);
    }
  }

  activeMasterKey = null;
}
