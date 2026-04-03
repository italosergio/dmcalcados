import { ref, push, get, set, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Venda } from '~/models';

async function getNextPedidoNumero(): Promise<number> {
  const snapshot = await get(ref(db, 'vendas'));
  if (!snapshot.exists()) return 1;
  const data = snapshot.val();
  const maxNum = Object.values(data)
    .map((v: any) => v.pedidoNumero || 0)
    .reduce((max: number, n: number) => Math.max(max, n), 0);
  return maxNum + 1;
}

export async function getVendas(): Promise<Venda[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const userData = await get(ref(db, `users/${user.uid}`));
  const isAdmin = userData.val()?.role === 'admin';

  const snapshot = await get(ref(db, 'vendas'));
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  const all = Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .filter((v: any) => !v.deletedAt);

  const filtered = isAdmin ? all : all.filter((v: any) => v.vendedorId === user.uid);
  return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteVenda(vendaId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await update(ref(db, `vendas/${vendaId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function createVenda(data: Omit<Venda, 'id' | 'createdAt' | 'pedidoNumero'>): Promise<string> {
  const pedidoNumero = await getNextPedidoNumero();
  const newRef = push(ref(db, 'vendas'));
  await set(newRef, {
    ...data,
    pedidoNumero,
    data: data.data instanceof Date ? data.data.toISOString() : data.data,
    createdAt: new Date().toISOString()
  });
  return newRef.key!;
}
