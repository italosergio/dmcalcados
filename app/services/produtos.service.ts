import { ref, push, get, set, update, remove } from 'firebase/database';
import { db, auth } from './firebase';
import type { Produto } from '~/models';

export interface PrecoHistorico {
  valor: number;
  data: string;
}

export async function getProdutos(): Promise<Produto[]> {
  const snapshot = await get(ref(db, 'produtos'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .filter((p: any) => !p.deletedAt);
}

export async function createProduto(data: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = auth.currentUser;
  const newRef = push(ref(db, 'produtos'));
  const now = new Date().toISOString();
  await set(newRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: user?.uid || '',
  });
  // Log initial price
  await push(ref(db, `historicoPrecos/${newRef.key!}`), { valor: data.valor, data: now });
  return newRef.key!;
}

export async function updateProduto(id: string, data: Partial<Omit<Produto, 'id' | 'createdAt'>>): Promise<void> {
  const user = auth.currentUser;
  const userData = await get(ref(db, `users/${user!.uid}`));
  const nome = userData.val()?.nome || '';
  const now = new Date().toISOString();
  await update(ref(db, `produtos/${id}`), { ...data, updatedAt: now, updatedBy: user!.uid, updatedByNome: nome });
  if (data.valor !== undefined) {
    await push(ref(db, `historicoPrecos/${id}`), { valor: data.valor, data: now });
  }
}

export async function getPrecoHistorico(produtoId: string): Promise<PrecoHistorico[]> {
  const snapshot = await get(ref(db, `historicoPrecos/${produtoId}`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data) as PrecoHistorico[];
}

export async function deleteProduto(id: string): Promise<void> {
  const user = auth.currentUser;
  const produtoSnap = await get(ref(db, `produtos/${id}`));
  const produto = produtoSnap.val();
  await set(ref(db, `produtos/${id}`), {
    ...produto,
    deletedAt: new Date().toISOString(),
    deletedBy: user?.uid || '',
  });
  await remove(ref(db, `historicoPrecos/${id}`));
}
