import type { useMessageComposer } from '../hooks/useMessageComposer';

type ComposerState = ReturnType<typeof useMessageComposer>;

export function MessageComposer({
  composer,
  threadId,
}: {
  composer: ComposerState;
  threadId: string | null;
}) {
  const { send, sendError, draft, setDraft, sending, file, setFile, fileInput, setSendError } =
    composer;

  return (
    <form className="composer" onSubmit={send}>
      {sendError && (
        <p role="alert" className="error">
          {sendError}
        </p>
      )}
      <label htmlFor="message-draft">
        {threadId ? 'Votre réponse dans le fil' : 'Votre message'}
      </label>
      <textarea
        id="message-draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={4000}
        rows={3}
        disabled={sending}
      />
      <label htmlFor="message-image">Image ou GIF (1 Mo maximum)</label>
      <input
        ref={fileInput}
        id="message-image"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        disabled={sending}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected && selected.size > 1048576) {
            setSendError('Image de 1 Mo maximum requise.');
            event.target.value = '';
            setFile(null);
          } else {
            setFile(selected || null);
            setSendError('');
          }
        }}
      />
      {file && (
        <button
          type="button"
          className="secondary"
          disabled={sending}
          onClick={() => {
            setFile(null);
            if (fileInput.current) {
              fileInput.current.value = '';
            }
          }}
        >
          Retirer {file.name}
        </button>
      )}
      <button type="submit" disabled={sending || (!draft.trim() && !file)}>
        {sending ? 'Envoi…' : 'Envoyer'}
      </button>
    </form>
  );
}
