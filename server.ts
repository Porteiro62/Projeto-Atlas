import express from "express";
import path from "path";
import { db } from "./src/database/db.ts";
import { transactions, creditCards, financings } from "./src/database/schema.ts";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

async function startServer() {
  console.log("Starting FinTrack Pro Server...");
  
  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
