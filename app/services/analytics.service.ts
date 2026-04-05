import { ref, push, query, orderByChild, limitToLast, onValue, type Unsubscribe } from 'firebase/database';
import { db } from './firebase';

export interface AnalyticsEvent {
  id: string;
  tipo: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioFoto?: string;
  detalhes?: string;
  timestamp: string;
}

export async function trackEvent(tipo: string, usuarioId: string, usuarioNome: string, detalhes?: string, usuarioFoto?: string) {
  if (typeof window === 'undefined') return;
  try {
    const data: Record<string, string> = { tipo, usuarioId, usuarioNome, timestamp: new Date().toISOString() };
    if (detalhes) data.detalhes = detalhes;
    if (usuarioFoto) data.usuarioFoto = usuarioFoto;
    const path = usuarioId === 'anonimo' ? 'analytics/anonimo' : 'analytics';
    await push(ref(db, path), data);
  } catch (err) {
    console.error('[analytics] erro ao registrar evento:', err);
  }
}

export function onAnalyticsEvents(limit: number, callback: (events: AnalyticsEvent[]) => void, excludeUserId?: string): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];
  let authenticatedEvents: AnalyticsEvent[] = [];
  let anonymousEvents: AnalyticsEvent[] = [];
  
  const updateEvents = () => {
    let allEvents = [...authenticatedEvents, ...anonymousEvents];
    let filtered = allEvents.filter(e => e.usuarioNome && e.timestamp);
    if (excludeUserId && excludeUserId !== 'anonimo') {
      filtered = filtered.filter(e => e.usuarioId !== excludeUserId);
    }
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    callback(filtered.slice(0, limit));
  };

  const q1 = query(ref(db, 'analytics'), orderByChild('timestamp'), limitToLast(limit));
  unsubscribers.push(onValue(q1, (snap) => {
    authenticatedEvents = snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })) : [];
    updateEvents();
  }));

  const q2 = query(ref(db, 'analytics/anonimo'), orderByChild('timestamp'), limitToLast(limit));
  unsubscribers.push(onValue(q2, (snap) => {
    anonymousEvents = snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id: `anon_${id}`, ...v })) : [];
    updateEvents();
  }));

  return () => unsubscribers.forEach(unsub => unsub());
}
