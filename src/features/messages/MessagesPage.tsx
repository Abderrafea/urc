import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Conversation } from './Conversation';
import { RoomConversation } from '../rooms/RoomConversation';
import { Notifications } from '../notifications/Notifications';
import { CreateRoom } from '../rooms/CreateRoom';
import { useUnreadCounts, UnreadBadge } from './UnreadBadges';

export function MessagesPage() {
  const { userId, roomId } = useParams();
  const { counts, failed } = useUnreadCounts();
  const { session, users, rooms, setRooms, selectRoom, setUsers, selectUser, logout } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const load = () => Promise.all(['/api/users', '/api/rooms'].map((url) => fetch(url, { headers: { Authorization: `Bearer ${session?.token}` }, signal: controller.signal })))
      .then(async (responses) => {
        if (responses.some((response) => response.status === 401)) { logout(); return; }
        if (responses.some((response) => !response.ok)) throw new Error('Impossible de charger les utilisateurs et les salons.');
        const [people, groups] = await Promise.all(responses.map((response) => response.json()));
        if (!controller.signal.aborted) { setUsers(people); setRooms(groups); }
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    void load();
    const timer = setInterval(load, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [session?.token, setUsers, setRooms, logout, attempt]);
  const selectedId = userId && /^\d+$/.test(userId) ? Number(userId) : null;
  const selected = users.find((user) => user.user_id === selectedId && user.user_id !== session?.id);
  useEffect(() => { selectUser(selected?.user_id ?? null); }, [selected?.user_id, selectUser]);
  const selectedRoom = rooms.find((room) => room.room_id === Number(roomId));
  useEffect(() => { selectRoom(selectedRoom?.room_id ?? null); }, [selectedRoom?.room_id, selectRoom]);
  return <main className="chat-shell">
    <aside className="sidebar">
      <p className="eyebrow">UBO RELAY CHAT</p><h1>Conversations</h1>
      <p className="muted">Connecté : {session?.username}</p>
      <Notifications />
      <nav aria-label="Salons et utilisateurs">
        <h2>Salons</h2>
        {failed && <p role="status" className="muted">Compteurs non lus temporairement indisponibles.</p>}
        <p className="muted">Les salons privés sont visibles sur invitation.</p>
        {rooms.map((room) => <NavLink key={room.room_id} to={`/messages/room/${room.room_id}`} className={({ isActive }) => `contact ${isActive ? 'active' : ''}`}><strong>{room.is_private ? '🔒' : '#'} {room.name} <UnreadBadge count={counts[`room:${room.room_id}`]} /></strong><small>{room.joined ? 'Membre' : 'Rejoindre'}</small></NavLink>)}
        <CreateRoom />
        <h2>Messages privés</h2>
        {loading && <p role="status">Chargement…</p>}
        {error && <div role="alert"><p className="error">{error}</p><button onClick={() => setAttempt((value) => value + 1)}>Réessayer</button></div>}
        {!loading && !error && users.filter((user) => user.user_id !== session?.id).length === 0 && <p className="muted">Aucun autre utilisateur pour le moment.</p>}
        {users.filter((user) => user.user_id !== session?.id).map((user) =>
          <NavLink key={user.user_id} to={`/messages/user/${user.user_id}`} className={({ isActive }) => `contact ${isActive ? 'active' : ''}`}>
            <strong>{user.username} <UnreadBadge count={counts[`user:${user.user_id}`]} /></strong><small>Dernière connexion : {user.last_login || 'Jamais'}</small>
          </NavLink>)}
      </nav>
      <button className="secondary logout" onClick={logout}>Se déconnecter</button>
    </aside>
    <section className="conversation" aria-label="Conversation">
      {selectedRoom ? <RoomConversation key={`room-${selectedRoom.room_id}`} room={selectedRoom} /> : selected ? <Conversation key={`user-${selected.user_id}`} userId={selected.user_id} username={selected.username} /> :
        <div className="empty"><h2>{(userId || roomId) && !loading && !error ? 'Conversation introuvable' : 'Bienvenue dans votre messagerie'}</h2><p>Sélectionnez un salon ou un utilisateur pour ouvrir une conversation.</p></div>}
    </section>
  </main>;
}
