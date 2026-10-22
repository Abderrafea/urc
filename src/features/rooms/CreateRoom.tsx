import { useCreateRoom } from './hooks/useCreateRoom';

export function CreateRoom() {
  const { name, setName, isPrivate, setPrivate, error, pending, create } = useCreateRoom();

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
