import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// Database Setup
const db = new Database("finance.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Não autorizado" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Sessão expirada" });
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashedPassword);
      const userId = info.lastInsertRowid;
      const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: userId, name, email } });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "E-mail já cadastrado" });
      } else {
        res.status(500).json({ error: "Erro ao registrar usuário" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  // --- API Routes ---
  app.get("/api/transactions", authenticateToken, (req: any, res) => {
    try {
      const transactions = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC").all(req.user.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar transações" });
    }
  });

  app.get("/api/summary", authenticateToken, (req: any, res) => {
    try {
      const summary = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
        FROM transactions
        WHERE user_id = ?
      `).get(req.user.id);
      res.json(summary || { totalIncome: 0, totalExpense: 0 });
    } catch (error) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/transactions", authenticateToken, (req: any, res) => {
    const { amount, category, description, date, type } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO transactions (user_id, amount, category, description, date, type) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(req.user.id, amount, category, description, date, type);
      res.json({ id: parseInt(info.lastInsertRowid.toString()) });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar transação" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, (req: any, res) => {
    try {
      db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar" });
    }
  });

  // --- Goals Routes ---
  app.get("/api/goals", authenticateToken, (req: any, res) => {
    try {
      const goals = db.prepare("SELECT * FROM goals WHERE user_id = ?").all(req.user.id);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar metas" });
    }
  });

  app.post("/api/goals", authenticateToken, (req: any, res) => {
    const { name, target_amount, current_amount, deadline } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO goals (user_id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?)"
      ).run(req.user.id, name, target_amount, current_amount || 0, deadline);
      res.json({ id: parseInt(info.lastInsertRowid.toString()) });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar meta" });
    }
  });

  // Serve static files from 'dist' (Production) and 'public' (All)
  const distPath = path.join(process.cwd(), "dist");
  const publicPath = path.join(process.cwd(), "public");

  app.use(express.static(publicPath));
  
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production fallback: index.html
    app.get("*", (req, res) => {
      const indexFile = path.join(distPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("App ainda em carregamento... Por favor, atualize em alguns segundos.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ FINANE ONLINE EM: http://0.0.0.0:${PORT}\n`);
  });
}

startServer();
