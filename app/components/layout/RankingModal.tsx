import { useEffect, useState } from 'react';
import { X, Trophy, Medal } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '~/services/firebase';
import { formatCurrency } from '~/utils/format';
import { salvarRanking, type RankingEntry } from '~/services/ranking.service';

type Periodo = 'dia' | 'mes' | 'ano';

const PERIODO_LABELS: Record<Periodo, string> = { dia: 'Hoje', mes: 'Mês', ano: 'Ano' };

function shortName(nome: string) {
  const parts = nome.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

export function RankingModal({ initialTab = 'mes', onClose }: { initialTab?: 'dia' | 'mes' | 'ano'; onClose: () => void }) {
  const [periodo, setPeriodo] = useState<Periodo>(initialTab);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const inicio = periodo === 'dia' ? inicioDia : periodo === 'mes' ? inicioMes : inicioAno;

    Promise.all([get(ref(db, 'vendas')), get(ref(db, 'users'))]).then(([snap, usersSnap]) => {
      if (!snap.exists()) { setRanking([]); setLoading(false); return; }
      const usersData = usersSnap.exists() ? usersSnap.val() : {};
      const vendedorIds = new Set(Object.entries(usersData).filter(([_, u]: any) => {
        const roles: string[] = u.roles?.length ? u.roles : [u.role];
        return roles.some((r: string) => r === 'vendedor' || r === 'vendedor1' || r === 'vendedor2' || r === 'vendedor3');
      }).map(([id]) => id));

      const vendas = Object.values(snap.val()) as any[];
      const ativas = vendas.filter(v => !v.deletedAt && new Date(v.data) >= inicio && vendedorIds.has(v.vendedorId));

      const map: Record<string, RankingEntry> = {};
      ativas.forEach(v => {
        if (!map[v.vendedorId]) map[v.vendedorId] = { vendedorId: v.vendedorId, vendedorNome: v.vendedorNome, total: 0 };
        map[v.vendedorId].total += v.valorTotal;
      });
      const sorted = Object.values(map).sort((a, b) => b.total - a.total);
      setRanking(sorted);

      // Salvar snapshot
      const diaStr = hoje.toISOString().slice(0, 10);
      const key = periodo === 'dia' ? `dia:${diaStr}` : periodo === 'mes' ? `mes:${diaStr.slice(0, 7)}` : `ano:${diaStr.slice(0, 4)}`;
      salvarRanking(key, sorted).catch(() => {});

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [periodo]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <span className="text-sm font-semibold">Ranking de Vendedores</span>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle">
          {(['dia', 'mes', 'ano'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${periodo === p ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-content-muted hover:text-content'}`}>
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-center text-xs text-content-muted py-4">Carregando...</p>
          ) : ranking.length === 0 ? (
            <p className="text-center text-xs text-content-muted py-4">Sem vendas no período</p>
          ) : (
            <div className="space-y-1.5">
              {ranking.map((r, i) => (
                <div key={r.vendedorId} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${i < 3 ? 'bg-elevated' : ''}`}>
                  <div className="w-6 text-center shrink-0">
                    {i < 3 ? (
                      <Medal size={16} className={medalColors[i]} />
                    ) : (
                      <span className="text-xs text-content-muted">{i + 1}º</span>
                    )}
                  </div>
                  <span className="text-sm flex-1 truncate">{shortName(r.vendedorNome)}</span>
                  <span className="text-xs font-semibold text-green-400">{formatCurrency(r.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
