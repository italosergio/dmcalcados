import { ref, push, get, set } from 'firebase/database';
import { db } from './firebase';
import type { Despesa } from '~/models';

export async function getDespesas(): Promise<Despesa[]> {
  const snapshot = await get(ref(db, 'despesas'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
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
