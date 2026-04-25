import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

const Test = () => (
  <div style={{ 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: '#0f172a', 
    color: 'white',
    fontFamily: 'sans-serif',
    fontWeight: 'bold'
  }}>
    SISTEMA OPERACIONAL: OK - NÚCLEO ATIVO ✅
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Test />
    </AuthProvider>
  </StrictMode>,
);
