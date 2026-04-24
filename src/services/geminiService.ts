import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export async function getFinancialInsights(transactions: Transaction[]) {
  if (transactions.length === 0) return "Adicione algumas transações para receber insights personalizados.";

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
    Aja como um consultor financeiro pessoal especialista. 
    Analise a seguinte lista de transações (em JSON) e forneça 3 dicas práticas em Português do Brasil para melhorar a saúde financeira do usuário.
    Seja conciso, empático e direto ao ponto. Use uma linguagem simples.
    
    Transações:
    ${JSON.stringify(transactions.slice(0, 50))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao buscar insights da IA:", error);
    return "Não foi possível gerar insights no momento. Tente novamente mais tarde.";
  }
}

export async function chatWithAssistant(message: string, transactions: Transaction[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `
    Você é o "Finane", um assistente financeiro inteligente e amigável.
    Seu objetivo é ajudar o usuário com dúvidas sobre suas finanças pessoais baseando-se nos dados reais dele.
    
    Contexto do Usuário (Transações):
    ${JSON.stringify(transactions.slice(0, 100))}
    
    Regras:
    1. Responda sempre em Português do Brasil.
    2. Seja breve e direto.
    3. Se o usuário perguntar sobre gastos, use os dados das transações fornecidas.
    4. Se ele perguntar se pode comprar algo, analise o saldo atual e a média de gastos.
    5. Nunca invente transações que não existem no histórico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction
      }
    });
    return response.text;
  } catch (error) {
    return "Ops, tive um probleminha para processar sua pergunta. Pode repetir?";
  }
}
