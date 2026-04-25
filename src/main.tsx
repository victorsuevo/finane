import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Teste radical: se isso não aparecer, o erro é no Vite/CSS/React
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
    SISTEMA OPERACIONAL: OK - AGUARDANDO NÚCLEO...
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Test />
  </StrictMode>,
);
