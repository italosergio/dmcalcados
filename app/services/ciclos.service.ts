import { ref, push, get, set, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Ciclo, CicloProduto } from '~/models';

const PECAS_POR_PACOTE = 15;

function normalizeProdutos(raw: any): CicloProduto[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  return arr.map((p: any) => {
    // Compatibilidade com dados antigos (quantidadeInicial/quantidadeAtual)
    if (p.pacotesInicial != null) return p;
    const pecasI = p.quantidadeInicial || 0;
    const pecasA = p.quantidadeAtual || 0;
    return {
      ...p,
      pacotesInicial: Math.floor(pecasI / PECAS_POR_PACOTE),
      pecasInicial: pecasI,
      pacotesAtual: Math.floor(pecasA / PECAS_POR_PACOTE),
      pecasAtual: pecasA,
    };
  });
}

export async function getCiclos(): Promise<Ciclo[]> {
  const snapshot = await get(ref(db, 'ciclos'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => {
      const c = data[key];
      return { id: key, ...c, produtos: normalizeProdutos(c.produtos) };
    })
    .filter(c => c.createdAt && c.vendedorId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCiclosByVendedor(vendedorId: string): Promise<Ciclo[]> {
  const all = await getCiclos();
  return all.filter(c => c.vendedorId === vendedorId);
}

export async function getCicloAtivo(vendedorId: string): Promise<Ciclo | null> {
  const all = await getCiclosByVendedor(vendedorId);
  return all.find(c => c.status === 'ativo') || null;
}

export async function createCiclo(
  vendedorId: string,
  vendedorNome: string,
  produtos: { produtoId: string; modelo: string; referencia: string; pacotes: number; valorUnitario: number }[]
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const existente = await getCicloAtivo(vendedorId);
  if (existente) throw new Error('Vendedor já possui um ciclo ativo');

  const userData = await get(ref(db, `users/${user.uid}`));
  const criadoPorNome = userData.val()?.nome || '';

  const cicloProds: CicloProduto[] = produtos.map(p => ({
    produtoId: p.produtoId,
    modelo: p.modelo,
    referencia: p.referencia,
    pacotesInicial: p.pacotes,
    pecasInicial: p.pacotes * PECAS_POR_PACOTE,
    pacotesAtual: p.pacotes,
    pecasAtual: p.pacotes * PECAS_POR_PACOTE,
    valorUnitario: p.valorUnitario,
  }));

  // Descontar do estoque geral (em peças)
  for (const p of cicloProds) {
    const snap = await get(ref(db, `produtos/${p.produtoId}/estoque`));
    const atual = snap.val() || 0;
    if (atual < p.pecasInicial) {
      throw new Error(`Estoque insuficiente para ${p.modelo}. Disponível: ${atual} pçs, solicitado: ${p.pecasInicial} pçs (${p.pacotesInicial} pct)`);
    }
    await update(ref(db, `produtos/${p.produtoId}`), {
      estoque: atual - p.pecasInicial,
      updatedAt: new Date().toISOString(),
    });
  }

  const ciclo: Omit<Ciclo, 'id'> = {
    vendedorId,
    vendedorNome,
    produtos: cicloProds,
    status: 'ativo',
    criadoPorId: user.uid,
    criadoPorNome,
    createdAt: new Date().toISOString(),
  };

  const newRef = push(ref(db, 'ciclos'));
  await set(newRef, ciclo);
  return newRef.key!;
}

export async function fecharCiclo(cicloId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const snap = await get(ref(db, `ciclos/${cicloId}`));
  if (!snap.exists()) throw new Error('Ciclo não encontrado');
  const cicloData = snap.val();
  const produtos = normalizeProdutos(cicloData.produtos);
  if (cicloData.status === 'fechado') throw new Error('Ciclo já está fechado');

  const userData = await get(ref(db, `users/${user.uid}`));
  const fechadoPorNome = userData.val()?.nome || '';

  // Devolver peças restantes ao estoque geral
  for (const p of produtos) {
    if (p.pecasAtual > 0) {
      const estoqueSnap = await get(ref(db, `produtos/${p.produtoId}/estoque`));
      const atual = estoqueSnap.val() || 0;
      await update(ref(db, `produtos/${p.produtoId}`), {
        estoque: atual + p.pecasAtual,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await update(ref(db, `ciclos/${cicloId}`), {
    status: 'fechado',
    fechadoPorId: user.uid,
    fechadoPorNome,
    closedAt: new Date().toISOString(),
  });
}

/** Chamado pela venda: desconta peças do ciclo ativo do vendedor */
export async function descontarDoCiclo(
  vendedorId: string,
  produtos: { produtoId: string; quantidade: number; tipo?: string }[]
): Promise<void> {
  const ciclo = await getCicloAtivo(vendedorId);
  if (!ciclo) return;

  const snap = await get(ref(db, `ciclos/${ciclo.id}`));
  const cicloData = snap.val();
  const cicloProds: CicloProduto[] = normalizeProdutos(cicloData.produtos);

  for (const p of produtos) {
    const pecas = p.tipo === 'pacote' ? p.quantidade * PECAS_POR_PACOTE : p.quantidade;
    const idx = cicloProds.findIndex(cp => cp.produtoId === p.produtoId);
    if (idx >= 0) {
      cicloProds[idx].pecasAtual = Math.max(0, cicloProds[idx].pecasAtual - pecas);
      cicloProds[idx].pacotesAtual = Math.floor(cicloProds[idx].pecasAtual / PECAS_POR_PACOTE);
    }
  }

  await update(ref(db, `ciclos/${ciclo.id}`), { produtos: cicloProds });
}
