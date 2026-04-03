import { ref, push, get, set, update, remove } from 'firebase/database';
import { db } from './firebase';
import type { Produto } from '~/models';

export async function getProdutos(): Promise<Produto[]> {
  const snapshot = await get(ref(db, 'produtos'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function createProduto(data: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newRef = push(ref(db, 'produtos'));
  await set(newRef, {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return newRef.key!;
}

export async function updateProduto(id: string, data: Partial<Omit<Produto, 'id' | 'createdAt'>>): Promise<void> {
  await update(ref(db, `produtos/${id}`), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteProduto(id: string): Promise<void> {
  await remove(ref(db, `produtos/${id}`));
}
