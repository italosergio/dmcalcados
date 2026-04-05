import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

export interface RankingEntry {
  vendedorId: string;
  vendedorNome: string;
  total: number;
}

export interface RankingSnapshot {
  periodo: string; // 'dia:2025-01-15', 'mes:2025-01', 'ano:2025'
  ranking: RankingEntry[];
  criadoEm: string;
}

function rankingKey(periodo: string) {
  return periodo.replace(/[.#$/[\]]/g, '_');
}

export async function salvarRanking(periodo: string, ranking: RankingEntry[]) {
  const key = rankingKey(periodo);
  await set(ref(db, `rankings/${key}`), {
    periodo,
    ranking,
    criadoEm: new Date().toISOString(),
  });
}

export async function getRanking(periodo: string): Promise<RankingSnapshot | null> {
  const key = rankingKey(periodo);
  const snap = await get(ref(db, `rankings/${key}`));
  return snap.exists() ? snap.val() : null;
}

export async function getRankingsHistorico(): Promise<RankingSnapshot[]> {
  const snap = await get(ref(db, 'rankings'));
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.values(data) as RankingSnapshot[];
}

// Calcula ranking a partir das vendas e salva snapshot
export async function calcularESalvarRanking() {
  const vendasSnap = await get(ref(db, 'vendas'));
  if (!vendasSnap.exists()) return;
  const vendas = Object.values(vendasSnap.val()) as any[];
  const ativas = vendas.filter(v => !v.deletedAt);

  const hoje = new Date();
  const diaStr = hoje.toISOString().slice(0, 10);
  const mesStr = diaStr.slice(0, 7);
  const anoStr = diaStr.slice(0, 4);

  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);

  const buildRanking = (filtradas: any[]): RankingEntry[] => {
    const map: Record<string, RankingEntry> = {};
    filtradas.forEach(v => {
      if (!map[v.vendedorId]) map[v.vendedorId] = { vendedorId: v.vendedorId, vendedorNome: v.vendedorNome, total: 0 };
      map[v.vendedorId].total += v.valorTotal;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  };

  await Promise.all([
    salvarRanking(`dia:${diaStr}`, buildRanking(ativas.filter(v => new Date(v.data) >= inicioDia))),
    salvarRanking(`mes:${mesStr}`, buildRanking(ativas.filter(v => new Date(v.data) >= inicioMes))),
    salvarRanking(`ano:${anoStr}`, buildRanking(ativas.filter(v => new Date(v.data) >= inicioAno))),
  ]);
}
