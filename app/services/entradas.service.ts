import { ref, push, get, set } from 'firebase/database';
import { db } from './firebase';
import type { EntradaProduto } from '~/models';

export async function getEntradas(): Promise<EntradaProduto[]> {
  const snapshot = await get(ref(db, 'entradas'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function createEntrada(data: Omit<EntradaProduto, 'id' | 'createdAt'> & { createdAt?: string; loteId?: string }): Promise<string> {
  const newRef = push(ref(db, 'entradas'));
  await set(newRef, { ...data, createdAt: data.createdAt || new Date().toISOString() });
  return newRef.key!;
}

export async function migrarEntradasExistentes(): Promise<number> {
  const { getProdutos } = await import('./produtos.service');
  const [produtos, entradas] = await Promise.all([getProdutos(), getEntradas()]);
  const produtosComEntrada = new Set(entradas.map(e => e.produtoId));
  let count = 0;
  for (const p of produtos) {
    if (produtosComEntrada.has(p.id) || p.estoque <= 0) continue;
    await createEntrada({
      produtoId: p.id,
      modelo: p.modelo,
      referencia: p.referencia,
      quantidade: p.estoque,
      valorUnitario: p.valor,
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(p.createdAt).toISOString(),
    });
    count++;
  }
  return count;
}
