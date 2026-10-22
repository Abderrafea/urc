import { NavLink } from 'react-router-dom';
import { Conversation } from './Conversation';
import { RoomConversation } from '../rooms/RoomConversation';
import { Notifications } from '../notifications/Notifications';
import { CreateRoom } from '../rooms/CreateRoom';
import { UnreadBadge } from './UnreadBadges';
import { useMessagingDirectory } from './hooks/useMessagingDirectory';

export function MessagesPage() {
  const {
    userId,
    roomId,
    counts,
    failed,
    session,
    users,
    rooms,
    loading,
    error,
    selectedRoom,
    selected,
    logout,
    retry,
  } = useMessagingDirectory();

  return (
    <main className="chat-shell">
      <aside className="sidebar">
        <p className="eyebrow">UBO RELAY CHAT</p>
        <h1>Conversations</h1>
        <p className="muted">Connecté : {session?.username}</p>
        <Notifications />
        <nav aria-label="Salons et utilisateurs">
          <h2>Salons</h2>
          {failed && (
            <p role="status" className="muted">
              Compteurs non lus temporairement indisponibles.
            </p>
          )}
          <p className="muted">Les salons privés sont visibles sur invitation.</p>
          {rooms.map((room) => (
            <NavLink
              key={room.room_id}
              to={`/messages/room/${room.room_id}`}
              className={({ isActive }) => `contact ${isActive ? 'active' : ''}`}
            >
              <strong>
                {room.is_private ? '🔒' : '#'} {room.name}{' '}
                <UnreadBadge count={counts[`room:${room.room_id}`]} />
              </strong>
              <small>{room.joined ? 'Membre' : 'Rejoindre'}</small>
            </NavLink>
          ))}
          <CreateRoom />
          <h2>Messages privés</h2>
          {loading && <p role="status">Chargement…</p>}
          {error && (
            <div role="alert">
              <p className="error">{error}</p>
              <button onClick={retry}>Réessayer</button>
            </div>
          )}
          {!loading &&
            !error &&
            users.filter((user) => user.user_id !== session?.id).length === 0 && (
              <p className="muted">Aucun autre utilisateur pour le moment.</p>
            )}
          {users
            .filter((user) => user.user_id !== session?.id)
            .map((user) => (
              <NavLink
                key={user.user_id}
                to={`/messages/user/${user.user_id}`}
                className={({ isActive }) => `contact ${isActive ? 'active' : ''}`}
              >
                <strong>
                  {user.username} <UnreadBadge count={counts[`user:${user.user_id}`]} />
                </strong>
                <small>Dernière connexion : {user.last_login || 'Jamais'}</small>
              </NavLink>
            ))}
        </nav>
        <button className="secondary logout" onClick={logout}>
          Se déconnecter
        </button>
      </aside>
      <section className="conversation" aria-label="Conversation">
        {selectedRoom ? (
          <RoomConversation key={`room-${selectedRoom.room_id}`} room={selectedRoom} />
        ) : selected ? (
          <Conversation
            key={`user-${selected.user_id}`}
            userId={selected.user_id}
            username={selected.username}
          />
        ) : (
          <div className="empty">
            <h2>
              {(userId || roomId) && !loading && !error
                ? 'Conversation introuvable'
                : 'On discute ?'}
            </h2>
            <p>Choisis un salon ou quelqu’un dans la liste pour commencer.</p>
          </div>
        )}
      </section>
    </main>
  );
}
