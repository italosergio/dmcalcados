import { ref, push, query, orderByChild, limitToLast, onValue, type Unsubscribe } from 'firebase/database';
import { db } from './firebase';

export interface AnalyticsEvent {
  id: string;
  tipo: string;
  usuarioId: string;
  usuarioNome: string;
  detalhes?: string;
  timestamp: string;
}

export async function trackEvent(tipo: string, usuarioId: string, usuarioNome: string, detalhes?: string) {
  if (typeof window === 'undefined') return;
  try {
    const data: Record<string, string> = { tipo, usuarioId, usuarioNome, timestamp: new Date().toISOString() };
    if (detalhes) data.detalhes = detalhes;
    await push(ref(db, 'analytics'), data);
    console.log('[analytics] evento registrado:', tipo, usuarioNome);
  } catch (err) {
    console.error('[analytics] erro ao registrar evento:', err);
  }
}

export function onAnalyticsEvents(limit: number, callback: (events: AnalyticsEvent[]) => void): Unsubscribe {
  const q = query(ref(db, 'analytics'), orderByChild('timestamp'), limitToLast(limit));
  return onValue(q, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const data = snap.val();
    const events = Object.entries(data).map(([id, v]: any) => ({ id, ...v })) as AnalyticsEvent[];
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    callback(events);
  });
}
