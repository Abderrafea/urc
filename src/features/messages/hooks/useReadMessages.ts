import { useEffect, useRef } from 'react';
import { useStore } from '../../../store/useStore';
import type { Message } from '../../../model/chat';

export function useReadMessages(
  userId: number,
  room: boolean,
  displayedMessages: Message[],
  parent?: Message,
) {
  const session = useStore((state) => state.session);
  const readIds = useRef(new Set<string>());

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const markRead = async () => {
      if (document.visibilityState !== 'visible' || busy) {
        return;
      }
      const ids = (parent ? [parent, ...displayedMessages] : displayedMessages)
        .filter((message) => message.senderId !== session?.id && !readIds.current.has(message.id))
        .map((message) => message.id);
      if (!ids.length) {
        return;
      }
      busy = true;
      try {
        for (let offset = 0; offset < ids.length; offset += 500) {
          const batch = ids.slice(offset, offset + 500);
          const response = await fetch('/api/unread', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.token}`,
            },
            body: JSON.stringify({
              ...(room ? { roomId: userId } : { targetUserId: userId }),
              messageIds: batch,
            }),
            signal: controller.signal,
          });
          if (!response.ok || controller.signal.aborted) {
            return;
          }
          batch.forEach((id) => readIds.current.add(id));
          window.dispatchEvent(new Event('urc-read'));
        }
      } catch {
        /* Retry on the next poll or visibility change. */
      } finally {
        busy = false;
      }
    };
    void markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', markRead);
    };
  }, [displayedMessages, parent, userId, room, session?.token, session?.id]);
}
