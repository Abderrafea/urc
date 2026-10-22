import { useNotifications } from './hooks/useNotifications';

export function Notifications() {
  const { status, instanceId, enabled, enable, pending } = useNotifications();

  return (
    <div className="notifications">
      <p className="muted" role="status">
        {status}
      </p>
      {instanceId && !enabled && (
        <button className="secondary" onClick={enable} disabled={pending}>
          {pending ? 'Activation…' : 'Activer les notifications'}
        </button>
      )}
    </div>
  );
}
