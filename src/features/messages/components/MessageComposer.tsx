import type { useMessageComposer } from '../hooks/useMessageComposer';
import { Icon } from '../../../shared/components/Icon';

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
        <p role="alert" className="error composer-error">
          {sendError}
        </p>
      )}
      {file && (
        <div className="composer-file">
          <Icon name="image" size={17} />
          <span>{file.name}</span>
          <button
            type="button"
            disabled={sending}
            aria-label={`Retirer ${file.name}`}
            title={`Retirer ${file.name}`}
            onClick={() => {
              setFile(null);
              if (fileInput.current) {
                fileInput.current.value = '';
              }
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <div className="composer-row">
        <div className="composer-input">
          <div className={`composer-attachment${sending ? ' is-disabled' : ''}`}>
            <label htmlFor="message-image" title="Ajouter une image ou un GIF">
              <Icon name="image" size={22} />
              <span className="sr-only">Image ou GIF (1 Mo maximum)</span>
            </label>
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
          </div>
          <label className="sr-only" htmlFor="message-draft">
            {threadId ? 'Votre réponse dans le fil' : 'Votre message'}
          </label>
          <textarea
            id="message-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={threadId ? 'Écrire une réponse…' : 'Écrire un message…'}
            maxLength={4000}
            rows={1}
            disabled={sending}
          />
        </div>
        <button
          className="composer-send"
          type="submit"
          disabled={sending || (!draft.trim() && !file)}
          aria-label={sending ? 'Envoi…' : 'Envoyer'}
          title={sending ? 'Envoi en cours' : 'Envoyer le message'}
        >
          <Icon name="send" size={22} />
        </button>
      </div>
    </form>
  );
}
