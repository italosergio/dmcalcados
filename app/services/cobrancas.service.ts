import { ref, push, get, set, remove } from 'firebase/database';
import { db, auth } from './firebase';
import type { Cobranca } from '~/models';

export async function getCobrancas(cicloId: string): Promise<Cobranca[]> {
  const snap = await get(ref(db, `ciclos/${cicloId}/cobrancas`));
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function addCobranca(cicloId: string, data: Omit<Cobranca, 'id' | 'createdAt' | 'registradoPor' | 'registradoPorNome'>): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');
  const userData = await get(ref(db, `users/${user.uid}`));
  const nome = userData.val()?.nome || '';
  const newRef = push(ref(db, `ciclos/${cicloId}/cobrancas`));
  await set(newRef, { ...data, registradoPor: user.uid, registradoPorNome: nome, createdAt: new Date().toISOString() });
}

export async function removeCobranca(cicloId: string, cobrancaId: string): Promise<void> {
  await remove(ref(db, `ciclos/${cicloId}/cobrancas/${cobrancaId}`));
}
