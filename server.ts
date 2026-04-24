import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pkg from 'pg';
import { GoogleGenerativeAI } from "@google/generative-ai";
const { Pool } = pkg;

dotenv.config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-stable-123";
const DATABASE_URL = process.env.DATABASE_URL || process.env.database_url;

// --- Database Wrapper ---
let db_sqlite: any;
let db_pg: any;

console.log("🔍 Verificando variáveis de ambiente...");
console.log("- DATABASE_URL:", DATABASE_URL ? "Definida (oculta)" : "NÃO DEFINIDA");
console.log("- database_url:", process.env.database_url ? "Definida (oculta)" : "NÃO DEFINIDA");
console.log("- GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Definida" : "NÃO DEFINIDA");

if (DATABASE_URL) {
  console.log("🌐 Tentando conectar ao PostgreSQL (Supabase)...");
  db_pg = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
} else {
  console.log("📁 Usando Banco de Dados: SQLite Local (Aviso: Dados serão perdidos no Render)");
  db_sqlite = new Database("finance.db");
}

async function query(sql: string, params: any[] = []) {
  if (db_pg) {
    let pgSql = sql;
    let paramCount = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramCount++}`);
    
    // Add RETURNING id to inserts for PG
    if (pgSql.trim().toLowerCase().startsWith("insert")) {
      pgSql += " RETURNING id";
    }

    const res = await db_pg.query(pgSql, params);
    return { 
      rows: res.rows, 
      lastInsertRowid: res.rows[0]?.id,
      changes: res.rowCount 
    };
  }
  const stmt = db_sqlite.prepare(sql);
  if (sql.trim().toLowerCase().startsWith("select")) {
    return { rows: stmt.all(...params) };
  }
  const info = stmt.run(...params);
  return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
}

// Initial Table Setup
async function setupTables() {
  console.log("🛠️ Iniciando configuração das tabelas...");
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      type TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline TEXT
    );
  `;
  try {
    if (db_pg) {
      await db_pg.query(schema);
      console.log("✅ Tabelas PostgreSQL verificadas/criadas com sucesso.");
    } else {
      db_sqlite.exec(schema.replace(/SERIAL/g, "INTEGER").replace(/PRIMARY KEY/g, "PRIMARY KEY AUTOINCREMENT"));
      console.log("✅ Tabelas SQLite verificadas/criadas com sucesso.");
    }
  } catch (error) {
    console.error("❌ ERRO AO CRIAR TABELAS:", error);
  }
}

// Initial Table Setup called inside startServer

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
      if (err) {
        console.error("🔐 Erro na verificação do token:", err.name, err.message);
        const message = err.name === 'TokenExpiredError' ? "Sessão expirada" : "Token inválido ou expirado";
        return res.status(403).json({ error: message, details: err.message });
      }
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = await query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);
      const userId = info.lastInsertRowid;
      const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: userId, name, email } });
    } catch (error: any) {
      if (error.message.includes("UNIQUE") || error.code === '23505') {
        res.status(400).json({ error: "E-mail já cadastrado" });
      } else {
        res.status(500).json({ error: "Erro ao registrar usuário" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const { rows } = await query("SELECT * FROM users WHERE email = ?", [email]);
      const user = rows[0];
      if (!user) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Senha incorreta" });
      }
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login", details: error.message });
    }
  });

  app.get("/api/health", async (req, res) => {
    const status: any = {
      db_type: db_pg ? "PostgreSQL" : "SQLite",
      env: process.env.NODE_ENV,
      time: new Date().toISOString(),
    };
    try {
      await query("SELECT 1");
      status.db_connection = "OK";
    } catch (e: any) {
      status.db_connection = "ERROR";
      status.db_error = e.message;
    }
    res.json(status);
  });

  // --- API Routes ---
  app.get("/api/transactions", authenticateToken, async (req: any, res) => {
    try {
      const { rows } = await query("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC", [req.user.id]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar transações" });
    }
  });

  app.get("/api/summary", authenticateToken, async (req: any, res) => {
    try {
      const { rows } = await query(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as "totalIncome",
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as "totalExpense"
        FROM transactions
        WHERE user_id = ?
      `, [req.user.id]);
      res.json(rows[0] || { totalIncome: 0, totalExpense: 0 });
    } catch (error) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/transactions", authenticateToken, async (req: any, res) => {
    const { amount, category, description, date, type } = req.body;
    try {
      const info = await query(
        "INSERT INTO transactions (user_id, amount, category, description, date, type) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, amount, category, description, date, type]
      );
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar transação" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, async (req: any, res) => {
    try {
      await query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar" });
    }
  });

  // --- Goals Routes ---
  app.get("/api/goals", authenticateToken, async (req: any, res) => {
    try {
      const { rows } = await query("SELECT * FROM goals WHERE user_id = ?", [req.user.id]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar metas" });
    }
  });

  app.post("/api/goals", authenticateToken, async (req: any, res) => {
    const { name, target_amount, current_amount, deadline } = req.body;
    try {
      const info = await query(
        "INSERT INTO goals (user_id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, name, target_amount, current_amount || 0, deadline]
      );
      res.json({ id: info.lastInsertRowid });
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

  // --- AI Routes ---
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  app.post("/api/ai/chat", authenticateToken, async (req: any, res) => {
    const { message, transactions } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Configuração ausente: GEMINI_API_KEY não encontrada no servidor." });
    }

    try {
      let model;
      const prompt = `
        Você é o "Finane", um assistente financeiro.
        Contexto do Usuário: ${JSON.stringify(transactions.slice(0, 30))}
        Pergunta: ${message}
      `;

      let text = "";
      try {
        console.log("🤖 Tentando IA com gemini-1.5-flash...");
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        text = result.response.text();
      } catch (err1: any) {
        console.warn("⚠️ Falha no gemini-1.5-flash, tentando gemini-pro...", err1.message);
        model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        text = result.response.text();
      }
      
      res.json({ text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ 
        error: "Erro na IA", 
        details: error.message?.includes("API key") ? "Chave de API inválida" : error.message 
      });
    }
  });

  app.post("/api/ai/insights", authenticateToken, async (req: any, res) => {
    const { transactions } = req.body;
    try {
      const prompt = `
        Aja como um consultor financeiro. Analise estas transações e dê 3 dicas curtas:
        ${JSON.stringify(transactions.slice(0, 50))}
      `;
      let text = "";
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        text = result.response.text();
      } catch (err) {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        text = result.response.text();
      }
      res.json({ text });
    } catch (error) {
      res.status(500).json({ error: "Erro nos insights" });
    }
  });

  await setupTables();
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ FINANE ONLINE EM: http://0.0.0.0:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error("🔥 FALHA CRÍTICA NO STARTUP:", err);
  process.exit(1);
});
