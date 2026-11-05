import { useEffect, useRef, useState } from 'react';
import type { Session } from '../../../model/common';
import { Icon } from '../../../shared/components/Icon';
import { Notifications } from '../../notifications/Notifications';

type Panel = 'notifications' | 'profile' | 'settings';

const titles: Record<Panel, string> = {
  notifications: 'Notifications',
  profile: 'Mon profil',
  settings: 'Paramètres',
};

interface SidebarToolsProps {
  session: Session | null;
  logout: () => void;
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
}

export function SidebarTools({ session, logout, compact, onCompactChange }: SidebarToolsProps) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (panel) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [panel]);

  return (
    <>
      <footer className="sidebar-footer">
        <div className="sidebar-tools" aria-label="Votre espace">
          <button
            type="button"
            className="icon-button"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setPanel('notifications')}
          >
            <Icon name="bell" />
          </button>
          <button
            type="button"
            className="icon-button profile-button"
            aria-label="Mon profil"
            title="Mon profil"
            onClick={() => setPanel('profile')}
          >
            <span className="avatar avatar-small" aria-hidden="true">
              {session?.username?.slice(0, 2).toUpperCase() || 'MO'}
            </span>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Paramètres"
            title="Paramètres"
            onClick={() => setPanel('settings')}
          >
            <Icon name="settings" />
          </button>
        </div>
        <span className="sidebar-account">
          Connecté en tant que <strong>{session?.username}</strong>
        </span>
      </footer>
      <dialog
        ref={dialog}
        className="account-dialog"
        aria-labelledby="account-panel-title"
        onClose={() => setPanel(null)}
      >
        <div className="dialog-heading">
          <h2 id="account-panel-title">{panel ? titles[panel] : 'Votre espace'}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Fermer"
            onClick={() => setPanel(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        {/* Reste monté pour conserver l’abonnement lors de la fermeture du panneau. */}
        <div hidden={panel !== 'notifications'}>
          <Notifications />
        </div>
        <div hidden={panel !== 'profile'}>
          <div className="profile-summary">
            <span className="avatar" aria-hidden="true">
              {session?.username?.slice(0, 2).toUpperCase() || 'MO'}
            </span>
            <div>
              <h3>{session?.username}</h3>
              <p className="muted">Votre compte UBO Relay Chat</p>
            </div>
          </div>
          <button type="button" className="secondary logout" onClick={logout}>
            <Icon name="logout" size={18} /> Se déconnecter
          </button>
        </div>
        <div hidden={panel !== 'settings'}>
          <p className="muted">Un espace de discussion à votre rythme.</p>
          <label className="preference-option" htmlFor="compact-messages">
            <span>
              <strong>Messages compacts</strong>
              <small>Réduire l’espacement entre les messages.</small>
            </span>
            <input
              type="checkbox"
              id="compact-messages"
              aria-label="Messages compacts"
              checked={compact}
              onChange={(event) => onCompactChange(event.target.checked)}
            />
          </label>
        </div>
      </dialog>
    </>
  );
}
