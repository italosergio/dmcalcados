import { ref, push, get, set } from 'firebase/database';
import { db } from './firebase';
import type { Cliente } from '~/models';

export async function getClientes(): Promise<Cliente[]> {
  const snapshot = await get(ref(db, 'clientes'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function createCliente(data: Omit<Cliente, 'id' | 'createdAt'>): Promise<string> {
  const newRef = push(ref(db, 'clientes'));
  await set(newRef, {
    ...data,
    createdAt: new Date().toISOString()
  });
  return newRef.key!;
}
