import express from "express";
import path from "path";
import fs from "fs";
import { db, isDatabaseUnlocked, isDatabaseRegistered, getAuthConfig, saveAuthConfig, unlockDatabase, lockDatabase, getAtlasDir, type StoredWebAuthnCredential } from "./src/database/db.ts";
import { hashPin } from "./src/utils/crypto.ts";
import crypto from "node:crypto";
import { exec } from "child_process";
import { transactions, creditCards, financings, appSettings } from "./src/database/schema.ts";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import "dotenv/config";

const RP_ID = "localhost";
const RP_NAME = "Atlas";
const EXPECTED_ORIGIN = "http://localhost:3000";
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000;

let currentRegistrationChallenge: string | null = null;
let currentAuthenticationChallenge: string | null = null;
let failedPinAttempts = 0;
let pinLockUntil = 0;
const FINANCING_META_KEY = "financing_meta";

function getDefaultFinancingMeta() {
  return {
    target: 0,
    initialValue: 0,
    monthlyInstallment: 0,
  };
}

async function getFinancingMeta() {
  const record = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, FINANCING_META_KEY),
  });

  if (!record) {
    return getDefaultFinancingMeta();
  }

  try {
    return {
      ...getDefaultFinancingMeta(),
      ...JSON.parse(record.value),
    };
  } catch (error) {
    console.error("[Server] Invalid financing meta payload:", error);
    return getDefaultFinancingMeta();
  }
}

async function saveFinancingMeta(meta: { target: number; initialValue: number; monthlyInstallment: number }) {
  const payload = JSON.stringify({
    target: Number(meta.target) || 0,
    initialValue: Number(meta.initialValue) || 0,
    monthlyInstallment: Number(meta.monthlyInstallment) || 0,
  });

  await db
    .insert(appSettings)
    .values({ key: FINANCING_META_KEY, value: payload })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: payload },
    });
}

function toWebAuthnCredential(
  credential: StoredWebAuthnCredential | undefined,
): WebAuthnCredential | null {
  if (!credential) return null;

  return {
    id: credential.id,
    publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
    counter: credential.counter,
    transports: credential.transports as WebAuthnCredential["transports"],
  };
}

function isPinLocked(): boolean {
  return pinLockUntil > Date.now();
}

function recordFailedPinAttempt() {
  failedPinAttempts += 1;
  if (failedPinAttempts >= MAX_PIN_ATTEMPTS) {
    pinLockUntil = Date.now() + LOCKOUT_WINDOW_MS;
    failedPinAttempts = 0;
  }
}

function clearPinFailures() {
  failedPinAttempts = 0;
  pinLockUntil = 0;
}

// Auto-lock database on server process termination
const cleanup = () => {
  console.log("[Server] Process exit triggered: Locking database...");
  try {
    lockDatabase();
  } catch (e) {
    console.error("[Server] Failed to lock database on exit:", e);
  }
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => {
  try {
    lockDatabase();
  } catch (e) {}
});

// Graceful shutdown via IPC message from Electron main process.
// On Windows, SIGTERM/SIGINT don't work reliably for child processes,
// so Electron sends an IPC 'shutdown' message instead.
process.on("message", (msg) => {
  if (msg === "shutdown") {
    console.log("[Server] Graceful shutdown requested via IPC. Locking database...");
    try {
      lockDatabase();
      console.log("[Server] Database locked successfully. Exiting.");
    } catch (e) {
      console.error("[Server] Failed to lock database on shutdown:", e);
    }
    process.exit(0);
  }
});

