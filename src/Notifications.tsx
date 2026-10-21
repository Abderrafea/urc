import React, { useEffect, useRef, useState } from 'react';
import { Client, TokenProvider } from '@pusher/push-notifications-web';
import { useStore } from './store';

// Serialize setup and cleanup so an account switch cannot retain the previous identity.
let deviceTask: Promise<unknown> = Promise.resolve();
export function Notifications() {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [status, setStatus] = useState('Vérification des notifications…');
  const [pending, setPending] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const lifecycle = useRef<{ active: boolean; client: Client | null }>({ active: false, client: null });
  useEffect(() => {
    const scope = { active: true, client: null as Client | null };
    lifecycle.current = scope;
    const controller = new AbortController();
    setInstanceId(null); setEnabled(false);
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !window.isSecureContext) {
      setStatus('Notifications non disponibles sur ce navigateur.');
    } else {
      fetch('/api/beams?config=1', { headers: { Authorization: `Bearer ${session?.token}` }, signal: controller.signal })
        .then(async (response) => {
          if (response.status === 401) { if (scope.active) logout(); return; }
          if (!response.ok) throw new Error();
          const config = await response.json();
          if (!scope.active) return;
          setInstanceId(config.instanceId);
          setStatus(config.configured ? 'Recevez une notification à chaque nouveau message.' : 'Les notifications seront disponibles après configuration de Pusher.');
        }).catch(() => { if (scope.active) setStatus('Notifications indisponibles. Rechargez la page pour réessayer.'); });
    }
    return () => {
      scope.active = false; controller.abort();
      deviceTask = deviceTask.catch(() => {}).then(async () => { if (scope.client) await scope.client.stop(); });
    };
  }, [session?.token, logout]);
  const enable = async () => {
    if (!session || !instanceId || pending) return;
    const scope = lifecycle.current;
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (scope.active) setStatus('Notifications refusées. Autorisez-les dans les paramètres du navigateur.');
        return;
      }
      const task = deviceTask.catch(() => {}).then(async () => {
        if (!scope.active) return;
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        if (!scope.active) return;
        if (!scope.client) scope.client = new Client({ instanceId, serviceWorkerRegistration: registration });
        await scope.client.start();
        if (!scope.active) return;
        await scope.client.setUserId(session.externalId, new TokenProvider({ url: '/api/beams', headers: { Authorization: `Bearer ${session.token}` } }));
        if (scope.active) { setStatus('Notifications activées.'); setEnabled(true); }
      });
      deviceTask = task;
      await task;
    } catch { if (scope.active) setStatus('Activation impossible. Vérifiez les autorisations et réessayez.'); }
    finally { if (scope.active) setPending(false); }
  };
  return <div className="notifications"><p className="muted" role="status">{status}</p>
    {instanceId && !enabled && <button className="secondary" onClick={enable} disabled={pending}>{pending ? 'Activation…' : 'Activer les notifications'}</button>}
  </div>;
}
