import { ref, push, get, set, update, remove } from 'firebase/database';
import { db } from './firebase';
import type { Produto } from '~/models';

export interface PrecoHistorico {
  valor: number;
  data: string;
}

export async function getProdutos(): Promise<Produto[]> {
  const snapshot = await get(ref(db, 'produtos'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function createProduto(data: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newRef = push(ref(db, 'produtos'));
  const now = new Date().toISOString();
  await set(newRef, {
    ...data,
    createdAt: now,
    updatedAt: now
  });
  // Log initial price
  await push(ref(db, `historicoPrecos/${newRef.key!}`), { valor: data.valor, data: now });
  return newRef.key!;
}

export async function updateProduto(id: string, data: Partial<Omit<Produto, 'id' | 'createdAt'>>): Promise<void> {
  const now = new Date().toISOString();
  await update(ref(db, `produtos/${id}`), { ...data, updatedAt: now });
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
  await remove(ref(db, `produtos/${id}`));
  await remove(ref(db, `historicoPrecos/${id}`));
}
