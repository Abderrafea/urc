import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useConversationHistory } from './hooks/useConversationHistory';
import { useReadMessages } from './hooks/useReadMessages';
import { useMessageComposer } from './hooks/useMessageComposer';
import { MessageList } from './components/MessageList';
import { MessageComposer } from './components/MessageComposer';

interface ConversationProps {
  userId: number;
  username: string;
  room?: boolean;
}

export function Conversation({ userId, username, room = false }: ConversationProps) {
  const currentUserId = useStore((state) => state.session?.id);
  const { messages, setMessages, loading, loadError, active, retry } = useConversationHistory(
    userId,
    room,
  );
  const [threadId, setThreadId] = useState<string | null>(null);
  const parent = messages.find((message) => message.id === threadId);
  const displayedMessages = useMemo(
    () =>
      messages.filter((message) => (threadId ? message.replyTo === threadId : !message.replyTo)),
    [messages, threadId],
  );
  const composer = useMessageComposer({
    userId,
    room,
    threadId,
    active,
    onSent: (message) =>
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      ),
  });

  useReadMessages(userId, room, displayedMessages, parent);

  const openThread = (id: string | null) => {
    setThreadId(id);
    composer.resetDraft();
  };

  return (
    <>
      <header>
        <h2>{username}</h2>
        <small>Un petit mot, et la discussion commence.</small>
      </header>
      {threadId && (
        <div className="thread-header">
          <button
            type="button"
            className="secondary"
            disabled={composer.sending}
            onClick={() => {
              openThread(null);
            }}
          >
            ← Retour à la conversation
          </button>
          <h3>Fil de discussion</h3>
          <p>
            <strong>{parent?.senderName}</strong> :{' '}
            {parent?.content || 'Message parent indisponible'}
          </p>
        </div>
      )}
      <MessageList
        messages={messages}
        displayedMessages={displayedMessages}
        currentUserId={currentUserId}
        username={username}
        threadId={threadId}
        loading={loading}
        loadError={loadError}
        sending={composer.sending}
        onRetry={retry}
        onOpenThread={openThread}
        onReaction={(id, reactions) =>
          setMessages((current) =>
            current.map((message) => (message.id === id ? { ...message, reactions } : message)),
          )
        }
        userId={userId}
        room={room}
      />
      <MessageComposer composer={composer} threadId={threadId} />
    </>
  );
}
