import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
export function useUnreadCounts() {
  const token = useStore((state) => state.session?.token);
  const rooms = useStore((state) => state.rooms);
  const logout = useStore((state) => state.logout);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch('/api/unread', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) { setCounts(result); setFailed(false); }
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { busy = false; }
    };
    void load();
    const timer = setInterval(load, 5000);
    window.addEventListener('urc-read', load);
    navigator.serviceWorker?.addEventListener('message', load);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('urc-read', load); navigator.serviceWorker?.removeEventListener('message', load); };
  }, [token, rooms, logout]);
  return { counts, failed };
}
export function UnreadBadge({ count }: { count?: number }) {
  return count ? <span className="unread-badge" aria-label={`${count} messages non lus`}>{count > 99 ? '99+' : count}</span> : null;
}
