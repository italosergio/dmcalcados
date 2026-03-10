import { ref, push, get, set, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Cliente } from '~/models';

export async function getClientes(): Promise<Cliente[]> {
  const snapshot = await get(ref(db, 'clientes'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .filter(c => !c.deletedAt);
}

export async function deleteCliente(clienteId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await update(ref(db, `clientes/${clienteId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function createCliente(data: Omit<Cliente, 'id' | 'createdAt'>): Promise<string> {
  const newRef = push(ref(db, 'clientes'));
  await set(newRef, {
    ...data,
    createdAt: new Date().toISOString()
  });
  return newRef.key!;
}
