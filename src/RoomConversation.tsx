import React, { useEffect, useRef, useState } from 'react';
import { Conversation } from './Conversation';
import { useStore } from './store';
import type { Room } from './store';
export function RoomConversation({ room }: { room: Room }) {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const toggle = async () => {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/rooms', {
        method: room.joined ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ roomId: room.room_id }),
      });
      if (response.status === 401) { logout(); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Action impossible.');
      // Update membership even if navigation changed while the request was pending.
      if (useStore.getState().session?.token === session?.token) {
        useStore.getState().setRooms(useStore.getState().rooms.map((item) => item.room_id === room.room_id ? { ...item, joined: result.joined } : item));
      }
    } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : 'Action impossible.'); }
    finally { if (active.current) setPending(false); }
  };
  return <>
    <div className="membership">
      <p>{room.joined ? 'Vous êtes membre de ce salon.' : 'Rejoignez ce salon pour participer et recevoir ses notifications.'}</p>
      <button className="secondary" onClick={toggle} disabled={pending}>{pending ? 'Patientez…' : room.joined ? 'Quitter le salon' : 'Rejoindre le salon'}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
    {room.joined ? <Conversation userId={room.room_id} username={`# ${room.name}`} room /> : <div className="empty"><h2># {room.name}</h2><p>Les notifications sont réservées aux membres du salon.</p></div>}
  </>;
}
