import { useEffect } from 'react';
import { NotificationsListener } from 'capacitor-notifications-listener';
import { useAuth } from '../contexts/AuthContext';
import { chatWithAssistant } from '../services/geminiService';
import { getApiUrl } from '../lib/api';

export default function NotificationHandler({ onRefresh }: { onRefresh: () => void }) {
  const { token, user } = useAuth();

  useEffect(() => {
    // Só inicia se estiver logado e no celular
    if (!token) return;

    const startListening = async () => {
      try {
        // Pedir permissão ao usuário (abre a tela de configurações do Android)
        // O usuário precisa ativar manualmente na primeira vez
        const status = await NotificationsListener.requestPermission();
        console.log('Notification permission status:', status);

        NotificationsListener.addListener('notificationReceived', async (notification: any) => {
          console.log('Notificação recebida:', notification);
          
          const text = notification.text || notification.body || "";
          const title = notification.title || "";
          
          // Filtro básico para não gastar API com bobagem
          const bankKeywords = ['compra', 'aprovada', 'pagamento', 'transferência', 'pix', 'recebido', 'estorno', 'cancelada', 'estornado', 'devolvido'];
          const fullText = (title + " " + text).toLowerCase();
          
          const isBank = bankKeywords.some(key => fullText.includes(key));
          
          if (isBank) {
            console.log('Detectada possível notificação bancária. Processando com SUEVO...');
            
            // Enviamos para o SUEVO analisar em silêncio
            const response = await chatWithAssistant(
              `Notificação recebida: "${text}". Se for um gasto, gere o TRANSACTION_DATA.`,
              [], // Sem histórico para ser rápido
              [], // Sem transações para economizar contexto
              [],
              user?.name
            );

            // Se o SUEVO detectar um dado e o Auto-Lançamento estiver ON
            const isAuto = localStorage.getItem('suevo_auto_register') === 'true';
            
            if (typeof response === 'string' && response.includes('[TRANSACTION_DATA:')) {
              const match = response.match(/\[TRANSACTION_DATA:(.*?)\]/);
              if (match && match[1] && isAuto) {
                const txData = JSON.parse(match[1]);
                
                if (txData.is_refund) {
                  // Lógica de Cancelamento: Busca e Deleta
                  console.log('Buscando transação para estornar:', txData.amount, txData.description);
                  
                  // 1. Pegar transações recentes
                  const res = await fetch(getApiUrl("/api/transactions"), {
                    headers: { "Authorization": `Bearer ${token}` }
                  });
                  const transactions = await res.json();
                  
                  // 2. Encontrar o par perfeito (mesmo valor e descrição parecida)
                  const target = transactions.find((t: any) => 
                    t.amount === txData.amount && 
                    t.type === 'expense' &&
                    (t.description.toLowerCase().includes(txData.description.toLowerCase()) || 
                     txData.description.toLowerCase().includes(t.description.toLowerCase()))
                  );

                  if (target) {
                    console.log('Transação encontrada! Deletando ID:', target.id);
                    await fetch(getApiUrl(`/api/transactions/${target.id}`), {
                      method: "DELETE",
                      headers: { "Authorization": `Bearer ${token}` }
                    });
                    console.log('Gasto estornado com sucesso!');
                    onRefresh();
                  } else {
                    console.log('Nenhuma transação correspondente encontrada para o estorno.');
                  }
                } else {
                  // Registro Automático Normal
                  await fetch(getApiUrl("/api/transactions"), {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      ...txData,
                      date: new Date().toISOString().split('T')[0]
                    })
                  });
                  
                  console.log('Gasto da notificação registrado automaticamente!');
                  onRefresh();
                }
              }
            }
          }
        });
      } catch (err) {
        console.error('Erro no Listener de Notificações:', err);
      }
    };

    startListening();

    return () => {
      NotificationsListener.removeAllListeners();
    };
  }, [token, user?.name, onRefresh]);

  return null; // Este componente não desenha nada na tela
}
