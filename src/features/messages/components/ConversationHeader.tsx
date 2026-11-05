import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';

interface ConversationHeaderProps {
  username: string;
  room: boolean;
}

export function ConversationHeader({ username, room }: ConversationHeaderProps) {
  const initials = username
    .replace(/^#\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('fr-FR');

  return (
    <header className="conversation-header">
      <div className="conversation-person">
        {!room && (
          <Link to="/messages" className="mobile-back" aria-label="Retour aux conversations">
            <Icon name="chevron-left" size={21} />
          </Link>
        )}
        <span className="conversation-avatar" aria-hidden="true">
          {room ? <Icon name="hash" size={24} /> : initials}
        </span>
        <div className="conversation-heading">
          <h2>{username}</h2>
          <p>{room ? 'Une place pour toutes les idées' : 'Votre conversation privée'}</p>
        </div>
      </div>
      <div className="conversation-calls" aria-label="Appels bientôt disponibles">
        <button
          type="button"
          className="call-button"
          disabled
          aria-label="Appel vidéo (bientôt disponible)"
          title="Appel vidéo : bientôt disponible"
        >
          <Icon name="video" size={21} />
        </button>
        <button
          type="button"
          className="call-button"
          disabled
          aria-label="Appel vocal (bientôt disponible)"
          title="Appel vocal : bientôt disponible"
        >
          <Icon name="phone" size={20} />
        </button>
      </div>
    </header>
  );
}
