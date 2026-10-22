import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';

export interface ReactionSummary {
  counts: Record<string, number>;
  mine: string | null;
}

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
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const react = async (emoji: string) => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({
          messageId,
          emoji,
          ...(room ? { roomId: targetId } : { targetUserId: targetId }),
        }),
      });
      if (!active.current) return;
      if (response.status === 401) {
        logout();
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Réaction impossible.');
      if (active.current) onChange(result);
    } catch (failure) {
      if (active.current)
        setError(failure instanceof Error ? failure.message : 'Réaction impossible.');
    } finally {
      if (active.current) setPending(false);
    }
  };

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
