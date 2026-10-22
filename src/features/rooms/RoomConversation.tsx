import type { Room } from '../../model/chat';
import { Conversation } from '../messages/Conversation';
import { useRoomMembership } from './hooks/useRoomMembership';

export function RoomConversation({ room }: { room: Room }) {
  const { session, users, inviteId, setInviteId, notice, pending, error, toggle, invite } =
    useRoomMembership(room);

  return (
    <>
      <div className="membership">
        <p>
          {room.joined
            ? 'Vous êtes membre de ce salon.'
            : 'Rejoignez ce salon pour participer et recevoir ses notifications.'}
        </p>
        <button
          className="secondary"
          hidden={room.is_private && room.created_by === session?.id}
          onClick={toggle}
          disabled={pending}
        >
          {pending ? 'Patientez…' : room.joined ? 'Quitter le salon' : 'Rejoindre le salon'}
        </button>
        {room.created_by === session?.id && room.joined && (
          <div className="invite-form">
            <label htmlFor="invite-user">
              Ajouter un membre{room.is_private ? ' au salon privé' : ''}
            </label>
            <select
              id="invite-user"
              value={inviteId}
              onChange={(event) => setInviteId(event.target.value)}
              disabled={pending}
            >
              <option value="">Choisir un utilisateur</option>
              {users
                .filter((person) => person.user_id !== session?.id)
                .map((person) => (
                  <option key={person.user_id} value={person.user_id}>
                    {person.username}
                  </option>
                ))}
            </select>
            <button onClick={invite} disabled={pending || !inviteId}>
              Inviter
            </button>
          </div>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      {room.joined ? (
        <Conversation userId={room.room_id} username={`# ${room.name}`} room />
      ) : (
        <div className="empty">
          <h2># {room.name}</h2>
          <p>Les notifications sont réservées aux membres du salon.</p>
        </div>
      )}
    </>
  );
}
