'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker (public/sw.js) depois que a página carrega.
 * É ele que torna o sistema instalável como aplicativo e serve a página
 * /offline.html quando falta rede.
 */
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const registrar = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Sem service worker o sistema continua funcionando online.
      });
    };

    if (document.readyState === 'complete') {
      registrar();
    } else {
      window.addEventListener('load', registrar, { once: true });
      return () => window.removeEventListener('load', registrar);
    }
  }, []);

  return null;
}
