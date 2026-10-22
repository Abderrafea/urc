import { useEffect, useRef, useState } from 'react';
import { Conversation } from '../messages/Conversation';
import { useStore } from '../../store/useStore';
import type { Room } from '../../shared/types/chat';
export function RoomConversation({ room }: { room: Room }) {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const users = useStore((state) => state.users);
  const [inviteId, setInviteId] = useState('');
  const [notice, setNotice] = useState('');
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
  const invite = async () => {
    if (!inviteId || pending) return;
    setPending(true); setError('');setNotice('');
    try {
      const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.token}`},body:JSON.stringify({roomId:room.room_id,action:'invite',userId:Number(inviteId)})});
      if(response.status===401){logout();return;}
      const result=await response.json();if(!response.ok)throw new Error(result.message);
      if(active.current){setNotice('Utilisateur ajouté au salon.');setInviteId('');}
    }catch(failure){if(active.current)setError(failure instanceof Error?failure.message:'Invitation impossible.');}
    finally{if(active.current)setPending(false);}
  };
  return <>
    <div className="membership">
      <p>{room.joined ? 'Vous êtes membre de ce salon.' : 'Rejoignez ce salon pour participer et recevoir ses notifications.'}</p>
      <button className="secondary" hidden={room.is_private && room.created_by === session?.id} onClick={toggle} disabled={pending}>{pending ? 'Patientez…' : room.joined ? 'Quitter le salon' : 'Rejoindre le salon'}</button>
      {room.created_by === session?.id && room.joined && <div className="invite-form">
        <label htmlFor="invite-user">Ajouter un membre{room.is_private ? ' au salon privé' : ''}</label>
        <select id="invite-user" value={inviteId} onChange={(event)=>setInviteId(event.target.value)} disabled={pending}><option value="">Choisir un utilisateur</option>{users.filter((person)=>person.user_id!==session?.id).map((person)=><option key={person.user_id} value={person.user_id}>{person.username}</option>)}</select>
        <button onClick={invite} disabled={pending || !inviteId}>Inviter</button>
      </div>}
      {notice && <p role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
    {room.joined ? <Conversation userId={room.room_id} username={`# ${room.name}`} room /> : <div className="empty"><h2># {room.name}</h2><p>Les notifications sont réservées aux membres du salon.</p></div>}
  </>;
}
