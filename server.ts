import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-stable-123";
const DATABASE_URL = process.env.DATABASE_URL || process.env.database_url;

// --- Database Wrapper ---
let db_sqlite: any;
let db_pg: any;

console.log("🔍 Verificando variáveis de ambiente...");
console.log("- DATABASE_URL:", DATABASE_URL ? "Definida (oculta)" : "NÃO DEFINIDA");
console.log("- GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Definida" : "NÃO DEFINIDA");

if (DATABASE_URL) {
  console.log("🌐 Tentando conectar ao PostgreSQL (Supabase)...");
  db_pg = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
} else {
  console.log("📁 Usando Banco de Dados: SQLite Local");
  db_sqlite = new Database("finance.db");
}

async function query(sql: string, params: any[] = []) {
  if (db_pg) {
    let pgSql = sql;
    let paramCount = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramCount++}`);
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
      password TEXT NOT NULL,
      is_manager INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      installments INTEGER DEFAULT 1,
      installment_ref INTEGER DEFAULT NULL,
      installment_num INTEGER DEFAULT 1,
      goal_id INTEGER DEFAULT NULL
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
      // Run each statement separately for PG
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await db_pg.query(stmt);
      }
      // Add columns if missing (ALTER TABLE IF NOT EXISTS COLUMN not in all PG versions)
      const alterStatements = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_manager INTEGER DEFAULT 0`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_ref INTEGER DEFAULT NULL`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_num INTEGER DEFAULT 1`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS goal_id INTEGER DEFAULT NULL`,
      ];
      for (const stmt of alterStatements) {
        try { await db_pg.query(stmt); } catch (_) {}
      }
      console.log("✅ Tabelas PostgreSQL verificadas/criadas com sucesso.");
    } else {
      const sqliteSafe = schema
        .replace(/SERIAL/g, "INTEGER")
        .replace(/PRIMARY KEY,/g, "PRIMARY KEY AUTOINCREMENT,");
      // Split and execute each statement
      const statements = sqliteSafe.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try { db_sqlite.exec(stmt + ';'); } catch(_) {}
      }
      // Add missing columns for SQLite
      const alterCols = [
        `ALTER TABLE users ADD COLUMN is_manager INTEGER DEFAULT 0`,
        `ALTER TABLE transactions ADD COLUMN installments INTEGER DEFAULT 1`,
        `ALTER TABLE transactions ADD COLUMN installment_ref INTEGER DEFAULT NULL`,
        `ALTER TABLE transactions ADD COLUMN installment_num INTEGER DEFAULT 1`,
        `ALTER TABLE transactions ADD COLUMN goal_id INTEGER DEFAULT NULL`,
      ];
      for (const stmt of alterCols) {
        try { db_sqlite.exec(stmt); } catch (_) {}
      }
      console.log("✅ Tabelas SQLite verificadas/criadas com sucesso.");
    }
  } catch (error) {
    console.error("❌ ERRO AO CRIAR TABELAS:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json({ limit: '10mb' }));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Não autorizado" });
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        const message = err.name === 'TokenExpiredError' ? "Sessão expirada" : "Token inválido ou expirado";
        return res.status(403).json({ error: message });
      }
      req.user = user;
      next();
    });
  };

  const requireManager = (req: any, res: any, next: any) => {
    if (!req.user?.is_manager) {
      return res.status(403).json({ error: "Acesso restrito ao gestor." });
    }
    next();
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = await query(
        "INSERT INTO users (name, email, password, is_manager) VALUES (?, ?, ?, 0)",
        [name, email, hashedPassword]
      );
      const userId = info.lastInsertRowid;
      const token = jwt.sign({ id: userId, email, name, is_manager: false }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: userId, name, email, is_manager: false } });
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
      if (!user) return res.status(401).json({ error: "Usuário não encontrado" });
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return res.status(401).json({ error: "Senha incorreta" });
      const isManager = !!(user.is_manager);
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, is_manager: isManager },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, is_manager: isManager } });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login", details: error.message });
    }
  });

  app.get("/api/health", async (req, res) => {
    const status: any = { db_type: db_pg ? "PostgreSQL" : "SQLite", time: new Date().toISOString() };
    try {
      await query("SELECT 1");
      status.db_connection = "OK";
    } catch (e: any) {
      status.db_connection = "ERROR";
      status.db_error = e.message;
    }
    res.json(status);
  });

  // --- Transactions Routes ---
  app.get("/api/transactions", authenticateToken, async (req: any, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC",
        [req.user.id]
      );
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

  // Month summary
  app.get("/api/summary/month", authenticateToken, async (req: any, res) => {
    const { month } = req.query; // format: "2025-04"
    if (!month) return res.status(400).json({ error: "Parâmetro 'month' obrigatório" });
    try {
      const { rows } = await query(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as "totalIncome",
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as "totalExpense"
        FROM transactions
        WHERE user_id = ? AND date LIKE ?
      `, [req.user.id, `${month}%`]);
      res.json(rows[0] || { totalIncome: 0, totalExpense: 0 });
    } catch (error) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/transactions", authenticateToken, async (req: any, res) => {
    const { amount, category, description, date, type, installments, goal_id } = req.body;
    const totalInstallments = parseInt(installments) || 1;

    try {
      // ── Resolve goal: prefer explicit goal_id, fallback to category-name match ──
      let resolvedGoalId: number | null = goal_id || null;

      if (!resolvedGoalId && type === 'expense' && category) {
        // Check if the category name matches any goal owned by this user
        const { rows: matchedGoals } = await query(
          "SELECT id FROM goals WHERE user_id = ? AND name = ?",
          [req.user.id, category]
        );
        if (matchedGoals.length > 0) {
          resolvedGoalId = matchedGoals[0].id;
        }
      }

      // Insert first (or only) transaction
      const info = await query(
        "INSERT INTO transactions (user_id, amount, category, description, date, type, installments, installment_num, goal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [req.user.id, amount, category, description, date, type, totalInstallments, 1, resolvedGoalId]
      );
      const parentId = info.lastInsertRowid;

      // If parceled, insert remaining installments
      if (totalInstallments > 1) {
        const baseDate = new Date(date + 'T12:00:00');
        for (let i = 2; i <= totalInstallments; i++) {
          const nextDate = new Date(baseDate);
          nextDate.setMonth(nextDate.getMonth() + (i - 1));
          const nextDateStr = nextDate.toISOString().split('T')[0];
          const installDesc = `${description} (${i}/${totalInstallments})`;
          await query(
            "INSERT INTO transactions (user_id, amount, category, description, date, type, installments, installment_ref, installment_num, goal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [req.user.id, amount, category, installDesc, nextDateStr, type, totalInstallments, parentId, i, resolvedGoalId]
          );
        }
        // Update first transaction description
        const firstDesc = `${description} (1/${totalInstallments})`;
        await query(
          "UPDATE transactions SET description = ? WHERE id = ?",
          [firstDesc, parentId]
        );
      }

      // ── Debit goal current_amount (only for the 1st installment; each child counts on its own month) ──
      if (resolvedGoalId && type === 'expense') {
        // For installments, only debit the 1st parcel now; the rest will be debited when each future month's entry is posted
        // (Since all installment children are inserted now, we debit all of them)
        const totalToDebit = totalInstallments > 1 ? amount * totalInstallments : amount;
        await query(
          "UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?",
          [totalToDebit, resolvedGoalId, req.user.id]
        );
      }

      res.json({ id: parentId, installments: totalInstallments, goal_id: resolvedGoalId });
    } catch (error: any) {
      console.error("Erro ao salvar transação:", error);
      res.status(500).json({ error: "Erro ao salvar transação" });
    }
  });

  app.put("/api/transactions/:id", authenticateToken, async (req: any, res) => {
    const { amount, category, description, date, type } = req.body;
    try {
      // Simplification: Not recalculating goals/installments logic for edits yet
      await query(
        "UPDATE transactions SET amount = ?, category = ?, description = ?, date = ?, type = ? WHERE id = ? AND user_id = ?",
        [amount, category, description, date, type, req.params.id, req.user.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, async (req: any, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id]
      );
      const t = rows[0];
      if (!t) return res.status(404).json({ error: "Transação não encontrada" });

      // ── Resolve goal_id if not stored (legacy rows): match by category name ──
      let effectiveGoalId = t.goal_id || null;
      if (!effectiveGoalId && t.type === 'expense' && t.category) {
        const { rows: mg } = await query(
          "SELECT id FROM goals WHERE user_id = ? AND name = ?",
          [req.user.id, t.category]
        );
        if (mg.length > 0) effectiveGoalId = mg[0].id;
      }

      // ── Reverse goal contribution for this transaction ──
      if (effectiveGoalId && t.type === 'expense') {
        await query(
          "UPDATE goals SET current_amount = CASE WHEN current_amount - ? < 0 THEN 0 ELSE current_amount - ? END WHERE id = ? AND user_id = ?",
          [t.amount, t.amount, effectiveGoalId, req.user.id]
        );
      }

      // Delete this transaction
      await query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);

      // ── If parent with installments, delete all children and reverse their goal debits ──
      if (!t.installment_ref && t.installments > 1) {
        const { rows: children } = await query(
          "SELECT * FROM transactions WHERE installment_ref = ? AND user_id = ?",
          [req.params.id, req.user.id]
        );

        if (effectiveGoalId && t.type === 'expense' && children.length > 0) {
          const totalChildAmount = children.reduce((acc: number, c: any) => acc + c.amount, 0);
          if (totalChildAmount > 0) {
            await query(
              "UPDATE goals SET current_amount = CASE WHEN current_amount - ? < 0 THEN 0 ELSE current_amount - ? END WHERE id = ? AND user_id = ?",
              [totalChildAmount, totalChildAmount, effectiveGoalId, req.user.id]
            );
          }
        }

        await query(
          "DELETE FROM transactions WHERE installment_ref = ? AND user_id = ?",
          [req.params.id, req.user.id]
        );
      }

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

  app.delete("/api/goals/:id", authenticateToken, async (req: any, res) => {
    try {
      await query("DELETE FROM goals WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar meta" });
    }
  });

  app.put("/api/users/profile", authenticateToken, async (req: any, res) => {
    const { name } = req.body;
    try {
      await query("UPDATE users SET name = ? WHERE id = ?", [name, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // --- Manager Routes ---
  app.get("/api/manager/users", authenticateToken, requireManager, async (req: any, res) => {
    try {
      const { rows } = await query("SELECT id, name, email, is_manager FROM users ORDER BY id");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.get("/api/manager/stats", authenticateToken, requireManager, async (req: any, res) => {
    try {
      const { rows: userCount } = await query("SELECT COUNT(*) as count FROM users");
      const { rows: txCount } = await query("SELECT COUNT(*) as count FROM transactions");
      const { rows: goalCount } = await query("SELECT COUNT(*) as count FROM goals");
      const { rows: totalVol } = await query("SELECT SUM(amount) as total FROM transactions");
      res.json({
        users: parseInt(userCount[0]?.count || 0),
        transactions: parseInt(txCount[0]?.count || 0),
        goals: parseInt(goalCount[0]?.count || 0),
        totalVolume: parseFloat(totalVol[0]?.total || 0),
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  app.patch("/api/manager/users/:id/promote", authenticateToken, requireManager, async (req: any, res) => {
    const { is_manager } = req.body;
    try {
      await query("UPDATE users SET is_manager = ? WHERE id = ?", [is_manager ? 1 : 0, req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  app.delete("/api/manager/users/:id", authenticateToken, requireManager, async (req: any, res) => {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "Não pode deletar a si mesmo." });
    }
    try {
      await query("DELETE FROM transactions WHERE user_id = ?", [req.params.id]);
      await query("DELETE FROM goals WHERE user_id = ?", [req.params.id]);
      await query("DELETE FROM users WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar usuário" });
    }
  });

  // Promote first user as manager (setup endpoint, one-time use)
  app.post("/api/manager/setup", async (req, res) => {
    const { secret } = req.body;
    const SETUP_SECRET = process.env.MANAGER_SETUP_SECRET || "suevo-manager-2025";
    if (secret !== SETUP_SECRET) {
      return res.status(403).json({ error: "Segredo inválido." });
    }
    try {
      const { rows } = await query("SELECT id FROM users ORDER BY id LIMIT 1");
      if (!rows[0]) return res.status(404).json({ error: "Nenhum usuário cadastrado." });
      await query("UPDATE users SET is_manager = 1 WHERE id = ?", [rows[0].id]);
      res.json({ success: true, promoted_user_id: rows[0].id });
    } catch (error) {
      res.status(500).json({ error: "Erro ao promover gestor." });
    }
  });

  // Serve static files
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
  const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
  const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();

  async function callAI(prompt: string): Promise<string> {
    let geminiError = null;

    // 1. Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        if (response.ok) {
          return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não entendi.";
        }
        if (response.status === 429 || (data.error && data.error.message.includes('Quota exceeded'))) {
          geminiError = "Quota exceeded";
        } else {
          geminiError = data.error?.message || "Erro na API do Google";
        }
      } catch (err: any) {
        geminiError = err.message;
      }
    } else {
      geminiError = "GEMINI_API_KEY não configurada";
    }

    // 2. Fallback to Groq
    if (GROQ_API_KEY) {
      try {
        console.log(`[AI] Gemini falhou (${geminiError}). Tentando Groq Fallback...`);
        const url = "https://api.groq.com/openai/v1/chat/completions";
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama3-8b-8192", // Fast and reliable model
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        if (response.ok) {
          return data.choices?.[0]?.message?.content || "Desculpe, não entendi.";
        }
        throw new Error(data.error?.message || "Erro na API do Groq");
      } catch (err: any) {
        throw new Error(`Gemini e Groq falharam. Erro Groq: ${err.message}`);
      }
    }

    if (geminiError === "Quota exceeded") {
      throw new Error("Limite de consultas à IA excedido (Gemini). Nenhuma chave Groq configurada para fallback.");
    }
    throw new Error(geminiError || "Erro desconhecido ao chamar IA");
  }

  app.post("/api/ai/chat", authenticateToken, async (req: any, res) => {
    const { message, transactions } = req.body;
    try {
      const prompt = `
        Você é o "SUEVO", um assistente financeiro pessoal inteligente em português.
        Contexto do Usuário (últimas transações): ${JSON.stringify(transactions.slice(0, 30))}
        Pergunta do usuário: ${message}
      `;
      const text = await callAI(prompt);
      res.json({ text });
    } catch (error: any) {
      res.status(500).json({ error: "Erro na IA", details: error.message });
    }
  });

  app.post("/api/ai/insights", authenticateToken, async (req: any, res) => {
    const { transactions } = req.body;
    try {
      const prompt = `
        Aja como um consultor financeiro pessoal em português. Analise estas transações e dê 3 dicas curtas e práticas:
        ${JSON.stringify(transactions.slice(0, 50))}
      `;
      const text = await callAI(prompt);
      res.json({ text });
    } catch (error: any) {
      if (error.message.includes("Limite") || error.message.includes("Quota")) {
        return res.json({ text: "Muitas requisições simultâneas. Configure uma GROQ_API_KEY no arquivo .env.local para não ficar sem insights!" });
      }
      res.status(500).json({ error: "Erro nos insights", details: error.message });
    }
  });

  await setupTables();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ SUEVO ONLINE EM: http://0.0.0.0:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error("🔥 FALHA CRÍTICA NO STARTUP:", err);
  process.exit(1);
});
