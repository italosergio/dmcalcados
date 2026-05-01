import { ref, push, get, set, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Deposito } from '~/models';

export async function getDepositos(): Promise<Deposito[]> {
  const snapshot = await get(ref(db, 'depositos'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createDeposito(data: Omit<Deposito, 'id' | 'createdAt' | 'registradoPorId' | 'registradoPorNome'>): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const userData = await get(ref(db, `users/${user.uid}`));
  const uData = userData.val();

  const newRef = push(ref(db, 'depositos'));
  await set(newRef, {
    valor: data.valor,
    data: data.data,
    depositanteId: data.depositanteId,
    depositanteNome: data.depositanteNome,
    ...(data.imagemUrl ? { imagemUrl: data.imagemUrl } : {}),
    ...((data as any).semFoto ? { semFoto: true, justificativa: (data as any).justificativa || '' } : {}),
    ...((data as any).cicloId ? { cicloId: (data as any).cicloId } : {}),
    registradoPorId: user.uid,
    registradoPorNome: uData?.nome || '',
    createdAt: new Date().toISOString(),
  });
  return newRef.key!;
}

export async function deleteDeposito(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  await update(ref(db, `depositos/${id}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid,
  });
}

export async function restoreDeposito(id: string): Promise<void> {
  await update(ref(db, `depositos/${id}`), { deletedAt: null, deletedBy: null });
}

export async function updateDeposito(id: string, data: Partial<Omit<Deposito, 'id' | 'createdAt'>>): Promise<void> {
  const payload: any = { ...data };
  Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
  await update(ref(db, `depositos/${id}`), payload);
}
