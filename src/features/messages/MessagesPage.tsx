import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Conversation } from './Conversation';
import { RoomConversation } from '../rooms/RoomConversation';
import { useMessagingDirectory } from './hooks/useMessagingDirectory';
import { ChatSidebar } from './components/ChatSidebar';
import { Icon } from '../../shared/components/Icon';

export function MessagesPage() {
  const directory = useMessagingDirectory();
  const { userId, roomId, selectedRoom, selected, loading, error } = directory;
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem('urc-compact-messages') === 'true';
    } catch {
      return false;
    }
  });

  const changeCompact = (value: boolean) => {
    setCompact(value);
    try {
      localStorage.setItem('urc-compact-messages', String(value));
    } catch {
      // Le réglage reste utilisable lorsque le stockage est désactivé.
    }
  };

  return (
    <main
      className={`chat-shell ${userId || roomId ? 'has-conversation' : ''}`}
      data-compact={compact}
    >
      <ChatSidebar directory={directory} compact={compact} onCompactChange={changeCompact} />
      <section className="conversation" aria-label="Conversation">
        {selectedRoom ? (
          <>
            <Link className="mobile-back room-back" to="/messages">
              <Icon name="chevron-left" /> Retour aux conversations
            </Link>
            <RoomConversation key={`room-${selectedRoom.room_id}`} room={selectedRoom} />
          </>
        ) : selected ? (
          <Conversation
            key={`user-${selected.user_id}`}
            userId={selected.user_id}
            username={selected.username}
          />
        ) : (
          <div className="welcome-panel">
            <Link className="mobile-back" to="/messages">
              <Icon name="chevron-left" /> Retour aux conversations
            </Link>
            <div className="empty">
              <span className="welcome-icon">
                <Icon name="message" size={38} />
              </span>
              <p className="eyebrow">VOTRE ESPACE DE DISCUSSION</p>
              <h2>
                {(userId || roomId) && !loading && !error
                  ? 'Conversation introuvable'
                  : 'Les bonnes conversations commencent ici.'}
              </h2>
              <p>
                Choisissez une personne ou un salon.
                <br />
                Un message suffit pour se retrouver.
              </p>
              <div className="welcome-hint">
                <Icon name="users" size={17} /> Des échanges, tout simplement.
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
