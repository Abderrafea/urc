import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../../store/useStore';
import type { Room } from '../../../model/chat';

export function useRoomMembership(room: Room) {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const users = useStore((state) => state.users);
  const [inviteId, setInviteId] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const toggle = async () => {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/rooms', {
        method: room.joined ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ roomId: room.room_id }),
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Action impossible.');
      }
      // Update membership even if navigation changed while the request was pending.
      if (useStore.getState().session?.token === session?.token) {
        useStore
          .getState()
          .setRooms(
            useStore
              .getState()
              .rooms.map((item) =>
                item.room_id === room.room_id ? { ...item, joined: result.joined } : item,
              ),
          );
      }
    } catch (failure) {
      if (active.current) {
        setError(failure instanceof Error ? failure.message : 'Action impossible.');
      }
    } finally {
      if (active.current) {
        setPending(false);
      }
    }
  };
  const invite = async () => {
    if (!inviteId || pending) {
      return;
    }
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ roomId: room.room_id, action: 'invite', userId: Number(inviteId) }),
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }
      if (active.current) {
        setNotice('Utilisateur ajouté au salon.');
        setInviteId('');
      }
    } catch (failure) {
      if (active.current) {
        setError(failure instanceof Error ? failure.message : 'Invitation impossible.');
      }
    } finally {
      if (active.current) {
        setPending(false);
      }
    }
  };

  return { session, users, inviteId, setInviteId, notice, pending, error, toggle, invite };
}
