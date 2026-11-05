import { useEffect, useRef } from 'react';
import { Attachment } from '../Attachment';
import { Reactions } from '../Reactions';
import { Icon } from '../../../shared/components/Icon';
import type { Message, ReactionSummary } from '../../../model/chat';

interface MessageListProps {
  messages: Message[];
  displayedMessages: Message[];
  currentUserId?: number;
  username: string;
  threadId: string | null;
  loading: boolean;
  loadError: string;
  sending: boolean;
  onRetry: () => void;
  onOpenThread: (id: string) => void;
  onReaction: (id: string, reactions: ReactionSummary) => void;
  userId: number;
  room: boolean;
}

export function MessageList({
  messages,
  displayedMessages,
  currentUserId,
  username,
  threadId,
  loading,
  loadError,
  sending,
  onRetry,
  onOpenThread,
  onReaction,
  userId,
  room,
}: MessageListProps) {
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages.length, threadId]);

  return (
    <div className="message-list" aria-label={threadId ? 'Réponses du fil' : 'Messages'}>
      {loading && <p role="status">Chargement des messages…</p>}
      {loadError && (
        <div role="alert">
          <p className="error">{loadError}</p>
          <button onClick={onRetry}>Réessayer</button>
        </div>
      )}
      {!loading && !loadError && displayedMessages.length === 0 && (
        <div className="message-list-empty">
          <span className="message-empty-icon" aria-hidden="true">
            <Icon name="message" size={28} />
          </span>
          <h3>{threadId ? 'La discussion continue ici' : 'Dites bonjour !'}</h3>
          <p>
            {threadId
              ? 'Aucune réponse pour le moment.'
              : `Commencez la conversation avec ${username}.`}
          </p>
        </div>
      )}
      {displayedMessages.map((message) => (
        <article
          key={message.id}
          className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
        >
          <strong>{message.senderId === currentUserId ? 'Vous' : message.senderName}</strong>
          <p>{message.content}</p>
          {message.attachment && <Attachment file={message.attachment} />}
          <time
            dateTime={message.createdAt}
            title={new Date(message.createdAt).toLocaleString('fr-FR')}
          >
            {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {!threadId && (
            <button
              type="button"
              className="thread-button"
              disabled={sending}
              onClick={() => {
                onOpenThread(message.id);
              }}
            >
              Répondre · {messages.filter((reply) => reply.replyTo === message.id).length}{' '}
              réponse(s)
            </button>
          )}
          <Reactions
            messageId={message.id}
            targetId={userId}
            room={room}
            value={message.reactions}
            onChange={(reactions) => onReaction(message.id, reactions)}
          />
        </article>
      ))}
      <div ref={end} />
    </div>
  );
}
