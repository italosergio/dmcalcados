import { ref, push, get, set, update } from 'firebase/database';
import { db, auth } from './firebase';
import { descontarDoCiclo } from './ciclos.service';
import type { Venda } from '~/models';
import { isVendedor } from '~/models';

function calcPares(p: { tipo?: string; quantidade: number }): number {
  return p.tipo === 'pacote' ? p.quantidade * 15 : p.quantidade;
}

async function ajustarEstoque(produtos: { produtoId: string; tipo?: string; quantidade: number }[], direcao: 1 | -1): Promise<void> {
  for (const p of produtos) {
    const snap = await get(ref(db, `produtos/${p.produtoId}/estoque`));
    const atual = snap.val() || 0;
    const delta = calcPares(p) * direcao;
    await update(ref(db, `produtos/${p.produtoId}`), {
      estoque: Math.max(0, atual + delta),
      updatedAt: new Date().toISOString(),
    });
  }
}

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
  const uData = userData.val();
  const roles: string[] = uData?.roles?.length ? uData.roles : [uData?.role];
  const isAdmin = roles.some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor');

  const [vendasSnap, usersSnap] = await Promise.all([
    get(ref(db, 'vendas')),
    get(ref(db, 'users')),
  ]);
  if (!vendasSnap.exists()) return [];

  const usersData = usersSnap.val() || {};
  const data = vendasSnap.val();
  const all = Object.keys(data).map(key => {
    const v = { id: key, ...data[key] };
    if (v.deletedBy && usersData[v.deletedBy]) {
      v.deletedByNome = usersData[v.deletedBy].nome || usersData[v.deletedBy].username;
    }
    return v;
  });

  const filtered = isAdmin ? all : all.filter((v: any) => v.vendedorId === user.uid);
  return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteVenda(vendaId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const snap = await get(ref(db, `vendas/${vendaId}`));
  const venda = snap.val();
  if (venda?.produtos && !venda.deletedAt) {
    await ajustarEstoque(venda.produtos, 1);
  }

  await update(ref(db, `vendas/${vendaId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function restoreVenda(vendaId: string): Promise<void> {
  const snap = await get(ref(db, `vendas/${vendaId}`));
  const venda = snap.val();
  if (venda?.produtos && venda.deletedAt) {
    await ajustarEstoque(venda.produtos, -1);
  }

  await update(ref(db, `vendas/${vendaId}`), {
    deletedAt: null,
    deletedBy: null
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

  // Verificar se o vendedor tem ciclo ativo
  const vendedorSnap = await get(ref(db, `users/${data.vendedorId}`));
  const vendedorData = vendedorSnap.val();
  const roles: string[] = vendedorData?.roles?.length ? vendedorData.roles : [vendedorData?.role];
  const vendedorIsVendedor = roles.some(r => isVendedor(r as any));
  const vendedorIsAdmin = roles.some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor');

  if (vendedorIsVendedor && !vendedorIsAdmin) {
    // Desconta do ciclo do vendedor
    await descontarDoCiclo(data.vendedorId, data.produtos);
  } else {
    // Admin vendendo direto: desconta do estoque geral
    await ajustarEstoque(data.produtos, -1);
  }

  return newRef.key!;
}
