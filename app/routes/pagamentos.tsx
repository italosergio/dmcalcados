import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useVendas } from '~/hooks/useRealtime';
import { onPagamentos, marcarParcela, type PagamentoParcela } from '~/services/pagamentos.service';
import { formatCurrency } from '~/utils/format';
import { userIsAdmin, userCanAccessAdmin } from '~/models';
import { Check, Clock, AlertTriangle, XCircle, Skull, Filter, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';

type StatusParcela = 'em_dia' | 'proximo' | 'vencido' | 'atrasado' | 'critico' | 'pago';

const THRESHOLDS = { proximo: 7, vencido: 15, atrasado: 60 };

function getStatus(dataVenc: string, pago: boolean): StatusParcela {
  if (pago) return 'pago';
  const diff = Math.floor((new Date(dataVenc + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (diff > THRESHOLDS.proximo) return 'em_dia';
  if (diff >= 0) return 'proximo';
  const atraso = Math.abs(diff);
  if (atraso <= THRESHOLDS.vencido) return 'vencido';
  if (atraso <= THRESHOLDS.atrasado) return 'atrasado';
  return 'critico';
}

const STATUS_CONFIG: Record<StatusParcela, { label: string; color: string; bg: string; icon: any }> = {
  pago:     { label: 'Pago',     color: 'text-blue-400',   bg: 'bg-blue-500/15',   icon: Check },
  em_dia:   { label: 'Em dia',   color: 'text-green-400',  bg: 'bg-green-500/15',  icon: Clock },
  proximo:  { label: 'Próximo',  color: 'text-yellow-400', bg: 'bg-yellow-500/15', icon: Clock },
  vencido:  { label: 'Vencido',  color: 'text-orange-400', bg: 'bg-orange-500/15', icon: AlertTriangle },
  atrasado: { label: 'Atrasado', color: 'text-red-400',    bg: 'bg-red-500/15',    icon: XCircle },
  critico:  { label: 'Crítico',  color: 'text-red-300',    bg: 'bg-red-900/30',    icon: Skull },
};

interface Parcela {
  vendaId: string;
  pedidoNumero: number;
  clienteNome: string;
  vendedorNome: string;
  index: number;
  total: number;
  valor: number;
  dataVencimento: string;
  status: StatusParcela;
  pago: boolean;
}

export default function PagamentosPage() {
  const { user } = useAuth();
  const { vendas, loading: loadingVendas } = useVendas();
  const [pagamentos, setPagamentos] = useState<Record<string, Record<string, PagamentoParcela>>>({});
  const [loadingPag, setLoadingPag] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<StatusParcela | 'todos'>('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);
  const navigate = useNavigate();

  const isAdmin = user && userIsAdmin(user);
  const canAccess = user && userCanAccessAdmin(user);

  useEffect(() => {
    if (user && !canAccess) navigate('/vendas');
  }, [user, canAccess]);

  useEffect(() => {
    const unsub = onPagamentos((data) => { setPagamentos(data); setLoadingPag(false); });
    return () => unsub();
  }, []);

  const parcelas = useMemo<Parcela[]>(() => {
    const result: Parcela[] = [];
    for (const v of vendas) {
      if (v.deletedAt || v.condicaoPagamento === 'avista' || !v.datasParcelas?.length) continue;
      const nParcelas = v.datasParcelas.length;
      const valorParcela = (v.valorPrazo || v.valorTotal) / nParcelas;
      for (let i = 0; i < nParcelas; i++) {
        const pago = pagamentos[v.id]?.[i]?.pago || false;
        result.push({
          vendaId: v.id,
          pedidoNumero: v.pedidoNumero,
          clienteNome: v.clienteNome,
          vendedorNome: v.vendedorNome,
          index: i,
          total: nParcelas,
          valor: valorParcela,
          dataVencimento: v.datasParcelas[i],
          status: getStatus(v.datasParcelas[i], pago),
          pago,
        });
      }
    }
    result.sort((a, b) => {
      if (a.pago !== b.pago) return a.pago ? 1 : -1;
      return a.dataVencimento.localeCompare(b.dataVencimento);
    });
    return result;
  }, [vendas, pagamentos]);

  const filtered = useMemo(() => {
    let list = parcelas;
    if (filtroStatus !== 'todos') list = list.filter(p => p.status === filtroStatus);
    if (filtroBusca) {
      const q = filtroBusca.toLowerCase();
      list = list.filter(p => p.clienteNome.toLowerCase().includes(q) || p.vendedorNome.toLowerCase().includes(q) || String(p.pedidoNumero).includes(q));
    }
    return list;
  }, [parcelas, filtroStatus, filtroBusca]);

  const resumo = useMemo(() => {
    const pendentes = parcelas.filter(p => !p.pago);
    return {
      total: pendentes.reduce((s, p) => s + p.valor, 0),
      proximos: pendentes.filter(p => p.status === 'proximo').length,
      atrasados: pendentes.filter(p => p.status === 'atrasado' || p.status === 'vencido').length,
      criticos: pendentes.filter(p => p.status === 'critico').length,
    };
  }, [parcelas]);

  const handleToggle = async (p: Parcela) => {
    const key = `${p.vendaId}-${p.index}`;
    setMarcando(key);
    try { await marcarParcela(p.vendaId, p.index, !p.pago); } catch {}
    setMarcando(null);
  };

  if (loadingVendas || loadingPag) return <div className="flex items-center justify-center py-20 text-content-secondary">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="A receber" value={formatCurrency(resumo.total)} />
        <Card label="Próximos" value={String(resumo.proximos)} className="text-yellow-400" />
        <Card label="Atrasados" value={String(resumo.atrasados)} className="text-red-400" />
        <Card label="Críticos" value={String(resumo.criticos)} className="text-red-300" />
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar cliente, vendedor ou pedido..."
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            className="flex-1 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-border-medium focus:outline-none"
          />
          <button onClick={() => setShowFiltros(!showFiltros)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${showFiltros ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-border-subtle bg-surface text-content-secondary hover:bg-elevated'}`}>
            <Filter size={14} />
            <ChevronDown size={12} className={`transition-transform ${showFiltros ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {showFiltros && (
          <div className="flex gap-1.5 flex-wrap">
            {(['todos', 'em_dia', 'proximo', 'vencido', 'atrasado', 'critico', 'pago'] as const).map(s => {
              const cfg = s === 'todos' ? null : STATUS_CONFIG[s];
              const active = filtroStatus === s;
              return (
                <button key={s} onClick={() => setFiltroStatus(s)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${active ? 'bg-purple-500 text-white' : 'bg-surface text-content-secondary hover:bg-elevated'}`}>
                  {s === 'todos' ? 'Todos' : cfg!.label}
                  <span className="ml-1 opacity-60">
                    {s === 'todos' ? parcelas.length : parcelas.filter(p => p.status === s).length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-subtle py-12 text-center">
          <p className="text-sm text-content-muted">Nenhuma parcela encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cfg = STATUS_CONFIG[p.status];
            const Icon = cfg.icon;
            const key = `${p.vendaId}-${p.index}`;
            return (
              <div key={key} className={`rounded-lg border border-border-subtle bg-surface p-3 flex items-center gap-3 transition-colors ${p.pago ? 'opacity-50' : ''}`}>
                {/* Status icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center`}>
                  <Icon size={14} className={cfg.color} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{p.clienteNome}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-content-muted mt-0.5 flex-wrap">
                    <span>#{p.pedidoNumero}</span>
                    <span>·</span>
                    <span>{p.index + 1}/{p.total}</span>
                    <span>·</span>
                    <span>{new Date(p.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    {isAdmin && <><span>·</span><span>{p.vendedorNome}</span></>}
                  </div>
                </div>

                {/* Valor + ação */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold">{formatCurrency(p.valor)}</span>
                  <button
                    onClick={() => handleToggle(p)}
                    disabled={marcando === key}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      p.pago
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-border-medium hover:border-green-500 hover:bg-green-500/10'
                    } ${marcando === key ? 'opacity-50' : ''}`}
                  >
                    {p.pago && <Check size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <p className="text-xs text-content-muted">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${className || ''}`}>{value}</p>
    </div>
  );
}
