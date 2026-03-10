import { ref, push, get, set, query, orderByChild, equalTo, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Despesa } from '~/models';

export async function getDespesas(): Promise<Despesa[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const userData = await get(ref(db, `users/${user.uid}`));
  const isAdmin = userData.val()?.role === 'admin';

  if (isAdmin) {
    const snapshot = await get(ref(db, 'despesas'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data)
      .map(key => ({ id: key, ...data[key] }))
      .filter(d => !d.deletedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    const snapshot = await get(ref(db, 'despesas'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    const filtered = Object.keys(data)
      .map(key => ({ id: key, ...data[key] }))
      .filter(despesa => despesa.usuarioId === user.uid && !despesa.deletedAt);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function deleteDespesa(despesaId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await update(ref(db, `despesas/${despesaId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function createDespesa(data: Omit<Despesa, 'id' | 'createdAt'>): Promise<string> {
  const newRef = push(ref(db, 'despesas'));
  await set(newRef, {
    ...data,
    data: data.data.toISOString(),
    createdAt: new Date().toISOString()
  });
  return newRef.key!;
}