async function startServer() {
  console.log("Starting FinTrack Pro Server...");
  
  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Lock-checking middleware to protect all database routes
    app.use((req, res, next) => {
      // Only block database-driven API routes starting with /api (exclude auth and health check)
      if (!req.path.startsWith("/api") || req.path.startsWith("/api/auth") || req.path === "/api/health") {
        return next();
      }

      if (!isDatabaseUnlocked()) {
        return res.status(401).json({
          error: "DATABASE_LOCKED",
          message: "O banco de dados está criptografado e bloqueado. Autentique-se via Windows Hello."
        });
      }

      next();
    });

    // API Auth Routes
    app.get("/api/auth/status", (req, res) => {
      try {
        const registered = isDatabaseRegistered();
        if (!registered) {
          return res.json({ registered: false });
        }
        
        const config = getAuthConfig();
        res.json({ 
          registered: true, 
          windowsHelloRegistered: Boolean(config?.webauthnCredential),
          name: config?.name ?? null,
          username: config?.username ?? null,
          photoUrl: config?.photoUrl ?? null,
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/auth/webauthn/register/options", async (req, res) => {
      try {
        const { name, username } = req.body;
        if (!name || !username) {
          return res.status(400).json({ error: "Missing required registration parameters." });
        }
        if (isDatabaseRegistered()) {
          return res.status(409).json({ error: "A user is already registered." });
        }

        const options = await generateRegistrationOptions({
          rpName: RP_NAME,
          rpID: RP_ID,
          userName: username,
          userDisplayName: name,
          attestationType: "none",
          preferredAuthenticatorType: "localDevice",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "preferred",
            userVerification: "required",
          },
        });

        currentRegistrationChallenge = options.challenge;
        res.json(options);
      } catch (err: any) {
        console.error("Error generating WebAuthn registration options:", err);
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/auth/register", (req, res) => {
      try {
        const { name, username, pin, masterKeyEncrypted, masterKeyRaw } = req.body;
        
        if (!name || !username || !pin || !masterKeyEncrypted || !masterKeyRaw) {
          return res.status(400).json({ error: "Missing required registration parameters." });
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const pinHash = hashPin(pin, salt);

        // Save encrypted auth configuration
        saveAuthConfig({
          name,
          username,
          pinHash,
          salt,
          masterKeyEncrypted
        });

        // Initialize and unlock the database for the first time
        unlockDatabase(masterKeyRaw);

        res.status(201).json({ success: true });
      } catch (err: any) {
        console.error("Error during registration:", err);
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/auth/webauthn/register/verify", async (req, res) => {
      try {
        const { name, username, pin, masterKeyEncrypted, masterKeyRaw, response } = req.body as {
          name?: string;
          username?: string;
          pin?: string;
          masterKeyEncrypted?: string;
          masterKeyRaw?: string;
          response?: RegistrationResponseJSON;
        };

        if (!name || !username || !pin || !masterKeyEncrypted || !masterKeyRaw || !response) {
          return res.status(400).json({ error: "Missing required registration parameters." });
        }
        if (!currentRegistrationChallenge) {
          return res.status(400).json({ error: "Registration challenge not initialized." });
        }
        if (isDatabaseRegistered()) {
          return res.status(409).json({ error: "A user is already registered." });
        }

        const verification = await verifyRegistrationResponse({
          response,
          expectedChallenge: currentRegistrationChallenge,
          expectedOrigin: EXPECTED_ORIGIN,
          expectedRPID: RP_ID,
          requireUserVerification: true,
        });

        currentRegistrationChallenge = null;

        if (!verification.verified || !verification.registrationInfo) {
          return res.status(401).json({ error: "WEBAUTHN_REGISTRATION_FAILED" });
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const pinHash = hashPin(pin, salt);
        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

        saveAuthConfig({
          name,
          username,
          pinHash,
          salt,
          masterKeyEncrypted,
          webauthnCredential: {
            id: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString("base64url"),
            counter: credential.counter,
            transports: credential.transports,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
          },
        });

        unlockDatabase(masterKeyRaw);
        clearPinFailures();

        res.status(201).json({ success: true });
      } catch (err: any) {
        currentRegistrationChallenge = null;
        console.error("Error verifying WebAuthn registration:", err);
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/api/auth/webauthn/login/options", async (req, res) => {
      try {
        if (!isDatabaseRegistered()) {
          return res.status(400).json({ error: "No user is registered." });
        }

        const config = getAuthConfig();
        const credential = config?.webauthnCredential;
        if (!credential) {
          return res.status(400).json({ error: "WINDOWS_HELLO_NOT_CONFIGURED" });
        }

        const options = await generateAuthenticationOptions({
          rpID: RP_ID,
          userVerification: "required",
          allowCredentials: [
            {
              id: credential.id,
              transports: credential.transports as WebAuthnCredential["transports"],
            },
          ],
        });

        currentAuthenticationChallenge = options.challenge;
        res.json(options);
      } catch (err: any) {
        console.error("Error generating WebAuthn authentication options:", err);
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/auth/login", (req, res) => {
      try {
        const { pin } = req.body;
        
        if (!isDatabaseRegistered()) {
          return res.status(400).json({ error: "No user is registered." });
        }
        if (isPinLocked()) {
          return res.status(429).json({
            error: "PIN_LOCKED",
            message: "Muitas tentativas de PIN. Aguarde alguns minutos antes de tentar novamente.",
          });
        }

        const config = getAuthConfig();
        if (!config) {
          return res.status(500).json({ error: "Auth config not found." });
        }
        const pinHash = hashPin(pin, config.salt);

        if (pinHash === config.pinHash) {
          clearPinFailures();
          res.json({
            success: true,
            name: config.name,
            username: config.username,
            photoUrl: config.photoUrl ?? null,
            masterKeyEncrypted: config.masterKeyEncrypted
          });
        } else {
          recordFailedPinAttempt();
          res.status(401).json({ error: "PIN_INCORRECT", message: "PIN incorreto." });
        }
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/auth/webauthn/login/verify", async (req, res) => {
      try {
        const { response } = req.body as { response?: AuthenticationResponseJSON };
        if (!response) {
          return res.status(400).json({ error: "Missing authentication response." });
        }
        if (!currentAuthenticationChallenge) {
          return res.status(400).json({ error: "Authentication challenge not initialized." });
        }
        if (!isDatabaseRegistered()) {
          return res.status(400).json({ error: "No user is registered." });
        }

        const config = getAuthConfig();
        const credential = toWebAuthnCredential(config?.webauthnCredential);
        if (!config || !credential) {
          return res.status(400).json({ error: "WINDOWS_HELLO_NOT_CONFIGURED" });
        }

        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: currentAuthenticationChallenge,
          expectedOrigin: EXPECTED_ORIGIN,
          expectedRPID: RP_ID,
          credential,
          requireUserVerification: true,
        });

        currentAuthenticationChallenge = null;

        if (!verification.verified) {
          return res.status(401).json({ error: "WEBAUTHN_AUTH_FAILED" });
        }

        saveAuthConfig({
          ...config,
          webauthnCredential: {
            ...config.webauthnCredential!,
            counter: verification.authenticationInfo.newCounter,
            deviceType: verification.authenticationInfo.credentialDeviceType,
            backedUp: verification.authenticationInfo.credentialBackedUp,
          },
        });

        res.json({
          success: true,
          name: config.name,
          username: config.username,
          photoUrl: config.photoUrl ?? null,
          masterKeyEncrypted: config.masterKeyEncrypted,
        });
      } catch (err: any) {
        currentAuthenticationChallenge = null;
        console.error("Error verifying WebAuthn authentication:", err);
        res.status(401).json({ error: "WEBAUTHN_AUTH_FAILED", message: err.message });
      }
    });

    app.post("/api/auth/unlock", (req, res) => {
      try {
        const { masterKey } = req.body;
        if (!masterKey) {
          return res.status(400).json({ error: "Missing masterKey parameter." });
        }

        unlockDatabase(masterKey);
        const config = getAuthConfig();
        res.json({ 
          success: true,
          name: config ? config.name : 'Usuário',
          username: config ? config.username : 'usuario',
          photoUrl: config?.photoUrl ?? null,
        });
      } catch (err: any) {
        console.error("[Server] Unlock database failed:", err);
        res.status(401).json({ error: "UNLOCK_FAILED", message: err.message });
      }
    });

    app.post("/api/auth/lock", (req, res) => {
      try {
        lockDatabase();
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // API Routes
    app.get("/api/health", (req, res) => res.json({ status: "ok" }));

    app.get("/api/transactions", async (req, res) => {
      try {
        const data = await db.query.transactions.findMany({
          orderBy: [desc(transactions.date)],
        });
        res.json(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
      }
    });

    app.post("/api/transactions", async (req, res) => {
      try {
        const newTransaction = { ...req.body, id: uuidv4() };
        await db.insert(transactions).values(newTransaction);
        res.status(201).json(newTransaction);
      } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: "Failed to create transaction" });
      }
    });

    app.put("/api/transactions/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedTx = req.body;
        await db.update(transactions).set(updatedTx).where(eq(transactions.id, id));
        res.json({ id, ...updatedTx });
      } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ error: "Failed to update transaction" });
      }
    });

    app.post("/api/transactions/bulk", async (req, res) => {
      try {
        const txs = req.body;
        if (!Array.isArray(txs)) {
          return res.status(400).json({ error: "Body must be an array" });
        }
        const newTransactions = txs.map(tx => ({ ...tx, id: uuidv4() }));
        await db.insert(transactions).values(newTransactions);
        res.status(201).json(newTransactions);
      } catch (error) {
        console.error("Error creating transactions in bulk:", error);
        res.status(500).json({ error: "Failed to create transactions" });
      }
    });

    app.delete("/api/transactions", async (req, res) => {
      try {
        const { type } = req.query;
        console.log(`DELETE all transactions request. Type: ${type || 'all'}`);
        if (type) {
          await db.delete(transactions).where(eq(transactions.type, type as any));
        } else {
          await db.delete(transactions);
        }
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting all transactions:", error);
        res.status(500).json({ error: "Failed to delete transactions" });
      }
    });

    app.delete("/api/transactions/:id", async (req, res) => {
      try {
        const { id } = req.params;
        console.log(`DELETE transaction request for ID: ${id}`);
        await db.delete(transactions).where(eq(transactions.id, id));
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ error: "Failed to delete transaction" });
      }
    });

    app.get("/api/dashboard/summary", async (req, res) => {
      try {
        const allTransactions = await db.select().from(transactions);
        
        const summary = allTransactions.reduce((acc, curr) => {
          if (curr.type === 'income') {
            acc.income += curr.value;
          } else if (curr.type === 'expense' || curr.type === 'credit_card') {
            acc.expense += curr.value;
          }
          return acc;
        }, { income: 0, expense: 0 });

        res.json({
          ...summary,
          balance: summary.income - summary.expense
        });
      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).json({ error: "Dashboard summary failed" });
      }
    });

    app.get("/api/credit-cards", async (req, res) => {
      try {
        const data = await db.select().from(creditCards);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch credit cards" });
      }
    });

    app.get("/api/financings", async (req, res) => {
      try {
        const data = await db.select().from(financings);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch financings" });
      }
    });

    app.get("/api/settings/financing-meta", async (req, res) => {
      try {
        res.json(await getFinancingMeta());
      } catch (error) {
        console.error("Error fetching financing meta:", error);
        res.status(500).json({ error: "Failed to fetch financing meta" });
      }
    });

    app.put("/api/settings/financing-meta", async (req, res) => {
      try {
        const meta = {
          target: Number(req.body.target) || 0,
          initialValue: Number(req.body.initialValue) || 0,
          monthlyInstallment: Number(req.body.monthlyInstallment) || 0,
        };

        await saveFinancingMeta(meta);
        res.json(meta);
      } catch (error) {
        console.error("Error saving financing meta:", error);
        res.status(500).json({ error: "Failed to save financing meta" });
      }
    });

    app.get("/api/profile", (req, res) => {
      try {
        const config = getAuthConfig();
        if (!config) {
          return res.status(404).json({ error: "Profile not found" });
        }

        res.json({
          name: config.name,
          username: config.username,
          photoUrl: config.photoUrl ?? null,
        });
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: error.message });
      }
    });

    app.put("/api/profile", (req, res) => {
      try {
        const config = getAuthConfig();
        if (!config) {
          return res.status(404).json({ error: "Profile not found" });
        }

        const updatedProfile = {
          name: String(req.body.name || config.name).trim(),
          username: String(req.body.username || config.username).trim(),
          photoUrl: req.body.photoUrl ? String(req.body.photoUrl) : null,
        };

        saveAuthConfig({
          ...config,
          ...updatedProfile,
        });

        res.json(updatedProfile);
      } catch (error: any) {
        console.error("Error saving profile:", error);
        res.status(500).json({ error: error.message });
      }
    });

    const reportsDir = path.join(getAtlasDir(), "reports");
    if (!fs.existsSync(reportsDir)) {
      try {
        fs.mkdirSync(reportsDir, { recursive: true });
      } catch (e) {
        console.error("Failed to create reports directory:", e);
      }
    }

    app.get("/api/reports", (req, res) => {
      try {
        if (!fs.existsSync(reportsDir)) {
          return res.json([]);
        }
        const files = fs.readdirSync(reportsDir);
        const reports = files
          .filter(file => file.endsWith(".pdf"))
          .map(file => {
            const filePath = path.join(reportsDir, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              createdAt: stats.birthtime || stats.mtime,
              size: stats.size,
            };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(reports);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/reports", (req, res) => {
      try {
        const { name, content } = req.body;
        if (!name || !content) {
          return res.status(400).json({ error: "Missing name or content" });
        }
        
        const commaIndex = content.indexOf(",");
        const base64Data = commaIndex !== -1 ? content.slice(commaIndex + 1) : content;
        const filePath = path.join(reportsDir, name);
        
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        res.json({ success: true, name });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/reports/open", (req, res) => {
      try {
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({ error: "Missing name" });
        }
        const filePath = path.join(reportsDir, name);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "File not found" });
        }

        let command = "";
        if (process.platform === "win32") {
          command = `start "" "${filePath}"`;
        } else if (process.platform === "darwin") {
          command = `open "${filePath}"`;
        } else {
          command = `xdg-open "${filePath}"`;
        }

        exec(command, (error) => {
          if (error) {
            console.error("[Server] Failed to open file:", error);
            return res.status(500).json({ error: "Failed to open file" });
          }
          res.json({ success: true });
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      console.log("Initializing Vite middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized.");
    } else {
      const distPath = __dirname;
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`> Server running on http://0.0.0.0:${PORT}`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`[Server] Port ${PORT} is already in use.`);
        console.error("[Server] Close the running Atlas Electron instance or stop the other dev server before starting npm run dev.");
        process.exit(1);
      }

      console.error("[Server] Failed to start HTTP server:", error);
      process.exit(1);
    });
  } catch (err) {
    console.error("FATAL ERROR STARTING SERVER:", err);
    process.exit(1);
  }
}

startServer();
