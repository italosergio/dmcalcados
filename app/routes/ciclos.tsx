import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { Navigate } from 'react-router';
import { createCiclo, fecharCiclo, editarCiclo, deleteCiclo, reabrirCiclo, updateCicloDatas, updateCicloMeta } from '~/services/ciclos.service';
import { formatCurrency } from '~/utils/format';
import type { Ciclo, CicloProduto, Produto, User } from '~/models';
import { userIsAdmin, userIsVendedor, userCanAccessAdmin } from '~/models';
import { useProdutos, useCiclos, useUsers, useVendas, useDespesas, useDepositos, useVales } from '~/hooks/useRealtime';
import { Plus, Minus, X, Package, ChevronDown, ChevronRight, Lock, Unlock, Pencil, Trash2, MoreVertical, Search, ArrowUpDown, Calendar, Users, TrendingUp, TrendingDown, DollarSign, Banknote, Landmark, Filter } from 'lucide-react';
import { CicloDashboard } from '~/components/ciclos/CicloDashboard';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const PECAS_POR_PACOTE = 15;

type SortKey = 'recente' | 'vendas' | 'despesas' | 'saldo' | 'avista' | 'externo' | 'depositos';

// Helper: calcula métricas de um ciclo
function calcMetricas(ciclo: Ciclo, vendas: any[], despesas: any[], depositos: any[], valeCards: any[]) {
  const participanteIds = new Set([ciclo.vendedorId, ...(ciclo.participantes || []).map((p: any) => p.id)]);

  const vendasCiclo = vendas.filter(v => {
    if (v.deletedAt) return false;
    if (v.cicloId === ciclo.id) return true;
    if (!participanteIds.has(v.vendedorId)) return false;
    const d = new Date(v.data).toISOString().slice(0, 10);
    if (ciclo.dataInicio && d < ciclo.dataInicio) return false;
    if (ciclo.dataFim && d > ciclo.dataFim) return false;
    return true;
  });

  const despesasCiclo = despesas.filter(d => {
    if (d.deletedAt) return false;
    if (d.cicloId === ciclo.id) return true;
    if (!participanteIds.has(d.usuarioId)) {
      const rateio = d.rateio as any[] | undefined;
      if (!rateio?.some((r: any) => participanteIds.has(r.usuarioId))) return false;
    }
    const dt = new Date(d.data).toISOString().slice(0, 10);
    if (ciclo.dataInicio && dt < ciclo.dataInicio) return false;
    if (ciclo.dataFim && dt > ciclo.dataFim) return false;
    return true;
  });

  const depositosCiclo = depositos.filter(dep => {
    if (dep.deletedAt) return false;
    if (dep.cicloId === ciclo.id) return true;
    if (!participanteIds.has(dep.depositanteId)) return false;
    const d = dep.data?.slice(0, 10);
    if (ciclo.dataInicio && d < ciclo.dataInicio) return false;
    if (ciclo.dataFim && d > ciclo.dataFim) return false;
    return true;
  });

  const totalVendas = vendasCiclo.reduce((s: number, v: any) => s + v.valorTotal, 0);
  const totalAvista = vendasCiclo.filter((v: any) => v.condicaoPagamento === 'avista').reduce((s: number, v: any) => s + v.valorTotal, 0)
    + vendasCiclo.filter((v: any) => v.condicaoPagamento?.includes('_entrada')).reduce((s: number, v: any) => s + (v.valorAvista || 0), 0);
  const totalDespesas = despesasCiclo.reduce((s: number, d: any) => s + d.valor, 0);
  const despesasExterno = despesasCiclo.reduce((s: number, d: any) => {
    const fp = d.fontePagamento;
    if (fp === 'misto') return s + (d.valorExterno || 0);
    if (fp === 'caixa_externo') return s + d.valor;
    return s;
  }, 0);
  const totalDepositos = depositosCiclo.reduce((s: number, d: any) => s + d.valor, 0);
  const qtdVendas = vendasCiclo.length;
  const totalPctInicial = (ciclo.produtos || []).reduce((s: number, p: any) => s + (p.pacotesInicial || 0), 0);
  const pecasVendidas = vendasCiclo.reduce((s: number, v: any) => s + (v.produtos || []).reduce((ss: number, p: any) => ss + (p.tipo === 'unidade' ? p.quantidade : p.quantidade * PECAS_POR_PACOTE), 0), 0);
  const pctVendidos = Math.floor(pecasVendidas / PECAS_POR_PACOTE);
  const saldo = totalVendas - totalDespesas;

  // Dados por dia para sparkline
  const porDia: Record<string, { v: number; d: number }> = {};
  vendasCiclo.forEach((v: any) => {
    const dia = new Date(v.data).toISOString().slice(0, 10);
    if (!porDia[dia]) porDia[dia] = { v: 0, d: 0 };
    porDia[dia].v += v.valorTotal;
  });
  despesasCiclo.forEach((d: any) => {
    const dia = new Date(d.data).toISOString().slice(0, 10);
    if (!porDia[dia]) porDia[dia] = { v: 0, d: 0 };
    porDia[dia].d += d.valor;
  });
  const dias = Object.keys(porDia).sort();
  const sparkline = dias.map(dia => ({ ...porDia[dia], dia: parseInt(dia.slice(8, 10)), fullDate: dia }));

  const diasComVenda = dias.filter(d => porDia[d].v > 0).length;
  const mediaPorDia = diasComVenda > 0 ? totalVendas / diasComVenda : 0;

  return { totalVendas, totalAvista, totalDespesas, despesasExterno, totalDepositos, saldo, qtdVendas, totalPctInicial, pctVendidos, sparkline, mediaPorDia, diasComVenda };
}

