import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Mode hors connexion pour la version installée (inactif dans la version en ligne)
if ('serviceWorker' in navigator && location.protocol === 'https:' && !(window as any).claude) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
