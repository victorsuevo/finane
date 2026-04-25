import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
} catch (error) {
  console.error("CRITICAL APP ERROR:", error);
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
    <h1>Ops! Algo deu errado.</h1>
    <p>${error instanceof Error ? error.message : "Erro desconhecido"}</p>
    <button onclick="localStorage.clear(); location.reload();" style="padding: 10px; background: red; color: white; border: none; border-radius: 5px; cursor: pointer;">
      Limpar dados e recarregar
    </button>
  </div>`;
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}
