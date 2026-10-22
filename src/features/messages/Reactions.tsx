import { useReaction } from './hooks/useReaction';

import type { ReactionSummary } from '../../model/chat';

export function Reactions({
  messageId,
  targetId,
  room,
  value,
  onChange,
}: {
  messageId: string;
  targetId: number;
  room: boolean;
  value?: ReactionSummary;
  onChange: (value: ReactionSummary) => void;
}) {
  const { pending, error, react } = useReaction(messageId, targetId, room, onChange);

  return (
    <div className="reactions" role="group" aria-label="Réactions au message">
      {['👍', '❤️', '😂'].map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="reaction-button"
          aria-pressed={value?.mine === emoji}
          aria-label={`${emoji}, ${value?.counts[emoji] || 0} réactions${value?.mine === emoji ? ', retirer ma réaction' : ', réagir'}`}
          disabled={pending}
          onClick={() => react(emoji)}
        >
          {emoji} {value?.counts[emoji] || 0}
        </button>
      ))}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
