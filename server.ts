import express from "express";
import path from "path";
import { db, isDatabaseUnlocked, isDatabaseRegistered, getAuthConfig, saveAuthConfig, unlockDatabase, lockDatabase } from "./src/database/db.ts";
import { hashPin } from "./src/utils/crypto.ts";
import crypto from "node:crypto";
import { transactions, creditCards, financings } from "./src/database/schema.ts";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

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
          salt: config.salt, 
          masterKeyEncrypted: config.masterKeyEncrypted 
        });
      } catch (err: any) {
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

    app.post("/api/auth/login", (req, res) => {
      try {
        const { pin } = req.body;
        
        if (!isDatabaseRegistered()) {
          return res.status(400).json({ error: "No user is registered." });
        }

        const config = getAuthConfig();
        const pinHash = hashPin(pin, config.salt);

        if (pinHash === config.pinHash) {
          res.json({
            success: true,
            name: config.name,
            username: config.username,
            masterKeyEncrypted: config.masterKeyEncrypted
          });
        } else {
          res.status(401).json({ error: "PIN_INCORRECT", message: "PIN incorreto." });
        }
      } catch (err: any) {
        res.status(500).json({ error: err.message });
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
          username: config ? config.username : 'usuario'
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

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`> Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("FATAL ERROR STARTING SERVER:", err);
    process.exit(1);
  }
}

startServer();
