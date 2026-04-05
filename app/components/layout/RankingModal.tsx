import { useEffect, useState } from 'react';
import { X, Trophy, Medal, Gift, Rocket } from 'lucide-react';
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
  const [showBeneficios, setShowBeneficios] = useState(false);

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

      const nomeMap: Record<string, string> = {};
      Object.entries(usersData).forEach(([id, u]: any) => { nomeMap[id] = u.nome; });

      const map: Record<string, RankingEntry> = {};
      ativas.forEach(v => {
        if (!map[v.vendedorId]) map[v.vendedorId] = { vendedorId: v.vendedorId, vendedorNome: nomeMap[v.vendedorId] || v.vendedorNome, total: 0 };
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

        <div className="border-t border-border-subtle px-5 py-2.5">
          <button onClick={() => setShowBeneficios(true)} className="flex items-center gap-1.5 text-[11px] text-content-muted hover:text-yellow-400 transition-colors">
            <Gift size={12} /> Benefícios do ranking
          </button>
        </div>
      </div>

      {showBeneficios && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-10" onClick={() => setShowBeneficios(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-yellow-400" />
                <span className="text-sm font-semibold">Benefícios do Ranking</span>
              </div>
              <button onClick={() => setShowBeneficios(false)} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                {[{ color: 'text-yellow-400', bg: 'bg-yellow-400/20', label: '1º Lugar' }, { color: 'text-gray-300', bg: 'bg-gray-300/20', label: '2º Lugar' }, { color: 'text-amber-600', bg: 'bg-amber-600/20', label: '3º Lugar' }].map(({ color, bg, label }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Medal size={18} className={`${color} shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${color}`}>{label}</p>
                      <div className="mt-1 space-y-1">
                        <div className={`h-2.5 rounded-full ${bg} animate-pulse w-4/5`} />
                        <div className={`h-2.5 rounded-full ${bg} animate-pulse w-3/5`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 px-3.5 py-2.5">
                <p className="text-[11px] text-yellow-400/80 leading-relaxed flex items-start gap-1.5">
                  <Rocket size={13} className="shrink-0 mt-0.5" /> Estamos no início da nossa jornada! Conforme a empresa cresce e o time de vendedores aumenta, os benefícios do ranking serão ampliados com premiações ainda melhores. Continue dando o seu melhor!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
