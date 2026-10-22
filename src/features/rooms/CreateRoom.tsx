import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export function CreateRoom() {
  const session = useStore((state) => state.session);
  const logout = useStore((state) => state.logout);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !name.trim()) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ name, isPrivate }),
      });
      if (!active.current || useStore.getState().session?.token !== session?.token) return;
      if (response.status === 401) {
        logout();
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Création impossible.');
      if (!active.current) return;
      const current = useStore.getState();
      current.setRooms(
        [...current.rooms.filter((room) => room.room_id !== result.room_id), result].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setName('');
      navigate(`/messages/room/${result.room_id}`);
    } catch (failure) {
      if (active.current)
        setError(failure instanceof Error ? failure.message : 'Création impossible.');
    } finally {
      if (active.current) setPending(false);
    }
  };

  return (
    <form className="create-room" onSubmit={create}>
      <label htmlFor="room-name">Créer un salon</label>
      <input
        id="room-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={50}
        placeholder="Nom du salon"
        required
        disabled={pending}
      />
      <label className="checkbox">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(event) => setPrivate(event.target.checked)}
          disabled={pending}
        />{' '}
        Salon privé, sur invitation
      </label>
      <button type="submit" disabled={pending || !name.trim()}>
        {pending ? 'Création…' : 'Créer le salon'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
