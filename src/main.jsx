import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/smart-hygiene-system/sw.js', { scope: '/smart-hygiene-system/' })
      .then(reg => {
        console.log('[SW] Registered');
        // Listen for the SW telling us new assets are ready
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'SW_UPDATED') {
            console.log('[SW] New version detected — reloading...');
            window.location.reload();
          }
        });
      })
      .catch(err => console.error('[SW] Registration failed:', err));
  });
}
