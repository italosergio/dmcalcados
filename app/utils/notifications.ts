const READ_AT_KEY = 'notifications_read_at';
const READ_AT_EVENT = 'notifications-read-at-change';

export function getNotificationsReadAt() {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(READ_AT_KEY) || 0);
}

export function markNotificationsRead(timestamp = Date.now()) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(READ_AT_KEY, String(timestamp));
  window.dispatchEvent(new CustomEvent(READ_AT_EVENT, { detail: timestamp }));
}

export function subscribeNotificationsReadAt(callback: (timestamp: number) => void) {
  if (typeof window === 'undefined') return () => {};

  const onCustom = (event: Event) => {
    callback(Number((event as CustomEvent<number>).detail || getNotificationsReadAt()));
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === READ_AT_KEY) callback(Number(event.newValue || 0));
  };

  window.addEventListener(READ_AT_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(READ_AT_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
