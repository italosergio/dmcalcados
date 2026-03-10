import { ref, push, get, set, query, orderByChild, equalTo, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Despesa } from '~/models';

export async function getDespesas(): Promise<Despesa[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const userData = await get(ref(db, `users/${user.uid}`));
  const isAdmin = userData.val()?.role === 'admin';

  const snapshot = await get(ref(db, 'despesas'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  const allDespesas = Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .filter(d => !d.deletedAt);

  if (isAdmin) {
    return allDespesas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    // Vendedor vê apenas suas despesas
    const minhasDespesas = allDespesas.filter(despesa => despesa.usuarioId === user.uid);
    console.log('Despesas do vendedor:', minhasDespesas.length, 'de', allDespesas.length);
    return minhasDespesas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function deleteDespesa(despesaId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await update(ref(db, `despesas/${despesaId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function createDespesa(data: Omit<Despesa, 'id' | 'createdAt'>): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    console.log('createDespesa - dados recebidos:', data);
    
    const despesaData = {
      tipo: data.tipo,
      valor: data.valor,
      data: data.data instanceof Date ? data.data.toISOString() : data.data,
      usuarioId: data.usuarioId,
      usuarioNome: data.usuarioNome,
      createdAt: new Date().toISOString()
    };

    console.log('createDespesa - dados a salvar:', despesaData);
    
    const newRef = push(ref(db, 'despesas'));
    await set(newRef, despesaData);
    
    console.log('createDespesa - sucesso, ID:', newRef.key);
    return newRef.key!;
  } catch (error) {
    console.error('createDespesa - erro:', error);
    throw error;
  }
}
