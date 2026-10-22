import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../../store/useStore';
import type { Message } from '../../../model/chat';

export function useConversationHistory(userId: number, room: boolean) {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy) {
        return;
      }
      busy = true;
      try {
        const response = await fetch(`/api/message?${room ? 'room_id' : 'user_id'}=${userId}`, {
          headers: { Authorization: `Bearer ${session?.token}` },
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }
        if (response.status === 401) {
          logout();
          return;
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Chargement impossible.');
        }
        if (!controller.signal.aborted) {
          setMessages((current) => {
            const known = new Map<string, Message>(current.map((message) => [message.id, message]));
            result.forEach((message: Message) => known.set(message.id, message));
            return [...known.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          });
          setLoadError('');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Chargement impossible.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
        busy = false;
      }
    };
    void load();
    const onPush = (event: MessageEvent) => {
      if (
        event.data?.type === 'new-message' &&
        (room
          ? Number(event.data.roomId) === userId
          : !event.data.roomId && Number(event.data.senderId) === userId)
      ) {
        void load();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onPush);
    const timer = setInterval(load, 5000);
    return () => {
      active.current = false;
      controller.abort();
      clearInterval(timer);
      navigator.serviceWorker?.removeEventListener('message', onPush);
    };
  }, [userId, room, session?.token, logout, attempt]);

  return {
    messages,
    setMessages,
    loading,
    loadError,
    active,
    retry: () => setAttempt((value) => value + 1),
  };
}
