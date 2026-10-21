import React, { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useStore } from './store';

interface Message { id: string; senderId: number; senderName: string; content: string; createdAt: string }
export function Conversation({ userId, username, room = false }: { userId: number; username: string; room?: boolean }) {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch(`/api/message?${room ? 'room_id' : 'user_id'}=${userId}`, { headers: { Authorization: `Bearer ${session?.token}` }, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 401) { logout(); return; }
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Chargement impossible.');
        if (!controller.signal.aborted) {
          setMessages((current) => {
            const known = new Map(current.map((message) => [message.id, message]));
            result.forEach((message: Message) => known.set(message.id, message));
            return [...known.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          });
          setLoadError('');
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Chargement impossible.');
      } finally { if (!controller.signal.aborted) setLoading(false); busy = false; }
    };
    void load();
    const onPush = (event: MessageEvent) => {
      if (event.data?.type === 'new-message' && (room ? Number(event.data.roomId) === userId : !event.data.roomId && Number(event.data.senderId) === userId)) void load();
    };
    navigator.serviceWorker?.addEventListener('message', onPush);
    const timer = setInterval(load, 5000);
    return () => { active.current = false; controller.abort(); clearInterval(timer); navigator.serviceWorker?.removeEventListener('message', onPush); };
  }, [userId, room, session?.token, logout, attempt]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || !draft.trim()) return;
    setSending(true); setSendError('');
    try {
      const response = await fetch('/api/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ ...(room ? { roomId: userId } : { targetUserId: userId }), content: draft }),
      });
      if (!active.current) return;
      if (response.status === 401) { logout(); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Envoi impossible.');
      if (!active.current) return;
      setMessages((current) => current.some((message) => message.id === result.id) ? current : [...current, result]);
      setDraft('');
    } catch (error) { if (active.current) setSendError(error instanceof Error ? error.message : 'Envoi impossible.'); }
    finally { if (active.current) setSending(false); }
  };
  return <>
    <header><h2>{username}</h2><small>Actualisation automatique toutes les 5 secondes</small></header>
    <div className="message-list" aria-label="Messages">
      {loading && <p role="status">Chargement des messages…</p>}
      {loadError && <div role="alert"><p className="error">{loadError}</p><button onClick={() => setAttempt((value) => value + 1)}>Réessayer</button></div>}
      {!loading && !loadError && messages.length === 0 && <p className="muted">Commencez la conversation avec {username}.</p>}
      {messages.map((message) => <article key={message.id} className={`message ${message.senderId === session?.id ? 'sent' : 'received'}`}>
        <strong>{message.senderId === session?.id ? 'Vous' : message.senderName}</strong>
        <p>{message.content}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('fr-FR')}</time>
      </article>)}
      <div ref={end} />
    </div>
    <form className="composer" onSubmit={send}>
      {sendError && <p role="alert" className="error">{sendError}</p>}
      <label htmlFor="message-draft">Votre message</label>
      <textarea id="message-draft" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={3} required disabled={sending} />
      <button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Envoi…' : 'Envoyer'}</button>
    </form>
  </>;
}
