const BOOTSTRAP_PENDING_KEY = "breneo:notif-bootstrap-pending";
const MAX_STORED_IDS = 500;

function alertedIdsKey(userId: string): string {
  return `breneo:notif-alerted:${userId}`;
}

export function loadAlertedNotificationIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(alertedIdsKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id)));
  } catch {
    return new Set();
  }
}

export function markNotificationAlerted(userId: string, itemId: string): void {
  const ids = loadAlertedNotificationIds(userId);
  ids.add(itemId);
  const trimmed = [...ids].slice(-MAX_STORED_IDS);
  localStorage.setItem(alertedIdsKey(userId), JSON.stringify(trimmed));
}

export function markNotificationsAlerted(
  userId: string,
  itemIds: Iterable<string>,
): void {
  const ids = loadAlertedNotificationIds(userId);
  for (const itemId of itemIds) {
    ids.add(itemId);
  }
  const trimmed = [...ids].slice(-MAX_STORED_IDS);
  localStorage.setItem(alertedIdsKey(userId), JSON.stringify(trimmed));
}

export function requestNotificationBootstrap(userId: string): void {
  localStorage.setItem(BOOTSTRAP_PENDING_KEY, String(userId));
}

export function consumeNotificationBootstrap(
  userId: string,
): boolean {
  const pending = localStorage.getItem(BOOTSTRAP_PENDING_KEY);
  if (pending !== String(userId)) {
    return false;
  }
  localStorage.removeItem(BOOTSTRAP_PENDING_KEY);
  return true;
}

export function clearAlertedNotifications(userId: string): void {
  localStorage.removeItem(alertedIdsKey(userId));
}
