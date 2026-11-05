import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { CreateRoom } from '../../rooms/CreateRoom';
import { UnreadBadge } from '../UnreadBadges';
import type { useMessagingDirectory } from '../hooks/useMessagingDirectory';
import { SidebarTools } from './SidebarTools';

type Directory = ReturnType<typeof useMessagingDirectory>;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

export function ChatSidebar({
  directory,
  compact,
  onCompactChange,
}: {
  directory: Directory;
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
}) {
  const { session, users, rooms, counts, loading, error, failed, retry, logout, roomId } =
    directory;
  const [tab, setTab] = useState<'users' | 'rooms'>(roomId ? 'rooms' : 'users');
  const [query, setQuery] = useState('');
  const search = normalize(query.trim());
  const contacts = users.filter((user) => user.user_id !== session?.id);
  const visibleUsers = contacts.filter((user) => normalize(user.username).includes(search));
  const visibleRooms = rooms.filter((room) => normalize(room.name).includes(search));
  const count = tab === 'users' ? visibleUsers.length : visibleRooms.length;

  return (
    <aside className="sidebar" aria-label="Vos conversations">
      <div className="sidebar-brand">
        <span className="brand-mark">
          <Icon name="message" size={23} />
        </span>
        <div>
          <h1>
            Relay<span>Chat</span>
          </h1>
          <p>Un espace pour échanger.</p>
        </div>
      </div>
      <label className="directory-search">
        <Icon name="search" size={18} />
        <input
          type="search"
          aria-label="Rechercher une conversation"
          placeholder="Rechercher…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="directory-tabs" aria-label="Type de conversation">
        <button type="button" aria-pressed={tab === 'users'} onClick={() => setTab('users')}>
          <Icon name="users" size={17} /> Utilisateurs
        </button>
        <button type="button" aria-pressed={tab === 'rooms'} onClick={() => setTab('rooms')}>
          <Icon name="hash" size={17} /> Salons
        </button>
      </div>
      <nav className="directory-list" aria-label="Salons et utilisateurs">
        <div className="directory-heading">
          <h2>{tab === 'users' ? 'Messages privés' : 'Vos salons'}</h2>
          <span>{count}</span>
        </div>
        {loading && (
          <p role="status" className="directory-notice">
            Chargement…
          </p>
        )}
        {error && (
          <div role="alert" className="directory-notice">
            <p className="error">{error}</p>
            <button type="button" onClick={retry}>
              Réessayer
            </button>
          </div>
        )}
        {failed && (
          <p role="status" className="directory-notice">
            Compteurs non lus temporairement indisponibles.
          </p>
        )}
        {tab === 'users'
          ? visibleUsers.map((user) => (
              <NavLink
                key={user.user_id}
                to={`/messages/user/${user.user_id}`}
                className={({ isActive }) => `contact ${isActive ? 'active' : ''}`}
              >
                <span className="avatar" aria-hidden="true">
                  {user.username.slice(0, 2).toUpperCase()}
                </span>
                <span className="contact-copy">
                  <strong>{user.username}</strong>
                  <small>Conversation privée</small>
                </span>
                <UnreadBadge count={counts[`user:${user.user_id}`]} />
              </NavLink>
            ))
          : visibleRooms.map((room) => (
              <NavLink
                key={room.room_id}
                to={`/messages/room/${room.room_id}`}
                className={({ isActive }) => `contact ${isActive ? 'active' : ''}`}
              >
                <span className="avatar room-avatar" aria-hidden="true">
                  <Icon name={room.is_private ? 'lock' : 'hash'} />
                </span>
                <span className="contact-copy">
                  <strong>{room.name}</strong>
                  <small>{room.joined ? 'Membre du salon' : 'Rejoindre le salon'}</small>
                </span>
                <UnreadBadge count={counts[`room:${room.room_id}`]} />
              </NavLink>
            ))}
        {!loading && !error && count === 0 && (
          <p className="directory-notice">
            {query.trim()
              ? 'Aucun résultat pour cette recherche.'
              : tab === 'users'
                ? 'Aucun autre utilisateur pour le moment.'
                : 'Aucun salon pour le moment.'}
          </p>
        )}
        {tab === 'rooms' && (
          <details className="room-create-details">
            <summary>
              <Icon name="plus" size={17} /> Créer un salon
            </summary>
            <CreateRoom />
          </details>
        )}
      </nav>
      <SidebarTools
        session={session}
        logout={logout}
        compact={compact}
        onCompactChange={onCompactChange}
      />
    </aside>
  );
}
