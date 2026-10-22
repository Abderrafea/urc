import { useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { useStore } from '../../../store/useStore';
import type { Message } from '../../../model/chat';

interface ComposerOptions {
  userId: number;
  room: boolean;
  threadId: string | null;
  active: RefObject<boolean>;
  onSent: (message: Message) => void;
}

export function useMessageComposer({ userId, room, threadId, active, onSent }: ComposerOptions) {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const resetDraft = () => {
    setDraft('');
    setFile(null);
    if (fileInput.current) {
      fileInput.current.value = '';
    }
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || (!draft.trim() && !file)) {
      return;
    }
    setSending(true);
    setSendError('');
    try {
      let attachmentId;
      if (file) {
        if (file.size > 1048576) {
          throw new Error('Image de 1 Mo maximum requise.');
        }
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
          reader.readAsDataURL(file);
        });
        const upload = await fetch('/api/attachment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.token}`,
          },
          body: JSON.stringify({
            ...(room ? { roomId: userId } : { targetUserId: userId }),
            data,
            filename: file.name,
          }),
        });
        if (upload.status === 401) {
          logout();
          return;
        }
        const result = await upload.json();
        if (!upload.ok) {
          throw new Error(result.message);
        }
        attachmentId = result.id;
      }
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({
          ...(room ? { roomId: userId } : { targetUserId: userId }),
          content: draft,
          ...(attachmentId ? { attachmentId } : {}),
          ...(threadId ? { replyTo: threadId } : {}),
        }),
      });
      if (!active.current) {
        return;
      }
      if (response.status === 401) {
        logout();
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Envoi impossible.');
      }
      if (!active.current) {
        return;
      }
      onSent(result);
      setDraft('');
      setFile(null);
      if (fileInput.current) {
        fileInput.current.value = '';
      }
    } catch (error) {
      if (active.current) {
        setSendError(error instanceof Error ? error.message : 'Envoi impossible.');
      }
    } finally {
      if (active.current) {
        setSending(false);
      }
    }
  };

  return {
    file,
    setFile,
    fileInput,
    draft,
    setDraft,
    sending,
    sendError,
    setSendError,
    send,
    resetDraft,
  };
}
