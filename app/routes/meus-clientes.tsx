import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Plus, Users, Search, LayoutGrid, List, MapPin, Phone } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { ClienteModal } from '~/components/clientes/ClienteModal';
import { useVendas, useClientes } from '~/hooks/useRealtime';
import { useAuth } from '~/contexts/AuthContext';
import { formatCurrency } from '~/utils/format';
import type { Cliente, Venda } from '~/models';

export default function MeusClientesPage() {
  const { clientes: allClientes, loading: clientesLoading } = useClientes();
  const { vendas, loading: vendasLoading } = useVendas();
  const loading = clientesLoading || vendasLoading;
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [search, setSearch] = useState('');
  const [loading2, setLoading2] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('meus-clientes-view') as 'cards' | 'tabela') || 'cards';
    return 'cards';
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [filtroNovos, setFiltroNovos] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFiltroNovos(params.get('novos') === '1');
  }, [location.search]);

  const changeViewMode = (mode: 'cards' | 'tabela') => {
    setViewMode(mode);
    localStorage.setItem('meus-clientes-view', mode);
  };

  const clientes = useMemo(() => {
    if (!user) return allClientes;
    const uid = user.uid || user.id;
    return allClientes.filter(c => c.donoId === uid || (c.compartilhadoCom && c.compartilhadoCom.includes(uid)));
  }, [allClientes, user]);

  const clienteTotals = useMemo(() => {
    if (!user) return {};
    const uid = user.uid || user.id;
    const meusIds = new Set(clientes.map(c => c.id));
    const totals: Record<string, number> = {};
    vendas.forEach(v => {
      if (!v.deletedAt && v.vendedorId === uid && meusIds.has(v.clienteId))
        totals[v.clienteId] = (totals[v.clienteId] || 0) + v.valorTotal;
    });
    return totals;
  }, [vendas, clientes, user]);

  const clienteVendasCount = useMemo(() => {
    if (!user) return {};
    const uid = user.uid || user.id;
    const meusIds = new Set(clientes.map(c => c.id));
    const counts: Record<string, number> = {};
    vendas.forEach(v => {
      if (!v.deletedAt && v.vendedorId === uid && meusIds.has(v.clienteId))
        counts[v.clienteId] = (counts[v.clienteId] || 0) + 1;
    });
    return counts;
  }, [vendas, clientes, user]);

  const limite30dias = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d;
  }, []);
  const isNovo = (c: Cliente) => c.createdAt && new Date(c.createdAt) >= limite30dias;

  const filtered = clientes
    .filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))
    .filter(c => !filtroNovos || isNovo(c));
  const totalVendido = Object.values(clienteTotals).reduce((s, v) => s + v, 0);

  return (
    <div className={viewMode === 'tabela' ? 'flex flex-col h-[calc(100vh-4rem)] overflow-hidden' : ''}>
      {/* Header */}
      <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3">
        <div className="flex items-center sm:contents">
          <button onClick={() => navigate('/clientes/novo')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
            <Plus size={18} /> Novo Cliente
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800 !py-2 !px-2.5 sm:!px-3 sm:flex-1 sm:min-w-0">
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Meus Clientes</p>
            <p className="text-xs sm:text-base font-bold text-blue-400 leading-tight">{clientes.length}</p>
          </Card>
          <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-800 !py-2 !px-2.5 sm:!px-3 sm:flex-1 sm:min-w-0">
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Total vendido</p>
            <p className="text-xs sm:text-base font-bold text-green-400 leading-tight">{formatCurrency(totalVendido)}</p>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
          <input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2 text-xs text-content focus:outline-none focus:border-border-medium transition-colors" />
        </div>
        <button onClick={() => setFiltroNovos(!filtroNovos)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${filtroNovos ? 'bg-green-600/10 text-green-400 border-green-600/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'}`}>
          Novos
        </button>
        <div className="ml-auto flex items-center bg-elevated rounded-lg p-0.5">
          <button onClick={() => changeViewMode('cards')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => changeViewMode('tabela')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'tabela' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhum cliente encontrado</p>
          <p className="mb-6 text-sm text-content-muted">Seus clientes aparecerão aqui</p>
          <button onClick={() => navigate('/clientes/novo')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
            <Plus size={20} /> Cadastrar Cliente
          </button>
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div className="space-y-3">
          {filtered.map(cliente => (
            <div key={cliente.id} className="rounded-xl border border-border-subtle bg-surface p-3 sm:p-4 cursor-pointer hover:border-border-medium transition-colors" onClick={() => setClienteSelecionado(cliente)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">
                    {cliente.nome}
                    {isNovo(cliente) && <span className="ml-1.5 text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-medium">Novo</span>}
                  </h3>
                  {(cliente.endereco || cliente.cidade) && (
                    <p className="text-xs text-content-muted truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" />{[cliente.cidade, cliente.estado].filter(Boolean).join(' · ')}</p>
                  )}
                  {(cliente.contatos?.length ? cliente.contatos : cliente.contato ? [cliente.contato] : []).slice(0, 1).map((c, i) => (
                    <p key={i} className="text-xs text-content-muted flex items-center gap-1"><Phone size={12} className="shrink-0" />{c}</p>
                  ))}
                  {cliente.createdAt && <p className="text-[10px] text-content-muted">Desde {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-400">{formatCurrency(clienteTotals[cliente.id] || 0)}</p>
                  <p className="text-[10px] text-content-muted">{clienteVendasCount[cliente.id] || 0} compra(s)</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {!loading && filtered.length > 0 && viewMode === 'tabela' && (
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col min-h-0 flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-elevated/50">
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Nome</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Cidade</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Compras</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Total</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(cliente => (
                  <tr key={cliente.id} onClick={() => setClienteSelecionado(cliente)} className="cursor-pointer hover:bg-surface-hover transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-medium truncate max-w-[180px]">{cliente.nome}</p>
                      {cliente.createdAt && <p className="text-[10px] text-content-muted">Desde {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-content-secondary truncate max-w-[120px] hidden sm:table-cell">{[cliente.cidade, cliente.estado].filter(Boolean).join('/') || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-content-muted hidden sm:table-cell">{clienteVendasCount[cliente.id] || 0}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold text-right text-green-400 whitespace-nowrap">{formatCurrency(clienteTotals[cliente.id] || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalhe do cliente */}
      {clienteSelecionado && (
        <ClienteModal cliente={clienteSelecionado} vendas={vendas} onClose={() => setClienteSelecionado(null)}
          onNavigateVenda={(vendaId) => navigate('/vendas', { state: { vendaId } })} />
      )}
    </div>
  );
}
