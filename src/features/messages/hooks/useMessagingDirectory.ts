import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { useUnreadCounts } from './useUnreadCounts';

export function useMessagingDirectory() {
  const { userId, roomId } = useParams();
  const { counts, failed } = useUnreadCounts();
  const { session, users, rooms, setRooms, selectRoom, setUsers, selectUser, logout } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const load = () =>
      Promise.all(
        ['/api/users', '/api/rooms'].map((url) =>
          fetch(url, {
            headers: { Authorization: `Bearer ${session?.token}` },
            signal: controller.signal,
          }),
        ),
      )
        .then(async (responses) => {
          if (responses.some((response) => response.status === 401)) {
            logout();
            return;
          }
          if (responses.some((response) => !response.ok)) {
            throw new Error('Impossible de charger les utilisateurs et les salons.');
          }
          const [people, groups] = await Promise.all(responses.map((response) => response.json()));
          if (!controller.signal.aborted) {
            setUsers(people);
            setRooms(groups);
          }
        })
        .catch((failure) => {
          if (!controller.signal.aborted) {
            setError(failure.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [session?.token, setUsers, setRooms, logout, attempt]);
  const selectedId = userId && /^\d+$/.test(userId) ? Number(userId) : null;
  const selected = users.find(
    (user) => user.user_id === selectedId && user.user_id !== session?.id,
  );

  useEffect(() => {
    selectUser(selected?.user_id ?? null);
  }, [selected?.user_id, selectUser]);
  const selectedRoom = rooms.find((room) => room.room_id === Number(roomId));

  useEffect(() => {
    selectRoom(selectedRoom?.room_id ?? null);
  }, [selectedRoom?.room_id, selectRoom]);

  return {
    userId,
    roomId,
    counts,
    failed,
    session,
    users,
    rooms,
    loading,
    error,
    selectedRoom,
    selected,
    logout,
    retry: () => setAttempt((value) => value + 1),
  };
}
