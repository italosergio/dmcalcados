import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Plus, Users, Search, LayoutGrid, List, MapPin, Phone, ArrowUpDown, ChevronDown, X as XIcon } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { ClienteModal } from '~/components/clientes/ClienteModal';
import { useClientes, useVendas, useUsers } from '~/hooks/useRealtime';
import { updateCliente, compartilharCliente } from '~/services/clientes.service';
import { useAuth } from '~/contexts/AuthContext';
import { formatCurrency } from '~/utils/format';
import type { Cliente, Venda, User } from '~/models';
import { userIsAdmin, userIsVendedor } from '~/models';

export default function ClientesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const allowed = !authLoading && user && userIsAdmin(user);

  useEffect(() => { if (!authLoading && !allowed) navigate('/vendas'); }, [authLoading, allowed]);

  const { clientes: clientesRaw, loading: clientesLoading } = useClientes();
  const { vendas, loading: vendasLoading } = useVendas();
  const { users, loading: usersLoading } = useUsers();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const loading = clientesLoading || vendasLoading || usersLoading;
  const [search, setSearch] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('clientes-view') as 'cards' | 'tabela') || 'cards';
    return 'cards';
  });
  const location = useLocation();
  const [filtroNovos, setFiltroNovos] = useState(false);
  const [ordenacao, setOrdenacao] = useState<'nome' | '+compras' | '-compras'>('nome');
  const [filtroModelo, setFiltroModelo] = useState('');
  const [modeloDropdown, setModeloDropdown] = useState(false);
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const modeloRef = useRef<HTMLDivElement>(null);

  if (!allowed) return null;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (modeloRef.current && !modeloRef.current.contains(e.target as Node)) setModeloDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFiltroNovos(params.get('novos') === '1');
  }, [location.search]);

  const changeViewMode = (mode: 'cards' | 'tabela') => {
    setViewMode(mode);
    localStorage.setItem('clientes-view', mode);
  };

  useEffect(() => { setClientes(clientesRaw); }, [clientesRaw]);

  const vendedores = useMemo(() => users.filter(u => userIsVendedor(u)), [users]);
  const clienteTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    vendas.forEach(v => { if (!v.deletedAt) totals[v.clienteId] = (totals[v.clienteId] || 0) + v.valorTotal; });
    return totals;
  }, [vendas]);
  const clienteVendasCount = useMemo(() => {
    const counts: Record<string, number> = {};
    vendas.forEach(v => { if (!v.deletedAt) counts[v.clienteId] = (counts[v.clienteId] || 0) + 1; });
    return counts;
  }, [vendas]);

  const handleCompartilhar = useCallback(async (clienteId: string, userIds: string[]) => {
    await compartilharCliente(clienteId, userIds);
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, compartilhadoCom: userIds } : c));
  }, []);

  const handleSaveEdit = useCallback(async (clienteId: string, data: Partial<Cliente>) => {
    await updateCliente(clienteId, data);
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, ...data } : c));
    setClienteSelecionado(prev => prev && prev.id === clienteId ? { ...prev, ...data } : prev);
  }, []);

  const limite30dias = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d;
  }, []);
  const limite6meses = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6); d.setHours(0,0,0,0); return d;
  }, []);
  const isNovo = (c: Cliente) => c.createdAt && new Date(c.createdAt) >= limite30dias;

  const clienteUltimaCompra = useMemo(() => {
    const map: Record<string, Date> = {};
    vendas.forEach(v => {
      if (!v.deletedAt) {
        const d = new Date(v.data);
        if (!map[v.clienteId] || d > map[v.clienteId]) map[v.clienteId] = d;
      }
    });
    return map;
  }, [vendas]);

  const isInativo = (c: Cliente) => {
    const ultima = clienteUltimaCompra[c.id];
    return ultima ? ultima < limite6meses : false;
  };

  // Modelos únicos extraídos das vendas
  const modelosUnicos = useMemo(() => {
    const set = new Set<string>();
    vendas.forEach(v => { if (!v.deletedAt) v.produtos.forEach(p => set.add(p.modelo)); });
    return Array.from(set).sort();
  }, [vendas]);

  // Clientes que compraram determinado modelo
  const clientesPorModelo = useMemo(() => {
    if (!filtroModelo) return null;
    const ids = new Set<string>();
    vendas.forEach(v => { if (!v.deletedAt && v.produtos.some(p => p.modelo === filtroModelo)) ids.add(v.clienteId); });
    return ids;
  }, [vendas, filtroModelo]);

  const filtered = clientes
    .filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))
    .filter(c => !filtroNovos || isNovo(c))
    .filter(c => !clientesPorModelo || clientesPorModelo.has(c.id))
    .filter(c => {
      if (!filtroDataInicio && !filtroDataFim) return true;
      const dt = c.createdAt ? new Date(c.createdAt) : null;
      if (!dt) return false;
      if (filtroDataInicio && dt < new Date(filtroDataInicio + 'T00:00:00')) return false;
      if (filtroDataFim && dt > new Date(filtroDataFim + 'T23:59:59')) return false;
      return true;
    })
    .sort((a, b) => {
      if (ordenacao === '+compras') return (clienteTotals[b.id] || 0) - (clienteTotals[a.id] || 0);
      if (ordenacao === '-compras') return (clienteTotals[a.id] || 0) - (clienteTotals[b.id] || 0);
      return a.nome.localeCompare(b.nome);
    });
  const totalVendido = Object.values(clienteTotals).reduce((s, v) => s + v, 0);

  const temFiltroAtivo = filtroNovos || ordenacao !== 'nome' || filtroModelo || filtroDataInicio || filtroDataFim || search;

  const mensagemFiltroVazio = useMemo(() => {
    const partes: string[] = [];
    if (search) partes.push(`com o nome "${search}"`);
    if (filtroNovos) partes.push('cadastrados nos últimos 30 dias');
    if (filtroModelo) partes.push(`que compraram ${filtroModelo}`);
    if (ordenacao === '+compras') partes.push('ordenados por quem mais comprou');
    if (ordenacao === '-compras') partes.push('ordenados por quem menos comprou');
    if (filtroDataInicio && filtroDataFim) {
      partes.push(`cadastrados de ${new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`);
    } else if (filtroDataInicio) {
      partes.push(`cadastrados a partir de ${new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}`);
    } else if (filtroDataFim) {
      partes.push(`cadastrados até ${new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`);
    }
    if (partes.length === 0) return '';
    return `Nenhum cliente encontrado ${partes.join(', ')}`;
  }, [search, filtroNovos, filtroModelo, ordenacao, filtroDataInicio, filtroDataFim]);

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
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Clientes</p>
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
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFiltroNovos(!filtroNovos)}
          className={`rounded-md px-2.5 py-1 text-[10px] font-medium border transition ${filtroNovos ? 'bg-green-600/10 text-green-400 border-green-600/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'}`}>
          Novos
        </button>
        <button onClick={() => setOrdenacao(o => o === '+compras' ? '-compras' : '+compras')}
          className={`rounded-md px-2.5 py-1 text-[10px] font-medium border transition flex items-center gap-1 ${ordenacao !== 'nome' ? 'bg-blue-600/10 text-blue-400 border-blue-600/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'}`}>
          <ArrowUpDown size={10} />
          {ordenacao === '+compras' ? 'que mais comprou' : ordenacao === '-compras' ? 'que menos comprou' : 'Compras'}
        </button>
        {/* Modelo dropdown */}
        <div className="relative" ref={modeloRef}>
          <button onClick={() => setModeloDropdown(!modeloDropdown)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-medium border transition flex items-center gap-1 ${filtroModelo ? 'bg-purple-600/10 text-purple-400 border-purple-600/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'}`}>
            {filtroModelo || 'Modelo'}
            <ChevronDown size={10} />
          </button>
          {modeloDropdown && (
            <div className="absolute z-50 mt-1 left-0 w-48 max-h-48 overflow-y-auto rounded-lg border border-border-subtle bg-elevated shadow-lg">
              {filtroModelo && (
                <button onClick={() => { setFiltroModelo(''); setModeloDropdown(false); }}
                  className="w-full px-3 py-1.5 text-left text-[10px] text-red-400 hover:bg-surface-hover border-b border-border-subtle">Limpar</button>
              )}
              {modelosUnicos.map(m => (
                <button key={m} onClick={() => { setFiltroModelo(m); setModeloDropdown(false); }}
                  className={`w-full px-3 py-1.5 text-left text-[10px] hover:bg-surface-hover transition-colors ${filtroModelo === m ? 'text-purple-400 bg-purple-500/10' : 'text-content'}`}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-content-muted/30 hidden sm:inline">│</span>
        <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)}
          className={`rounded-md border bg-elevated px-1.5 py-1 text-[10px] focus:outline-none focus:border-border-medium w-[6.5rem] transition-colors ${filtroDataInicio ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        <span className="text-[10px] text-content-muted">até</span>
        <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)}
          className={`rounded-md border bg-elevated px-1.5 py-1 text-[10px] focus:outline-none focus:border-border-medium w-[6.5rem] transition-colors ${filtroDataFim ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        {(filtroNovos || ordenacao !== 'nome' || filtroModelo || filtroDataInicio || filtroDataFim) && (
          <button onClick={() => { setFiltroNovos(false); setOrdenacao('nome'); setFiltroModelo(''); setFiltroDataInicio(''); setFiltroDataFim(''); }}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition flex items-center gap-1">
            <XIcon size={10} /> Limpar
          </button>
        )}
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && !temFiltroAtivo && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhum cliente encontrado</p>
          <p className="mb-6 text-sm text-content-muted">Cadastre seu primeiro cliente</p>
          <button onClick={() => navigate('/clientes/novo')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
            <Plus size={20} /> Cadastrar Primeiro Cliente
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && temFiltroAtivo && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <Search size={40} className="mx-auto mb-3 text-content-muted opacity-40" />
          <p className="mb-2 text-sm sm:text-base font-medium">{mensagemFiltroVazio}</p>
          <p className="mb-4 text-xs text-content-muted">Tente ajustar os filtros ou limpar a busca</p>
          <button onClick={() => { setFiltroNovos(false); setOrdenacao('nome'); setFiltroModelo(''); setFiltroDataInicio(''); setFiltroDataFim(''); setSearch(''); }}
            className="rounded-lg border border-border-subtle bg-elevated px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map(cliente => (
            <div key={cliente.id} className="rounded-xl border border-border-subtle bg-surface p-3 cursor-pointer hover:border-border-medium transition-colors flex flex-col justify-between" onClick={() => setClienteSelecionado(cliente)}>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold truncate">
                  {cliente.nome}
                </h3>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {isNovo(cliente) && <span className="text-[9px] bg-green-500/15 text-green-400 px-1 py-0.5 rounded font-medium">Novo</span>}
                  {cliente.suspenso && <span className="text-[9px] bg-red-500/15 text-red-400 px-1 py-0.5 rounded font-medium">Suspenso</span>}
                  {isInativo(cliente) && !cliente.suspenso && <span className="text-[9px] bg-yellow-500/15 text-yellow-400 px-1 py-0.5 rounded font-medium">Inativo</span>}
                </div>
                {(cliente.endereco || cliente.cidade) && (
                  <p className="text-[10px] text-content-muted truncate flex items-center gap-1 mt-1"><MapPin size={10} className="shrink-0" />{[cliente.cidade, cliente.estado].filter(Boolean).join('/')}</p>
                )}
                {(cliente.contatos?.length ? cliente.contatos : cliente.contato ? [cliente.contato] : []).slice(0, 1).map((c, i) => (
                  <p key={i} className="text-[10px] text-content-muted truncate flex items-center gap-1"><Phone size={10} className="shrink-0" />{c}</p>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-green-400">{formatCurrency(clienteTotals[cliente.id] || 0)}</p>
                <p className="text-[10px] text-content-muted">{clienteVendasCount[cliente.id] || 0} compra(s)</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {!loading && filtered.length > 0 && viewMode === 'tabela' && (
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto flex-1">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col className="w-[40%] sm:w-[35%]" />
                <col className="hidden sm:table-column w-[25%]" />
                <col className="hidden sm:table-column w-[15%]" />
                <col className="w-[30%] sm:w-[25%]" />
              </colgroup>
              <thead className="sticky top-0 z-[1]">
                <tr className="border-b border-border-subtle bg-elevated/95 backdrop-blur-sm">
                  <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Nome</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Cidade</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Compras</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(cliente => (
                  <tr key={cliente.id} onClick={() => setClienteSelecionado(cliente)} className="cursor-pointer hover:bg-surface-hover transition-colors">
                    <td className="px-3 py-2.5 overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {cliente.nome}
                        {isNovo(cliente) && <span className="ml-1.5 text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-medium">Novo</span>}
                        {cliente.suspenso && <span className="ml-1.5 text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-medium">Suspenso</span>}
                        {isInativo(cliente) && !cliente.suspenso && <span className="ml-1.5 text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded font-medium">Inativo</span>}
                      </p>
                      {cliente.cpfCnpj && <p className="text-[10px] text-content-muted truncate">{cliente.cpfCnpj}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-content-secondary truncate hidden sm:table-cell">{[cliente.cidade, cliente.estado].filter(Boolean).join('/') || '—'}</td>
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
          onNavigateVenda={(vendaId) => navigate('/vendas', { state: { vendaId } })}
          user={user} vendedores={vendedores}
          onEdit={handleSaveEdit} onShare={handleCompartilhar} />
      )}
    </div>
  );
}
