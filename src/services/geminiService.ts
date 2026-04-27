import { Transaction, Goal } from "../types";
import { getApiUrl } from "../lib/api";

export async function getFinancialInsights(transactions: Transaction[], goals: Goal[] = [], userName?: string) {
  try {
    let token = localStorage.getItem("finane_token");
    if (!token) return "Você precisa estar logado para ver insights.";
    
    token = token.replace(/^"(.*)"$/, '$1');
    const res = await fetch(getApiUrl("/api/ai/insights"), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ transactions, goals, userName })
    });
    const data = await res.json();
    return data.text || "Não foi possível gerar insights agora.";
  } catch (error) {
    return "Erro ao conectar com o servidor de IA.";
  }
}

export async function chatWithAssistant(
  message: string, 
  history: { role: 'assistant' | 'user', text: string }[],
  transactions: Transaction[], 
  goals: Goal[] = [], 
  userName?: string
) {
  try {
    let token = localStorage.getItem("finane_token");
    if (!token) return { error: "Sessão expirada", details: "Token não encontrado no navegador." };
    
    token = token.replace(/^"(.*)"$/, '$1');
    const res = await fetch(getApiUrl("/api/ai/chat"), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, history, transactions: transactions.slice(0, 30), goals, userName })
    });
    const data = await res.json();
    if (!res.ok) return data;
    return data.text || "Ops, tive um probleminha para processar sua pergunta.";
  } catch (error) {
    return { error: "Erro de conexão", details: "Não foi possível falar com o servidor." };
  }
}
