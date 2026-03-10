import { ref, push, get, set, query, orderByChild, equalTo, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Venda } from '~/models';

export async function getVendas(): Promise<Venda[]> {
  const user = auth.currentUser;
  if (!user) {
    console.log('Nenhum usuário logado');
    return [];
  }

  const userData = await get(ref(db, `users/${user.uid}`));
  const isAdmin = userData.val()?.role === 'admin';
  console.log('User role:', userData.val()?.role, 'isAdmin:', isAdmin);

  if (isAdmin) {
    const snapshot = await get(ref(db, 'vendas'));
    if (!snapshot.exists()) {
      console.log('Nenhuma venda no banco');
      return [];
    }
    const data = snapshot.val();
    console.log('Vendas (admin):', Object.keys(data).length);
    return Object.keys(data)
      .map(key => ({ id: key, ...data[key] }))
      .filter(v => !v.deletedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    const snapshot = await get(ref(db, 'vendas'));
    if (!snapshot.exists()) {
      console.log('Nenhuma venda no banco');
      return [];
    }
    const data = snapshot.val();
    const filtered = Object.keys(data)
      .map(key => ({ id: key, ...data[key] }))
      .filter(venda => venda.vendedorId === user.uid && !venda.deletedAt);
    console.log('Vendas totais:', Object.keys(data).length, 'Vendas do vendedor:', filtered.length, 'UID:', user.uid);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function deleteVenda(vendaId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await update(ref(db, `vendas/${vendaId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
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
