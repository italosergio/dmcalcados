import { ref, push, get, set } from 'firebase/database';
import { db } from './firebase';
import type { Venda } from '~/models';

export async function getVendas(): Promise<Venda[]> {
  const snapshot = await get(ref(db, 'vendas'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function createVenda(data: Omit<Venda, 'id' | 'createdAt'>): Promise<string> {
  const newRef = push(ref(db, 'vendas'));
  await set(newRef, {
    ...data,
    data: data.data.toISOString(),
    createdAt: new Date().toISOString()
  });
  return newRef.key!;
}
