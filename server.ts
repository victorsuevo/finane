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
  console.log("🌐 DATABASE_URL detectada. Tentando conectar ao PostgreSQL...");
  db_pg = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
} else {
  console.log("⚠️ ATENÇÃO: DATABASE_URL NÃO encontrada. Usando SQLite local (DADOS SERÃO PERDIDOS NO RESTART).");
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
      goal_id INTEGER DEFAULT NULL,
      investment_id INTEGER DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline TEXT
    );
    CREATE TABLE IF NOT EXISTS investments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      current_amount REAL DEFAULT 0
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
      console.log(`[AUTH] Request by: ${user.email} (ID: ${user.id})`);
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
    let { name, email, password } = req.body;
    email = email.toLowerCase().trim();
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = await query(
        "INSERT INTO users (name, email, password, is_manager) VALUES (?, ?, ?, 0)",
        [name, email, hashedPassword]
      );
      const userId = info.lastInsertRowid;
      const token = jwt.sign({ id: userId, email, name, is_manager: false }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`[AUTH] Novo usuário registrado: ${email} (ID: ${userId})`);
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
    let { email, password } = req.body;
    email = email.toLowerCase().trim();
    try {
      const { rows } = await query("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);
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
      console.log(`[AUTH] Login bem-sucedido: ${email} (ID: ${user.id})`);
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

  // --- Investments Routes ---
  app.get("/api/investments", authenticateToken, async (req: any, res) => {
    try {
      const { rows } = await query("SELECT * FROM investments WHERE user_id = ?", [req.user.id]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar investimentos" });
    }
  });

  app.post("/api/investments", authenticateToken, async (req: any, res) => {
    const { name, type, current_amount } = req.body;
    try {
      await query(
        "INSERT INTO investments (user_id, name, type, current_amount) VALUES (?, ?, ?, ?)",
        [req.user.id, name, type, current_amount || 0]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar investimento" });
    }
  });

  app.delete("/api/investments/:id", authenticateToken, async (req: any, res) => {
    try {
      await query("DELETE FROM investments WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar investimento" });
    }
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
    const { amount, category, description, date, type, installments, goal_id, investment_id } = req.body;
    const totalInstallments = parseInt(installments) || 1;

    try {
      // ── Resolve goal/investment: prefer explicit id ──
      let resolvedGoalId: number | null = goal_id || null;
      let resolvedInvestId: number | null = investment_id || null;

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

      if (!resolvedInvestId && type === 'expense' && category) {
        const { rows: matchedInvests } = await query(
          "SELECT id FROM investments WHERE user_id = ? AND name = ?",
          [req.user.id, category]
        );
        if (matchedInvests.length > 0) {
          resolvedInvestId = matchedInvests[0].id;
        }
      }

      // Insert first (or only) transaction
      const info = await query(
        "INSERT INTO transactions (user_id, amount, category, description, date, type, installments, installment_num, goal_id, investment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [req.user.id, amount, category, description, date, type, totalInstallments, 1, resolvedGoalId, resolvedInvestId]
      );
      const parentId = info.lastInsertRowid;
      console.log(`[INSTALLMENTS] Transação principal criada. ID: ${parentId}, Parcelas: ${totalInstallments}`);

      // If parceled, insert remaining installments
      if (totalInstallments > 1 && parentId) {
        const [year, month, day] = date.split('-').map(Number);
        
        for (let i = 2; i <= totalInstallments; i++) {
          // Robust month addition logic
          let nextYear = year;
          let nextMonth = month + (i - 1) - 1; // 0-indexed month
          
          nextYear += Math.floor(nextMonth / 12);
          nextMonth = nextMonth % 12;
          
          // Create date and adjust if day overflows the month
          const nextDate = new Date(nextYear, nextMonth + 1, 0); // Last day of target month
          const targetDay = Math.min(day, nextDate.getDate());
          
          const finalDate = new Date(nextYear, nextMonth, targetDay, 12, 0, 0);
          const nextDateStr = finalDate.toISOString().split('T')[0];
          const installDesc = `${description} (${i}/${totalInstallments})`;
          await query(
            "INSERT INTO transactions (user_id, amount, category, description, date, type, installments, installment_ref, installment_num, goal_id, investment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [req.user.id, amount, category, installDesc, nextDateStr, type, totalInstallments, parentId, i, resolvedGoalId, resolvedInvestId]
          );
        }
        // Update first transaction description
        const firstDesc = `${description} (1/${totalInstallments})`;
        await query(
          "UPDATE transactions SET description = ? WHERE id = ?",
          [firstDesc, parentId]
        );
        console.log(`[INSTALLMENTS] Sucesso ao gerar parcelas filhas para o pai ${parentId}`);
      }

      // ── Update Goal Balance ──
      if (resolvedGoalId && type === 'expense') {
        const totalToDebit = totalInstallments > 1 ? amount * totalInstallments : amount;
        await query(
          "UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?",
          [totalToDebit, resolvedGoalId, req.user.id]
        );
      }

      // ── Update Investment Balance ──
      if (resolvedInvestId && type === 'expense') {
        const totalToDebit = totalInstallments > 1 ? amount * totalInstallments : amount;
        await query(
          "UPDATE investments SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?",
          [totalToDebit, resolvedInvestId, req.user.id]
        );
      }

      res.json({ id: parentId, installments: totalInstallments, goal_id: resolvedGoalId, investment_id: resolvedInvestId });
    } catch (error: any) {
      console.error("Erro ao salvar transação:", error);
      res.status(500).json({ error: "Erro ao salvar transação" });
    }
  });

  app.put("/api/transactions/:id", authenticateToken, async (req: any, res) => {
    const { amount, category, description, date, type, installments: newInstallments, goal_id, investment_id } = req.body;
    const totalInstallments = parseInt(newInstallments) || 1;

    try {
      // 1. Fetch the existing transaction to see if it's part of a series
      const { rows: existing } = await query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
      const t = existing[0];
      if (!t) return res.status(404).json({ error: "Transação não encontrada" });

      const isSeries = t.installments > 1 || t.installment_ref;
      const willBeSeries = totalInstallments > 1;
      const parentId = t.installment_ref || t.id;

      // 2. Encontrar a transação pai para preservar a data original do lançamento
      const { rows: parentRows } = await query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [parentId, req.user.id]);
      const tParent = parentRows[0] || t;
      
      // Se a data enviada for igual à data da parcela que está sendo editada, 
      // significa que o usuário NÃO alterou a data manualmente. 
      // Nesse caso, usamos a data do pai para manter o início da série original.
      const finalBaseDate = (date === t.date) ? tParent.date : date;

      if (isSeries || willBeSeries) {
        // --- Cascade Edit: Delete old (single or series) and recreate ---
        
        // Find all members to revert goals
        const { rows: series } = await query(
          "SELECT * FROM transactions WHERE (id = ? OR installment_ref = ?) AND user_id = ?",
          [parentId, parentId, req.user.id]
        );

        for (const item of series) {
          if (item.goal_id && item.type === 'expense') {
            await query("UPDATE goals SET current_amount = CASE WHEN current_amount - ? < 0 THEN 0 ELSE current_amount - ? END WHERE id = ? AND user_id = ?", [item.amount, item.amount, item.goal_id, req.user.id]);
          }
        }

        // Delete old series
        await query("DELETE FROM transactions WHERE (id = ? OR installment_ref = ?) AND user_id = ?", [parentId, parentId, req.user.id]);

        // Re-insert as NEW transaction using finalBaseDate
        const info = await query(
          "INSERT INTO transactions (user_id, amount, category, description, date, type, installments, installment_num, goal_id, investment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [req.user.id, amount, category, description, finalBaseDate, type, totalInstallments, 1, goal_id, investment_id]
        );
        const newParentId = info.lastInsertRowid;

        if (totalInstallments > 1 && newParentId) {
          const [year, month, day] = finalBaseDate.split('-').map(Number);
          for (let i = 2; i <= totalInstallments; i++) {
            let nextYear = year;
            let nextMonth = month + (i - 1) - 1;
            nextYear += Math.floor(nextMonth / 12);
            nextMonth = nextMonth % 12;
            const nextDateLimit = new Date(nextYear, nextMonth + 1, 0);
            const targetDay = Math.min(day, nextDateLimit.getDate());
            const finalDate = new Date(nextYear, nextMonth, targetDay, 12, 0, 0);
            const nextDateStr = finalDate.toISOString().split('T')[0];
            const installDesc = `${description} (${i}/${totalInstallments})`;
            await query(
              "INSERT INTO transactions (user_id, amount, category, description, date, type, installments, installment_ref, installment_num, goal_id, investment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [req.user.id, amount, category, installDesc, nextDateStr, type, totalInstallments, newParentId, i, goal_id, investment_id]
            );
          }
          await query("UPDATE transactions SET description = ? WHERE id = ?", [`${description} (1/${totalInstallments})`, newParentId]);
        }

        if (goal_id && type === 'expense') {
          const totalToDebit = totalInstallments > 1 ? amount * totalInstallments : amount;
          await query("UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [totalToDebit, goal_id, req.user.id]);
        }

        if (investment_id && type === 'expense') {
          const totalToDebit = totalInstallments > 1 ? amount * totalInstallments : amount;
          await query("UPDATE investments SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [totalToDebit, investment_id, req.user.id]);
        }

        return res.json({ message: "Série atualizada com sucesso", id: newParentId });
      }

      // --- Normal Edit ---
      // Revert old goal if changed
      if (t.goal_id && t.type === 'expense') {
        await query("UPDATE goals SET current_amount = CASE WHEN current_amount - ? < 0 THEN 0 ELSE current_amount - ? END WHERE id = ? AND user_id = ?", [t.amount, t.amount, t.goal_id, req.user.id]);
      }
      
      // Revert old investment if changed
      if (t.investment_id && t.type === 'expense') {
        await query("UPDATE investments SET current_amount = CASE WHEN current_amount - ? < 0 THEN 0 ELSE current_amount - ? END WHERE id = ? AND user_id = ?", [t.amount, t.amount, t.investment_id, req.user.id]);
      }

      await query(
        "UPDATE transactions SET amount = ?, category = ?, description = ?, date = ?, type = ?, goal_id = ?, investment_id = ? WHERE id = ? AND user_id = ?",
        [amount, category, description, date, type, goal_id, investment_id, req.params.id, req.user.id]
      );

      if (goal_id && type === 'expense') {
        await query("UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [amount, goal_id, req.user.id]);
      }

      if (investment_id && type === 'expense') {
        await query("UPDATE investments SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [amount, investment_id, req.user.id]);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Update error:", error);
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

      // --- Cascade Delete Logic ---
      const parentId = t.installment_ref || t.id;

      // Find all related transactions to revert goals
      const { rows: series } = await query(
        "SELECT * FROM transactions WHERE (id = ? OR installment_ref = ?) AND user_id = ?",
        [parentId, parentId, req.user.id]
      );

      for (const item of series) {
        // Reverse goal contribution
        let itemGoalId = item.goal_id || null;
        if (!itemGoalId && item.type === 'expense' && item.category) {
          const { rows: mg } = await query("SELECT id FROM goals WHERE user_id = ? AND name = ?", [req.user.id, item.category]);
          if (mg.length > 0) itemGoalId = mg[0].id;
        }

        if (itemGoalId && item.type === 'expense') {
          await query(
            "UPDATE goals SET current_amount = CASE WHEN current_amount - ? < 0 THEN 0 ELSE current_amount - ? END WHERE id = ? AND user_id = ?",
            [item.amount, item.amount, itemGoalId, req.user.id]
          );
        }

        // Reverse investment contribution
        let itemInvestId = item.investment_id || null;
        if (itemInvestId && item.type === 'expense') {
          await query(
            "UPDATE investments SET current_amount = CASE WHEN current_amount - ? < 0 THEN 0 ELSE current_amount - ? END WHERE id = ? AND user_id = ?",
            [item.amount, item.amount, itemInvestId, req.user.id]
          );
        }
      }

      // Delete the entire series
      await query(
        "DELETE FROM transactions WHERE (id = ? OR installment_ref = ?) AND user_id = ?",
        [parentId, parentId, req.user.id]
      );

      res.json({ message: "Série de parcelas removida com sucesso" });
    } catch (error: any) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Erro ao remover" });
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
            model: "llama3-8b-8192", // Smaller model with higher rate limits
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        if (response.ok) {
          return data.choices?.[0]?.message?.content || "Desculpe, não entendi.";
        }
        throw new Error(data.error?.message || "Erro na API do Groq");
      } catch (err: any) {
        if (err.message.includes('Rate limit') || err.message.includes('Too Many Requests')) {
          throw new Error("O limite diário de consultas à IA foi atingido. Por favor, tente novamente mais tarde.");
        }
        throw new Error(`Gemini e Groq falharam. Erro Groq: ${err.message}`);
      }
    }

    if (geminiError === "Quota exceeded") {
      throw new Error("Limite de consultas à IA excedido (Gemini). Nenhuma chave Groq configurada para fallback.");
    }
    throw new Error(geminiError || "Erro desconhecido ao chamar IA");
  }

  app.post("/api/ai/chat", authenticateToken, async (req: any, res) => {
    const { message, transactions, goals = [] } = req.body;
    try {
      const goalsContext = goals.length > 0 ? `Metas do usuário (trate transações nestas categorias como investimentos/poupança, não como gastos negativos): ${JSON.stringify(goals)}` : '';
      const prompt = `
        Você é o "SUEVO", um assistente financeiro pessoal inteligente em português.
        Contexto do Usuário (últimas transações): ${JSON.stringify(transactions.slice(0, 30))}
        ${goalsContext}
        Pergunta do usuário: ${message}
      `;
      const text = await callAI(prompt);
      res.json({ text });
    } catch (error: any) {
      res.status(500).json({ error: "Erro na IA", details: error.message });
    }
  });

  app.post("/api/ai/insights", authenticateToken, async (req: any, res) => {
    const { transactions, goals = [] } = req.body;
    try {
      const goalsContext = goals.length > 0 ? `Metas do usuário: ${JSON.stringify(goals)}. IMPORTANTE: Se uma transação for para uma destas metas, ela é um INVESTIMENTO (positivo para o futuro), e não um gasto ruim.` : '';
      const prompt = `
        Aja como um consultor financeiro pessoal em português. Analise estas transações e dê 3 dicas curtas e práticas.
        Contexto:
        - Transações: ${JSON.stringify(transactions.slice(0, 50))}
        - ${goalsContext}
        
        Regra: Não dê bronca por gastos em Metas/Investimentos. Elogie o usuário por poupar dinheiro nessas categorias.
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

    await setupTables();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ SUEVO ONLINE EM: http://0.0.0.0:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error("🔥 FALHA CRÍTICA NO STARTUP:", err);
  process.exit(1);
});