export default function CiclosPage() {
  const { user, loading: authLoading } = useAuth();
  const { ciclos, loading: ciclosLoading } = useCiclos();
  const { users: allUsers, loading: usersLoading } = useUsers();
  const { produtos, loading: produtosLoading } = useProdutos();
  const { vendas } = useVendas();
  const { despesas } = useDespesas();
  const { depositos } = useDepositos();
  const { valeCards } = useVales();
  const vendedores = allUsers.filter(u => userIsVendedor(u));
  const loading = ciclosLoading || usersLoading || produtosLoading;

  // Form novo ciclo
  const [showForm, setShowForm] = useState(false);
  const [vendedorId, setVendedorId] = useState('');
  const [itensCiclo, setItensCiclo] = useState<{ produtoId: string; pacotes: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [tituloCiclo, setTituloCiclo] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState('');
  const [participantesIds, setParticipantesIds] = useState<string[]>([]);
  const [vendedorDropdown, setVendedorDropdown] = useState(false);
  const [vendedorBusca, setVendedorBusca] = useState('');
  const vendedorRef = useRef<HTMLDivElement>(null);
  const [produtoDropdowns, setProdutoDropdowns] = useState<Record<number, boolean>>({});
  const [produtoBuscas, setProdutoBuscas] = useState<Record<number, string>>({});
  const produtoRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Modal ciclo
  const [modalCiclo, setModalCiclo] = useState<Ciclo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fecharClicks, setFecharClicks] = useState(0);
  const [fecharTimer, setFecharTimer] = useState<ReturnType<typeof setTimeout>>();
  const [fecharLoading, setFecharLoading] = useState(false);
  const [deleteClicks, setDeleteClicks] = useState(0);
  const [deleteTimer, setDeleteTimer] = useState<ReturnType<typeof setTimeout>>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [metaDataInicio, setMetaDataInicio] = useState('');
  const [metaTitulo, setMetaTitulo] = useState('');
  const [metaDataFim, setMetaDataFim] = useState('');
  const [metaParticipantes, setMetaParticipantes] = useState<string[]>([]);
  const [metaSaving, setMetaSaving] = useState(false);
  const [editCicloId, setEditCicloId] = useState<string | null>(null);
  const [editItens, setEditItens] = useState<{ produtoId: string; pacotes: number }[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editErro, setEditErro] = useState('');

  // Filtros e ordenação
  const [sortKey, setSortKey] = useState<SortKey>('recente');
  const [filtroPessoa, setFiltroPessoa] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (vendedorRef.current && !vendedorRef.current.contains(e.target as Node)) setVendedorDropdown(false);
      Object.entries(produtoRefs.current).forEach(([k, el]) => {
        if (el && !el.contains(e.target as Node)) setProdutoDropdowns(prev => ({ ...prev, [+k]: false }));
      });
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Pessoas com conflito de datas
  const pessoasComConflito = useMemo(() => {
    const novoInicio = dataInicio || new Date().toISOString().slice(0, 10);
    const map: Record<string, string> = {};
    for (const c of ciclos) {
      const cInicio = c.dataInicio || c.createdAt?.slice(0, 10);
      const cFim = c.dataFim;
      const pessoaIds = [c.vendedorId, ...(c.participantes || []).map((p: { id: string }) => p.id)];
      for (const pid of pessoaIds) {
        if (map[pid]) continue;
        if (c.status === 'ativo' && !cFim) {
          map[pid] = `Ciclo ativo desde ${cInicio?.split('-').reverse().join('/')}`;
        } else if (c.status === 'ativo' || cFim) {
          const fim = cFim || '9999-12-31';
          const temConflito = dataFim ? (novoInicio <= fim && dataFim >= (cInicio || '')) : (novoInicio <= fim);
          if (temConflito) {
            const de = cInicio?.split('-').reverse().join('/');
            const ate = cFim?.split('-').reverse().join('/');
            map[pid] = ate ? `Em ciclo de ${de} a ${ate}` : `Ciclo ativo desde ${de}`;
          }
        }
      }
    }
    return map;
  }, [ciclos, dataInicio, dataFim]);

  // Ciclos com métricas
  const ciclosComMetricas = useMemo(() => {
    return ciclos.map(c => ({
      ...c,
      metricas: calcMetricas(c, vendas as any[], despesas as any[], depositos as any[], valeCards as any[]),
    }));
  }, [ciclos, vendas, despesas, depositos, valeCards]);

  // Filtrar e ordenar
  const filtrarEOrdenar = (lista: typeof ciclosComMetricas) => {
    let result = [...lista];
    if (filtroPessoa) {
      const q = filtroPessoa.toLowerCase();
      result = result.filter(c => {
        if (c.vendedorNome.toLowerCase().includes(q)) return true;
        return (c.participantes || []).some((p: any) => p.nome.toLowerCase().includes(q));
      });
    }
    if (filtroDataInicio) result = result.filter(c => (c.dataFim || c.closedAt?.slice(0, 10) || '9999') >= filtroDataInicio);
    if (filtroDataFim) result = result.filter(c => (c.dataInicio || c.createdAt?.slice(0, 10) || '') <= filtroDataFim);

    const sortFns: Record<SortKey, (a: typeof result[0], b: typeof result[0]) => number> = {
      recente: (a, b) => (b.dataInicio || b.createdAt).localeCompare(a.dataInicio || a.createdAt),
      vendas: (a, b) => b.metricas.totalVendas - a.metricas.totalVendas,
      despesas: (a, b) => b.metricas.totalDespesas - a.metricas.totalDespesas,
      saldo: (a, b) => b.metricas.saldo - a.metricas.saldo,
      avista: (a, b) => b.metricas.totalAvista - a.metricas.totalAvista,
      externo: (a, b) => b.metricas.despesasExterno - a.metricas.despesasExterno,
      depositos: (a, b) => b.metricas.totalDepositos - a.metricas.totalDepositos,
    };
    result.sort(sortFns[sortKey]);
    return result;
  };

  const ciclosAtivos = useMemo(() => filtrarEOrdenar(ciclosComMetricas.filter(c => c.status === 'ativo')), [ciclosComMetricas, sortKey, filtroPessoa, filtroDataInicio, filtroDataFim]);
  const ciclosFechados = useMemo(() => filtrarEOrdenar(ciclosComMetricas.filter(c => c.status === 'fechado')), [ciclosComMetricas, sortKey, filtroPessoa, filtroDataInicio, filtroDataFim]);

  if (authLoading) return null;
  if (!user || !userCanAccessAdmin(user)) return <Navigate to="/vendas" replace />;
  if (loading) return <div className="flex items-center justify-center py-20 text-content-secondary">Carregando...</div>;

  const vendedoresComCiclo = vendedores.map(v => {
    const uid = v.uid || v.id;
    return { ...v, uid };
  });

  const addItem = () => {
    setItensCiclo(prev => [...prev, { produtoId: '', pacotes: 1 }]);
    const idx = itensCiclo.length;
    setTimeout(() => {
      const el = produtoRefs.current[idx];
      if (el) { const inp = el.querySelector('input'); if (inp) inp.focus(); }
    }, 100);
  };
  const removeItem = (i: number) => setItensCiclo(itensCiclo.filter((_, j) => j !== i));
  const updateItem = (i: number, field: 'produtoId' | 'pacotes', value: string | number) => {
    setItensCiclo(itensCiclo.map((item, j) => j === i ? { ...item, [field]: value } : item));
  };

  const vendedorSelecionado = vendedoresComCiclo.find(v => v.uid === vendedorId);

  const handleCriar = async () => {
    if (!vendedorId || itensCiclo.length === 0) return;
    const vendedor = vendedores.find(v => (v.uid || v.id) === vendedorId);
    if (!vendedor) return;
    const prodsCiclo = itensCiclo.filter(item => item.produtoId && item.pacotes > 0).map(item => {
      const prod = produtos.find(p => p.id === item.produtoId)!;
      return { produtoId: prod.id, modelo: prod.modelo, referencia: prod.referencia, pacotes: item.pacotes, valorUnitario: prod.valor };
    });
    if (prodsCiclo.length === 0) return;
    setSaving(true); setErro('');
    try {
      await createCiclo(vendedorId, vendedor.nome, prodsCiclo, dataInicio || undefined, dataFim || undefined,
        participantesIds.length > 0 ? participantesIds.map(pid => { const u = allUsers.find(x => (x.uid || x.id) === pid); return { id: pid, nome: u?.nome || '' }; }) : undefined,
        tituloCiclo.trim() || undefined
      );
      setShowForm(false); setVendedorId(''); setItensCiclo([]); setDataInicio(new Date().toISOString().slice(0, 10)); setDataFim(''); setParticipantesIds([]); setTituloCiclo('');
    } catch (e: any) { setErro(e.message || 'Erro ao criar ciclo'); }
    finally { setSaving(false); }
  };

  const startEdit = (ciclo: Ciclo) => { setEditCicloId(ciclo.id); setEditItens(ciclo.produtos.map(p => ({ produtoId: p.produtoId, pacotes: p.pacotesInicial }))); setEditErro(''); };
  const cancelEdit = () => { setEditCicloId(null); setEditItens([]); setEditErro(''); };
  const editAddItem = () => setEditItens([...editItens, { produtoId: '', pacotes: 1 }]);
  const editRemoveItem = (i: number) => setEditItens(editItens.filter((_, j) => j !== i));
  const editUpdateItem = (i: number, field: 'produtoId' | 'pacotes', value: string | number) => {
    setEditItens(editItens.map((item, j) => j === i ? { ...item, [field]: value } : item));
  };

  const handleEditar = async () => {
    if (!editCicloId) return;
    const prodsCiclo = editItens.filter(item => item.produtoId && item.pacotes > 0).map(item => {
      const prod = produtos.find(p => p.id === item.produtoId)!;
      return { produtoId: prod.id, modelo: prod.modelo, referencia: prod.referencia, pacotes: item.pacotes, valorUnitario: prod.valor };
    });
    if (prodsCiclo.length === 0) return;
    setEditSaving(true); setEditErro('');
    try { await editarCiclo(editCicloId, prodsCiclo); cancelEdit(); }
    catch (e: any) { setEditErro(e.message || 'Erro ao editar ciclo'); }
    finally { setEditSaving(false); }
  };

  const handleFechar = async (cicloId: string) => {
    const clicks = fecharClicks + 1;
    clearTimeout(fecharTimer);
    if (clicks >= 3) {
      setFecharClicks(0); setFecharLoading(true);
      try { await fecharCiclo(cicloId); setModalCiclo(null); } catch (e: any) { setErro(e.message); }
      finally { setFecharLoading(false); }
    } else { setFecharClicks(clicks); setFecharTimer(setTimeout(() => setFecharClicks(0), 3000)); }
  };
  const fecharLabel = fecharLoading ? 'Aguarde...' : fecharClicks === 0 ? 'Fechar ciclo' : fecharClicks === 1 ? 'Tem certeza?' : 'Confirmar!';

  const handleDelete = async (cicloId: string) => {
    const clicks = deleteClicks + 1;
    clearTimeout(deleteTimer);
    if (clicks >= 3) {
      setDeleteClicks(0); setDeleteLoading(true);
      try { await deleteCiclo(cicloId); setConfirmDeleteOpen(false); setModalCiclo(null); } catch (e: any) { setErro(e.message); }
      finally { setDeleteLoading(false); }
    } else { setDeleteClicks(clicks); setDeleteTimer(setTimeout(() => setDeleteClicks(0), 3000)); }
  };
  const deleteLabel = deleteLoading ? 'Aguarde...' : deleteClicks === 0 ? 'Apagar ciclo' : deleteClicks === 1 ? 'Tem certeza?' : 'Confirmar!';

  const ativos = ciclosComMetricas.filter(c => c.status === 'ativo').length;
  const fechados = ciclosComMetricas.filter(c => c.status === 'fechado').length;

  const sortLabels: Record<SortKey, string> = {
    recente: 'Mais recente',
    vendas: 'Maior venda',
    despesas: 'Maior despesa',
    saldo: 'Melhor saldo',
    avista: 'Mais à vista',
    externo: 'Maior caixa externo',
    depositos: 'Mais depósitos',
  };

  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Ciclos</h1>
          <p className="text-xs text-content-muted">{ativos} ativo{ativos !== 1 ? 's' : ''} · {fechados} fechado{fechados !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFiltros(!showFiltros)}
            className={`p-1.5 rounded-lg transition-colors ${showFiltros ? 'bg-blue-500/10 text-blue-400' : 'bg-elevated text-content-muted hover:text-content'}`}>
            <Filter size={16} />
          </button>
          {!showForm && (
            <button onClick={() => { setShowForm(true); addItem(); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-blue-400 active:scale-95">
              <Plus size={16} /> Novo
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFiltros && (
        <div className="rounded-lg border border-border-subtle bg-surface p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
              <input value={filtroPessoa} onChange={e => setFiltroPessoa(e.target.value)} placeholder="Filtrar por pessoa..."
                className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-border-medium" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-content-muted mb-0.5 block">De</label>
              <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-elevated px-2.5 py-1.5 text-xs text-content focus:outline-none focus:border-border-medium" />
            </div>
            <div>
              <label className="text-[10px] text-content-muted mb-0.5 block">Até</label>
              <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-elevated px-2.5 py-1.5 text-xs text-content focus:outline-none focus:border-border-medium" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-content-muted mb-0.5 block">Ordenar por</label>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(sortLabels) as SortKey[]).map(k => (
                <button key={k} onClick={() => setSortKey(k)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${sortKey === k ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-elevated text-content-muted hover:text-content'}`}>
                  {sortLabels[k]}
                </button>
              ))}
            </div>
          </div>
          {(filtroPessoa || filtroDataInicio || filtroDataFim || sortKey !== 'recente') && (
            <button onClick={() => { setFiltroPessoa(''); setFiltroDataInicio(''); setFiltroDataFim(''); setSortKey('recente'); }}
              className="text-[10px] text-red-400 hover:text-red-300">Limpar filtros</button>
          )}
        </div>
      )}

      {/* Form novo ciclo */}
      {showForm && (
        <div className="rounded-lg border border-blue-500/30 bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-400">Novo ciclo</span>
            <button onClick={() => { setShowForm(false); setErro(''); }} className="text-content-muted hover:text-content"><X size={16} /></button>
          </div>

          <div>
            <label className="text-xs text-content-muted mb-1 block">Título do ciclo</label>
            <input value={tituloCiclo} onChange={e => setTituloCiclo(e.target.value)} placeholder="Ex: Rota Fortaleza, Maracanaú, Caucaia" className={input} />
          </div>

          <div>
            <label className="text-xs text-content-muted mb-1 block">Vendedor</label>
            <div ref={vendedorRef} className="relative">
              <button type="button" onClick={() => setVendedorDropdown(!vendedorDropdown)}
                className={`${input} text-left flex items-center justify-between ${vendedorId ? 'border-green-500/50' : ''}`}>
                <span className={vendedorId ? 'text-content' : 'text-content-muted'}>
                  {vendedorSelecionado ? vendedorSelecionado.nome : 'Selecione o vendedor...'}
                </span>
                <ChevronDown size={14} className={`text-content-muted transition-transform ${vendedorDropdown ? 'rotate-180' : ''}`} />
              </button>
              {vendedorDropdown && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-border-subtle bg-elevated shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-border-subtle">
                    <input value={vendedorBusca} onChange={e => setVendedorBusca(e.target.value)} placeholder="Buscar vendedor..."
                      className="w-full rounded-lg bg-surface px-3 py-2 text-xs text-content placeholder:text-content-muted focus:outline-none" autoFocus />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {vendedoresComCiclo
                      .filter(v => v.nome.toLowerCase().includes(vendedorBusca.toLowerCase()))
                      .map(v => (
                        <button key={v.uid} type="button"
                          disabled={!!pessoasComConflito[v.uid]}
                          onClick={() => { if (!pessoasComConflito[v.uid]) { setVendedorId(v.uid); setVendedorDropdown(false); setVendedorBusca(''); } }}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            pessoasComConflito[v.uid] ? 'opacity-40 cursor-not-allowed' : vendedorId === v.uid ? 'bg-blue-500/10' : 'hover:bg-surface-hover'
                          }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            pessoasComConflito[v.uid] ? 'bg-red-500/10 text-red-400' : vendedorId === v.uid ? 'bg-blue-500/20 text-blue-400' : 'bg-elevated text-content-secondary'
                          }`}>
                            {v.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${vendedorId === v.uid ? 'text-blue-400' : ''}`}>{v.nome}</p>
                            <p className="text-[10px] text-content-muted">{pessoasComConflito[v.uid] || `@${v.username}`}</p>
                          </div>
                          {pessoasComConflito[v.uid] && <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-medium shrink-0">Indisponível</span>}
                          {vendedorId === v.uid && !pessoasComConflito[v.uid] && <span className="text-blue-400 shrink-0">✓</span>}
                        </button>
                      ))}
                    {vendedoresComCiclo.filter(v => v.nome.toLowerCase().includes(vendedorBusca.toLowerCase())).length === 0 && (
                      <p className="px-3 py-4 text-xs text-content-muted text-center">Nenhum vendedor encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {vendedorId && pessoasComConflito[vendedorId] && <p className="text-xs text-red-400 mt-1">{pessoasComConflito[vendedorId]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-content-muted mb-1 block">Data início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={input} />
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Data fim (opcional)</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={input} />
            </div>
          </div>

          <div>
            <label className="text-xs text-content-muted mb-1 block">Participantes adicionais (opcional)</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {participantesIds.map(pid => {
                const u = allUsers.find(x => (x.uid || x.id) === pid);
                return (
                  <span key={pid} className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-lg">
                    {u?.nome || pid}
                    <button type="button" onClick={() => setParticipantesIds(prev => prev.filter(x => x !== pid))} className="hover:text-red-400"><X size={12} /></button>
                  </span>
                );
              })}
            </div>
            <select value="" onChange={e => { if (e.target.value && !participantesIds.includes(e.target.value) && !pessoasComConflito[e.target.value]) setParticipantesIds([...participantesIds, e.target.value]); e.target.value = ''; }} className={input}>
              <option value="">Adicionar pessoa...</option>
              {allUsers.filter(u => !u.deletedAt && (u.uid || u.id) !== vendedorId && !participantesIds.includes(u.uid || u.id)).map(u => {
                const uid = u.uid || u.id;
                const conflito = pessoasComConflito[uid];
                return <option key={uid} value={uid} disabled={!!conflito}>{u.nome}{conflito ? ` (${conflito})` : ''}</option>;
              })}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-content-muted block">Produtos (em pacotes de 15)</label>
            {itensCiclo.map((item, i) => {
              const prod = produtos.find(p => p.id === item.produtoId);
              const estoqueDisp = prod ? Math.floor(prod.estoque / 15) : 0;
              const jaUsados = itensCiclo.filter((it, j) => j !== i && it.produtoId).map(it => it.produtoId);
              const produtosDisp = produtos.filter(p => p.estoque >= 15 && !jaUsados.includes(p.id));
              const busca = produtoBuscas[i] || '';
              const produtosFiltrados = busca ? produtosDisp.filter(p => p.modelo.toLowerCase().includes(busca.toLowerCase()) || (p.referencia || '').toLowerCase().includes(busca.toLowerCase())) : produtosDisp;
              return (
                <div key={i} className="rounded-lg border border-border-subtle bg-elevated p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1" ref={el => { produtoRefs.current[i] = el; }}>
                      <div className="relative">
                        <button type="button" onClick={() => setProdutoDropdowns(prev => ({ ...prev, [i]: !prev[i] }))}
                          className={`${input} text-left flex items-center justify-between ${item.produtoId ? 'border-green-500/50' : ''}`}>
                          <span className={item.produtoId ? 'text-content' : 'text-content-muted'}>
                            {prod ? `${prod.modelo} (${prod.referencia})` : 'Selecione o produto...'}
                          </span>
                          <ChevronDown size={14} className={`text-content-muted transition-transform ${produtoDropdowns[i] ? 'rotate-180' : ''}`} />
                        </button>
                        {produtoDropdowns[i] && (
                          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border-subtle bg-elevated shadow-xl overflow-hidden">
                            <div className="p-2 border-b border-border-subtle">
                              <input value={busca} onChange={e => setProdutoBuscas(prev => ({ ...prev, [i]: e.target.value }))} placeholder="Buscar modelo ou referência..."
                                className="w-full rounded-lg bg-surface px-3 py-2 text-xs text-content placeholder:text-content-muted focus:outline-none" autoFocus />
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                              {produtosFiltrados.map(p => {
                                const pctDisp = Math.floor(p.estoque / 15);
                                return (
                                  <button key={p.id} type="button"
                                    onClick={() => { updateItem(i, 'produtoId', p.id); setProdutoDropdowns(prev => ({ ...prev, [i]: false })); setProdutoBuscas(prev => ({ ...prev, [i]: '' })); }}
                                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${item.produtoId === p.id ? 'bg-blue-500/10' : 'hover:bg-surface-hover'}`}>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-sm font-medium truncate ${item.produtoId === p.id ? 'text-blue-400' : ''}`}>{p.modelo}</p>
                                      <p className="text-[10px] text-content-muted">{p.referencia} · {formatCurrency(p.valor)}/un</p>
                                    </div>
                                    <span className="text-xs text-content-secondary bg-surface px-2 py-0.5 rounded-md shrink-0">{pctDisp} pct</span>
                                    {item.produtoId === p.id && <span className="text-blue-400 shrink-0">✓</span>}
                                  </button>
                                );
                              })}
                              {produtosFiltrados.length === 0 && <p className="px-3 py-4 text-xs text-content-muted text-center">Nenhum produto disponível</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {itensCiclo.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-500/40 hover:text-red-500 transition-colors"><X size={16} /></button>
                    )}
                  </div>
                  {item.produtoId && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0">
                        <button type="button" onClick={() => updateItem(i, 'pacotes', Math.max(1, item.pacotes - 1))}
                          className="rounded-l-lg border border-border-subtle bg-surface px-2.5 py-2 text-content-secondary hover:bg-border-medium transition-colors"><Minus size={14} /></button>
                        <span className="border-y border-border-subtle bg-surface px-4 py-2 text-sm font-semibold min-w-[3rem] text-center">{item.pacotes}</span>
                        <button type="button" onClick={() => updateItem(i, 'pacotes', Math.min(estoqueDisp || 99, item.pacotes + 1))}
                          className="rounded-r-lg border border-border-subtle bg-surface px-2.5 py-2 text-content-secondary hover:bg-border-medium transition-colors"><Plus size={14} /></button>
                      </div>
                      <span className="text-xs text-content-muted">pct</span>
                      <span className="text-xs text-content-secondary font-medium">{item.pacotes * 15} pçs</span>
                      {prod && <span className="text-[10px] text-content-muted ml-auto">máx {estoqueDisp} pct</span>}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"><Plus size={14} /> Adicionar produto</button>
          </div>

          {erro && <p className="text-xs text-red-400">{erro}</p>}
          <button onClick={handleCriar} disabled={saving || !vendedorId || !!pessoasComConflito[vendedorId] || itensCiclo.every(i => !i.produtoId)}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition disabled:opacity-30">
            {saving ? 'Criando...' : 'Criar Ciclo'}
          </button>
        </div>
      )}

      {/* Ciclos Ativos */}
      {ciclosAtivos.length > 0 && (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h2 className="text-sm font-semibold">Ativos ({ciclosAtivos.length})</h2>
        </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ciclosAtivos.map(c => {
              const m = c.metricas;
              const inicio = c.dataInicio ? new Date(c.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : new Date(c.createdAt).toLocaleDateString('pt-BR');
              const diasCiclo = Math.ceil((Date.now() - new Date(c.dataInicio || c.createdAt).getTime()) / 86400000);
              const pessoas = [c.vendedorNome, ...(c.participantes || []).map((p: any) => p.nome)];
              return (
                <button key={c.id} onClick={() => { setModalCiclo(c); setFecharClicks(0); setDeleteClicks(0); setMenuOpen(false); }}
                  className="w-full rounded-xl border border-green-500/20 bg-green-500/[0.03] p-4 text-left transition-all hover:border-green-500/40 hover:scale-[1.01] active:scale-[0.99]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                        <h3 className="text-sm font-bold truncate">{c.titulo || `${diasCiclo} dia${diasCiclo !== 1 ? 's' : ''}`}</h3>
                      </div>
                      {c.titulo && <p className="text-[10px] text-content-secondary">{diasCiclo} dia{diasCiclo !== 1 ? 's' : ''}</p>}
                      <p className="text-[10px] text-content-muted flex items-center gap-1"><Users size={10} /> {pessoas.join(', ')}</p>
                      <p className="text-[10px] text-content-muted mt-0.5 flex items-center gap-1"><Calendar size={10} /> {inicio} — em aberto</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-400">{formatCurrency(m.totalVendas)}</p>
                      <p className="text-xs font-bold text-red-400/70">{formatCurrency(m.totalDespesas)}</p>
                    </div>
                  </div>
                  {/* Sparkline */}
                  {m.sparkline.length > 1 && (() => {
                    const data = m.sparkline;
                    const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
                    const max = Math.max(...data.map((d: any) => Math.max(d.v, d.d)), 1);
                    const pad = 10; const w = 220; const h = 52; const bottom = 10; const left = 15; const right = 15;
                    const usable = w - left - right; const step = usable / (data.length - 1 || 1);
                    const y = (val: number) => pad + (h - bottom - pad) - (val / max) * (h - bottom - pad);
                    const line = (key: 'v' | 'd') => data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'}${left + i * step},${y(d[key])}`).join(' ');
                    const area = (key: 'v' | 'd') => line(key) + ` L${left + (data.length - 1) * step},${h - bottom} L${left},${h - bottom} Z`;
                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14 mb-1" preserveAspectRatio="none">
                        <path d={area('v')} fill="rgba(16,185,129,0.08)" />
                        <path d={line('v')} fill="none" stroke="#10b981" strokeWidth="1.5" />
                        <path d={area('d')} fill="rgba(239,68,68,0.08)" />
                        <path d={line('d')} fill="none" stroke="#ef4444" strokeWidth="1.5" />
                        {data.map((d: any, i: number) => {
                          const cx = left + i * step;
                          const wd = d.fullDate ? diasSemana[new Date(d.fullDate + 'T12:00:00').getDay()] : '';
                          return (
                            <g key={i}>
                              {d.v > 0 && (
                                <text x={cx} y={y(d.v) - 3} textAnchor="middle" fill="#10b981" fontSize="6" fontWeight="bold" fontFamily="sans-serif">{Math.round(d.v)}</text>
                              )}
                              <text x={cx} y={h - 1} textAnchor="middle" fill="#555" fontSize="6.5" fontFamily="sans-serif">{d.dia}-{wd}</text>
                              <title>Dia {d.dia} ({wd}): Vendas {formatCurrency(d.v)} · Despesas {formatCurrency(d.d)}</title>
                              <rect x={cx - step / 2} y={0} width={step} height={h} fill="transparent" />
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[9px] text-green-400"><span className="w-2 h-0.5 rounded bg-green-500 inline-block" /> Vendas</span>
                      <span className="flex items-center gap-1 text-[9px] text-red-400"><span className="w-2 h-0.5 rounded bg-red-500 inline-block" /> Despesas</span>
                    </div>
                    <span className={`text-xs font-bold ${m.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>Saldo {formatCurrency(m.saldo)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-content-muted">
                    <span>{m.qtdVendas} venda{m.qtdVendas !== 1 ? 's' : ''}</span>
                    <span>Média/dia {formatCurrency(m.mediaPorDia)}</span>
                    <span><Banknote size={9} className="inline" /> À vista {formatCurrency(m.totalAvista)}</span>
                    <span><Landmark size={9} className="inline" /> Dep {formatCurrency(m.totalDepositos)}</span>
                    {m.despesasExterno > 0 && <span>Cx ext {formatCurrency(m.despesasExterno)}</span>}
                    <span>{m.pctVendidos}/{m.totalPctInicial} pct</span>
                  </div>
                </button>
              );
            })}
          </div>
      </div>
      )}

      {/* Ciclos Fechados */}
      {ciclosFechados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-content-muted" />
            <h2 className="text-sm font-semibold text-content-secondary">Fechados ({ciclosFechados.length})</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ciclosFechados.map(c => {
              const m = c.metricas;
              const inicio = c.dataInicio ? new Date(c.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : new Date(c.createdAt).toLocaleDateString('pt-BR');
              const fim = c.dataFim ? new Date(c.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : c.closedAt ? new Date(c.closedAt).toLocaleDateString('pt-BR') : '';
              const fimDate = c.dataFim || c.closedAt?.slice(0, 10) || c.createdAt.slice(0, 10);
              const diasCiclo = Math.ceil((new Date(fimDate).getTime() - new Date(c.dataInicio || c.createdAt).getTime()) / 86400000) + 1;
              const pessoas = [c.vendedorNome, ...(c.participantes || []).map((p: any) => p.nome)];
              return (
                <button key={c.id} onClick={() => { setModalCiclo(c); setFecharClicks(0); setDeleteClicks(0); setMenuOpen(false); }}
                  className="w-full rounded-xl border border-border-subtle bg-surface p-4 text-left transition-all hover:border-border-medium hover:scale-[1.01] active:scale-[0.99]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold truncate">{c.titulo || `${diasCiclo} dia${diasCiclo !== 1 ? 's' : ''}`}</h3>
                      {c.titulo && <p className="text-[10px] text-content-secondary">{diasCiclo} dia{diasCiclo !== 1 ? 's' : ''}</p>}
                      <p className="text-[10px] text-content-muted flex items-center gap-1"><Users size={10} /> {pessoas.join(', ')}</p>
                      <p className="text-[10px] text-content-muted mt-0.5 flex items-center gap-1"><Calendar size={10} /> {inicio} — {fim}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-400">{formatCurrency(m.totalVendas)}</p>
                      <p className="text-xs font-bold text-red-400/70">{formatCurrency(m.totalDespesas)}</p>
                    </div>
                  </div>
                  {m.sparkline.length > 1 && (() => {
                    const data = m.sparkline;
                    const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
                    const max = Math.max(...data.map((d: any) => Math.max(d.v, d.d)), 1);
                    const pad = 10; const w = 220; const h = 52; const bottom = 10; const left = 15; const right = 15;
                    const usable = w - left - right; const step = usable / (data.length - 1 || 1);
                    const y = (val: number) => pad + (h - bottom - pad) - (val / max) * (h - bottom - pad);
                    const line = (key: 'v' | 'd') => data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'}${left + i * step},${y(d[key])}`).join(' ');
                    const area = (key: 'v' | 'd') => line(key) + ` L${left + (data.length - 1) * step},${h - bottom} L${left},${h - bottom} Z`;
                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14 mb-1" preserveAspectRatio="none">
                        <path d={area('v')} fill="rgba(16,185,129,0.08)" />
                        <path d={line('v')} fill="none" stroke="#10b981" strokeWidth="1.5" />
                        <path d={area('d')} fill="rgba(239,68,68,0.08)" />
                        <path d={line('d')} fill="none" stroke="#ef4444" strokeWidth="1.5" />
                        {data.map((d: any, i: number) => {
                          const cx = left + i * step;
                          const wd = d.fullDate ? diasSemana[new Date(d.fullDate + 'T12:00:00').getDay()] : '';
                          return (
                            <g key={i}>
                              {d.v > 0 && (
                                <text x={cx} y={y(d.v) - 3} textAnchor="middle" fill="#10b981" fontSize="6" fontWeight="bold" fontFamily="sans-serif">{Math.round(d.v)}</text>
                              )}
                              <text x={cx} y={h - 1} textAnchor="middle" fill="#555" fontSize="6.5" fontFamily="sans-serif">{d.dia}-{wd}</text>
                              <title>Dia {d.dia} ({wd}): Vendas {formatCurrency(d.v)} · Despesas {formatCurrency(d.d)}</title>
                              <rect x={cx - step / 2} y={0} width={step} height={h} fill="transparent" />
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[9px] text-green-400"><span className="w-2 h-0.5 rounded bg-green-500 inline-block" /> Vendas</span>
                      <span className="flex items-center gap-1 text-[9px] text-red-400"><span className="w-2 h-0.5 rounded bg-red-500 inline-block" /> Despesas</span>
                    </div>
                    <span className={`text-xs font-bold ${m.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>Saldo {formatCurrency(m.saldo)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-content-muted">
                    <span>{m.qtdVendas} venda{m.qtdVendas !== 1 ? 's' : ''}</span>
                    <span>Média/dia {formatCurrency(m.mediaPorDia)}</span>
                    <span><Banknote size={9} className="inline" /> À vista {formatCurrency(m.totalAvista)}</span>
                    <span><Landmark size={9} className="inline" /> Dep {formatCurrency(m.totalDepositos)}</span>
                    {m.despesasExterno > 0 && <span>Cx ext {formatCurrency(m.despesasExterno)}</span>}
                    <span>{m.pctVendidos}/{m.totalPctInicial} pct</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal ciclo */}
      {modalCiclo && (
        <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => { setModalCiclo(null); setMenuOpen(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl rounded-xl border border-border-subtle bg-surface p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{modalCiclo.titulo || `Ciclo — ${modalCiclo.vendedorNome}`}</h3>
                <p className="text-[10px] text-content-muted">{[modalCiclo.vendedorNome, ...(modalCiclo.participantes || []).map((p: any) => p.nome)].join(', ')}</p>
              </div>
              <div className="flex items-center gap-1">
                {userIsAdmin(user) && (
                  <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="text-content-muted hover:text-content p-1 rounded-lg hover:bg-elevated transition-colors"><MoreVertical size={18} /></button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border-subtle bg-elevated shadow-xl z-10 py-1">
                        <button onClick={() => {
                          setMenuOpen(false); setEditMetaOpen(true);
                          setMetaTitulo(modalCiclo.titulo || '');
                          setMetaDataInicio(modalCiclo.dataInicio || modalCiclo.createdAt?.slice(0, 10) || '');
                          setMetaDataFim(modalCiclo.dataFim || '');
                          setMetaParticipantes((modalCiclo.participantes || []).map((p: any) => p.id));
                        }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-content hover:bg-surface-hover transition-colors">
                          <Pencil size={13} /> Editar ciclo
                        </button>
                        {modalCiclo.status === 'fechado' && (
                          <button onClick={async () => { setMenuOpen(false); await reabrirCiclo(modalCiclo.id); setModalCiclo(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-400 hover:bg-surface-hover transition-colors">
                            <Unlock size={13} /> Reabrir ciclo
                          </button>
                        )}
                        <button onClick={() => { setMenuOpen(false); setConfirmDeleteOpen(true); setDeleteClicks(0); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-surface-hover transition-colors">
                          <Trash2 size={13} /> Apagar ciclo
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => { setModalCiclo(null); setMenuOpen(false); }} className="text-content-muted hover:text-content"><X size={18} /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-xs text-content-muted block">Período</span>{modalCiclo.dataInicio ? new Date(modalCiclo.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : new Date(modalCiclo.createdAt).toLocaleDateString('pt-BR')} — {modalCiclo.dataFim ? new Date(modalCiclo.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : modalCiclo.closedAt ? new Date(modalCiclo.closedAt).toLocaleDateString('pt-BR') : 'em aberto'}</div>
              <div><span className="text-xs text-content-muted block">Status</span><span className={modalCiclo.status === 'ativo' ? 'text-green-400' : 'text-content-muted'}>{modalCiclo.status === 'ativo' ? 'Ativo' : 'Fechado'}</span></div>
              <div><span className="text-xs text-content-muted block">Média/dia</span><span className="text-green-400 font-semibold">{formatCurrency(ciclosComMetricas.find(c => c.id === modalCiclo.id)?.metricas.mediaPorDia || 0)}</span></div>
            </div>
            <CicloDashboard ciclo={modalCiclo} vendas={vendas} despesas={despesas} depositos={depositos} valeCards={valeCards} />
            {userIsAdmin(user) && modalCiclo.status === 'ativo' && (
              <button onClick={() => handleFechar(modalCiclo.id)} disabled={fecharLoading}
                className={`w-full rounded-lg py-2.5 text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                  fecharClicks === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : fecharClicks === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
                }`}>
                <Lock size={13} /> {fecharLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDeleteOpen && modalCiclo && (
        <div className="fixed inset-0 lg:left-64 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => { setConfirmDeleteOpen(false); setDeleteClicks(0); }}>
          <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><Trash2 size={20} className="text-red-400" /></div>
              <h3 className="text-sm font-semibold">Apagar ciclo</h3>
              <p className="text-xs text-content-muted">Tem certeza que deseja apagar o ciclo de <span className="text-content font-medium">{modalCiclo.vendedorNome}</span>? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmDeleteOpen(false); setDeleteClicks(0); }}
                className="flex-1 rounded-lg bg-elevated py-2.5 text-xs font-medium text-content hover:bg-border-subtle transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(modalCiclo.id)} disabled={deleteLoading}
                className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                  deleteClicks === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : deleteClicks === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
                }`}>{deleteLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar ciclo meta */}
      {editMetaOpen && modalCiclo && (
        <div className="fixed inset-0 lg:left-64 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setEditMetaOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Editar Ciclo — {modalCiclo.vendedorNome}</span>
              <button onClick={() => setEditMetaOpen(false)} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Título do ciclo</label>
              <input value={metaTitulo} onChange={e => setMetaTitulo(e.target.value)} placeholder="Ex: Rota Fortaleza, Maracanaú, Caucaia" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-content-muted mb-1 block">Data início</label>
                <input type="date" value={metaDataInicio} onChange={e => setMetaDataInicio(e.target.value)} className={input} />
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Data fim</label>
                <input type="date" value={metaDataFim} onChange={e => setMetaDataFim(e.target.value)} className={input} />
              </div>
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Participantes</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg">{modalCiclo.vendedorNome} (principal)</span>
                {metaParticipantes.map(pid => {
                  const u = allUsers.find(x => (x.uid || x.id) === pid);
                  return (
                    <span key={pid} className="inline-flex items-center gap-1 bg-elevated text-content-secondary text-xs px-2 py-1 rounded-lg">
                      {u?.nome || pid}
                      <button type="button" onClick={() => setMetaParticipantes(prev => prev.filter(x => x !== pid))} className="hover:text-red-400"><X size={12} /></button>
                    </span>
                  );
                })}
              </div>
              <select value="" onChange={e => { if (e.target.value && !metaParticipantes.includes(e.target.value)) setMetaParticipantes([...metaParticipantes, e.target.value]); }} className={input}>
                <option value="">Adicionar pessoa...</option>
                {allUsers.filter(u => !u.deletedAt && (u.uid || u.id) !== modalCiclo.vendedorId && !metaParticipantes.includes(u.uid || u.id)).map(u => (
                  <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setEditMetaOpen(false)}
                className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-xs font-medium text-content-secondary hover:bg-border-medium transition">Cancelar</button>
              <button disabled={metaSaving} onClick={async () => {
                setMetaSaving(true);
                try {
                  await updateCicloMeta(modalCiclo.id, {
                    titulo: metaTitulo.trim() || undefined,
                    dataInicio: metaDataInicio || undefined,
                    dataFim: metaDataFim || undefined,
                    participantes: metaParticipantes.map(pid => { const u = allUsers.find(x => (x.uid || x.id) === pid); return { id: pid, nome: u?.nome || '' }; }),
                  });
                  setEditMetaOpen(false); setModalCiclo(null);
                } finally { setMetaSaving(false); }
              }}
                className="rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-30 transition">
                {metaSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
