import { Transaction, Goal } from "../types";

export async function getFinancialInsights(transactions: Transaction[], goals: Goal[] = []) {
  try {
    let token = localStorage.getItem("finane_token");
    if (!token) return "Você precisa estar logado para ver insights.";
    
    token = token.replace(/^"(.*)"$/, '$1');
    const res = await fetch("/api/ai/insights", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ transactions, goals })
    });
    const data = await res.json();
    return data.text || "Não foi possível gerar insights agora.";
  } catch (error) {
    return "Erro ao conectar com o servidor de IA.";
  }
}

export async function chatWithAssistant(message: string, transactions: Transaction[], goals: Goal[] = []) {
  try {
    let token = localStorage.getItem("finane_token");
    if (!token) return { error: "Sessão expirada", details: "Token não encontrado no navegador." };
    
    token = token.replace(/^"(.*)"$/, '$1');
    const res = await fetch("/api/ai/chat", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, transactions: transactions.slice(0, 30), goals })
    });
    const data = await res.json();
    if (!res.ok) return data;
    return data.text || "Ops, tive um probleminha para processar sua pergunta.";
  } catch (error) {
    return { error: "Erro de conexão", details: "Não foi possível falar com o servidor." };
  }
}
