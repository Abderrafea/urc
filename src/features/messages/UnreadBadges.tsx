export function UnreadBadge({ count }: { count?: number }) {
  return count ? (
    <span className="unread-badge" aria-label={`${count} messages non lus`}>
      {count > 99 ? '99+' : count}
    </span>
  ) : null;
}
