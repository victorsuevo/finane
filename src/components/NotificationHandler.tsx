import { useEffect } from 'react';
import { NotificationsListener } from 'capacitor-notifications-listener';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuth } from '../contexts/AuthContext';
import { chatWithAssistant } from '../services/geminiService';
import { getApiUrl } from '../lib/api';

export default function NotificationHandler({ onRefresh }: { onRefresh: () => void }) {
  const { token, user } = useAuth();

  useEffect(() => {
    if (!token) return;

    const startListening = async () => {
      try {
        // Permissões
        await NotificationsListener.requestPermission();
        await LocalNotifications.requestPermissions();

        NotificationsListener.addListener('notificationReceived', async (notification: any) => {
          console.log('Notificação recebida:', notification);
          
          const text = notification.text || notification.body || "";
          const title = notification.title || "";
          
          const bankKeywords = ['compra', 'aprovada', 'pagamento', 'transferência', 'pix', 'recebido', 'estorno', 'cancelada', 'estornado', 'devolvido'];
          const fullText = (title + " " + text).toLowerCase();
          
          const isBank = bankKeywords.some(key => fullText.includes(key));
          
          if (isBank) {
            console.log('Detectada possível notificação bancária. Processando com SUEVO...');
            
            const response = await chatWithAssistant(
              `Notificação recebida: "${text}". Se for um gasto, gere o TRANSACTION_DATA.`,
              [], 
              [], 
              [],
              user?.name
            );

            const isAuto = localStorage.getItem('suevo_auto_register') === 'true';
            
            if (typeof response === 'string' && response.includes('[TRANSACTION_DATA:')) {
              const match = response.match(/\[TRANSACTION_DATA:(.*?)\]/);
              if (match && match[1]) {
                const txData = JSON.parse(match[1]);

                if (isAuto) {
                  if (txData.is_refund) {
                    // Estorno Automático
                    const res = await fetch(getApiUrl("/api/transactions"), { headers: { "Authorization": `Bearer ${token}` } });
                    const transactions = await res.json();
                    const target = transactions.find((t: any) => 
                      t.amount === txData.amount && 
                      t.type === 'expense' &&
                      (t.description.toLowerCase().includes(txData.description.toLowerCase()) || 
                       txData.description.toLowerCase().includes(t.description.toLowerCase()))
                    );

                    if (target) {
                      await fetch(getApiUrl(`/api/transactions/${target.id}`), {
                        method: "DELETE",
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      onRefresh();
                    }
                  } else {
                    // Lançamento Automático
                    await fetch(getApiUrl("/api/transactions"), {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                      body: JSON.stringify({ ...txData, date: new Date().toISOString().split('T')[0] })
                    });
                    onRefresh();
                  }
                } else {
                  // MODO MANUAL: Notifica o usuário e prepara o Chat
                  localStorage.setItem('suevo_pending_msg', JSON.stringify({
                    text: response,
                    txData: txData,
                    timestamp: Date.now()
                  }));

                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: txData.is_refund ? "🔄 Estorno Detectado" : "💰 Novo Gasto Detectado",
                        body: `${txData.description}: R$ ${txData.amount}. Toque para confirmar no SUEVO.`,
                        id: Math.floor(Math.random() * 10000),
                        sound: 'default',
                        extra: txData
                      }
                    ]
                  });

                  // Dispara evento para o ChatAssistant se ele já estiver aberto
                  window.dispatchEvent(new CustomEvent('suevo_pending_tx'));
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
