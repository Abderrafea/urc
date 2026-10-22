import { useEffect, useMemo, useRef, useState } from 'react';
import { Attachment } from './Attachment';
import type { ImageAttachment } from './Attachment';
import type { FormEvent } from 'react';
import { useStore } from './store';
import { Reactions } from './Reactions';
import type { ReactionSummary } from './Reactions';

interface Message { attachment?: ImageAttachment; replyTo?: string; reactions?: ReactionSummary; id: string; senderId: number; senderName: string; content: string; createdAt: string }
export function Conversation({ userId, username, room = false }: { userId: number; username: string; room?: boolean }) {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const [messages, setMessages] = useState<Message[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const parent = messages.find((message) => message.id === threadId);
  const displayedMessages = useMemo(() => messages.filter((message) => threadId ? message.replyTo === threadId : !message.replyTo), [messages, threadId]);
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
            const known = new Map<string, Message>(current.map((message) => [message.id, message]));
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
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [displayedMessages.length, threadId]);
  const readIds = useRef(new Set<string>());
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const markRead = async () => {
      if (document.visibilityState !== 'visible' || busy) return;
      const ids = (parent ? [parent, ...displayedMessages] : displayedMessages).filter((message) => message.senderId !== session?.id && !readIds.current.has(message.id)).map((message) => message.id);
      if (!ids.length) return;
      busy = true;
      try {
        for (let offset = 0; offset < ids.length; offset += 500) {
          const batch = ids.slice(offset, offset + 500);
          const response = await fetch('/api/unread', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
            body: JSON.stringify({ ...(room ? { roomId: userId } : { targetUserId: userId }), messageIds: batch }), signal: controller.signal,
          });
          if (!response.ok || controller.signal.aborted) return;
          batch.forEach((id) => readIds.current.add(id));
          window.dispatchEvent(new Event('urc-read'));
        }
      } catch { /* Retry on the next poll or visibility change. */ }
      finally { busy = false; }
    };
    void markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => { controller.abort(); document.removeEventListener('visibilitychange', markRead); };
  }, [displayedMessages, parent, userId, room, session?.token, session?.id]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || (!draft.trim() && !file)) return;
    setSending(true); setSendError('');
    try {
      let attachmentId;
      if(file){
        if(file.size>1048576)throw new Error('Image de 1 Mo maximum requise.');
        const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));reader.readAsDataURL(file);});
        const upload=await fetch('/api/attachment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.token}`},body:JSON.stringify({...(room?{roomId:userId}:{targetUserId:userId}),data,filename:file.name})});
        if(upload.status===401){logout();return;}const result=await upload.json();if(!upload.ok)throw new Error(result.message);attachmentId=result.id;
      }
      const response = await fetch('/api/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ ...(room ? { roomId: userId } : { targetUserId: userId }), content: draft, ...(attachmentId ? { attachmentId } : {}), ...(threadId ? { replyTo: threadId } : {}) }),
      });
      if (!active.current) return;
      if (response.status === 401) { logout(); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Envoi impossible.');
      if (!active.current) return;
      setMessages((current) => current.some((message) => message.id === result.id) ? current : [...current, result]);
      setDraft('');setFile(null);if(fileInput.current)fileInput.current.value='';
    } catch (error) { if (active.current) setSendError(error instanceof Error ? error.message : 'Envoi impossible.'); }
    finally { if (active.current) setSending(false); }
  };
  return <>
    <header><h2>{username}</h2><small>Actualisation automatique toutes les 5 secondes</small></header>
    {threadId && <div className="thread-header">
      <button type="button" className="secondary" disabled={sending} onClick={() => { setThreadId(null); setDraft('');setFile(null);if(fileInput.current)fileInput.current.value=''; }}>← Retour à la conversation</button>
      <h3>Fil de discussion</h3><p><strong>{parent?.senderName}</strong> : {parent?.content || 'Message parent indisponible'}</p>
    </div>}
    <div className="message-list" aria-label={threadId ? 'Réponses du fil' : 'Messages'}>
      {loading && <p role="status">Chargement des messages…</p>}
      {loadError && <div role="alert"><p className="error">{loadError}</p><button onClick={() => setAttempt((value) => value + 1)}>Réessayer</button></div>}
      {!loading && !loadError && displayedMessages.length === 0 && <p className="muted">{threadId ? 'Aucune réponse pour le moment.' : `Commencez la conversation avec ${username}.`}</p>}
      {displayedMessages.map((message) => <article key={message.id} className={`message ${message.senderId === session?.id ? 'sent' : 'received'}`}>
        <strong>{message.senderId === session?.id ? 'Vous' : message.senderName}</strong>
        <p>{message.content}</p>{message.attachment && <Attachment file={message.attachment} />}<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('fr-FR')}</time>
        {!threadId && <button type="button" className="thread-button" disabled={sending} onClick={() => { setThreadId(message.id); setDraft('');setFile(null);if(fileInput.current)fileInput.current.value=''; }}>
          Répondre · {messages.filter((reply) => reply.replyTo === message.id).length} réponse(s)
        </button>}
        <Reactions messageId={message.id} targetId={userId} room={room} value={message.reactions} onChange={(reactions) => setMessages((current) => current.map((item) => item.id === message.id ? { ...item, reactions } : item))} />
      </article>)}
      <div ref={end} />
    </div>
    <form className="composer" onSubmit={send}>
      {sendError && <p role="alert" className="error">{sendError}</p>}
      <label htmlFor="message-draft">{threadId ? 'Votre réponse dans le fil' : 'Votre message'}</label>
      <textarea id="message-draft" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={3} disabled={sending} />
      <label htmlFor="message-image">Image ou GIF (1 Mo maximum)</label>
      <input ref={fileInput} id="message-image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={sending} onChange={(event)=>{const selected=event.target.files?.[0];if(selected && selected.size>1048576){setSendError('Image de 1 Mo maximum requise.');event.target.value='';setFile(null);}else{setFile(selected||null);setSendError('');}}} />
      {file && <button type="button" className="secondary" disabled={sending} onClick={()=>{setFile(null);if(fileInput.current)fileInput.current.value='';}}>Retirer {file.name}</button>}
      <button type="submit" disabled={sending || (!draft.trim() && !file)}>{sending ? 'Envoi…' : 'Envoyer'}</button>
    </form>
  </>;
}
