import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { Navigate } from 'react-router';
import { createCiclo, fecharCiclo, editarCiclo, deleteCiclo, reabrirCiclo, updateCicloDatas, updateCicloMeta } from '~/services/ciclos.service';
import { formatCurrency } from '~/utils/format';
import type { Ciclo, CicloProduto, Produto, User } from '~/models';
import { userIsAdmin, userIsVendedor, userCanAccessAdmin } from '~/models';
import { useProdutos, useCiclos, useUsers, useVendas, useDespesas, useDepositos, useVales } from '~/hooks/useRealtime';
import { Plus, Minus, X, Package, ChevronDown, ChevronRight, Lock, Unlock, Pencil, Trash2 } from 'lucide-react';
import { CicloDashboard } from '~/components/ciclos/CicloDashboard';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const PECAS_POR_PACOTE = 15;

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
  const [showForm, setShowForm] = useState(false);
  const [vendedorId, setVendedorId] = useState('');
  const [itensCiclo, setItensCiclo] = useState<{ produtoId: string; pacotes: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);
  const [modalCiclo, setModalCiclo] = useState<Ciclo | null>(null);
  const [fecharClicks, setFecharClicks] = useState(0);
  const [fecharTimer, setFecharTimer] = useState<ReturnType<typeof setTimeout>>();
  const [fecharLoading, setFecharLoading] = useState(false);
  const [deleteClicks, setDeleteClicks] = useState(0);
  const [deleteTimer, setDeleteTimer] = useState<ReturnType<typeof setTimeout>>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [metaDataInicio, setMetaDataInicio] = useState('');
  const [metaDataFim, setMetaDataFim] = useState('');
  const [metaParticipantes, setMetaParticipantes] = useState<string[]>([]);
  const [metaSaving, setMetaSaving] = useState(false);
  const [editCicloId, setEditCicloId] = useState<string | null>(null);
  const [editItens, setEditItens] = useState<{ produtoId: string; pacotes: number }[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editErro, setEditErro] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState('');
  const [participantesIds, setParticipantesIds] = useState<string[]>([]);
  const [vendedorDropdown, setVendedorDropdown] = useState(false);
  const [vendedorBusca, setVendedorBusca] = useState('');
  const vendedorRef = useRef<HTMLDivElement>(null);
  const [produtoDropdowns, setProdutoDropdowns] = useState<Record<number, boolean>>({});
  const [produtoBuscas, setProdutoBuscas] = useState<Record<number, string>>({});
  const produtoRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  if (authLoading) return null;
  if (!user || !userCanAccessAdmin(user)) return <Navigate to="/vendas" replace />;
  if (loading) return <div className="flex items-center justify-center py-20 text-content-secondary">Carregando...</div>;

  const vendedoresComCiclo = vendedores.map(v => {
    const uid = v.uid || v.id;
    const ciclosV = ciclos.filter(c => c.vendedorId === uid);
    const ativo = ciclosV.find(c => c.status === 'ativo');
    const fechados = ciclosV.filter(c => c.status === 'fechado').sort((a, b) => (b.dataInicio || b.createdAt).localeCompare(a.dataInicio || a.createdAt));
    const maisRecente = ativo?.createdAt || fechados[0]?.createdAt || '';
    const todosC = [...(ativo ? [ativo] : []), ...fechados];
    const ids = new Set([uid, ...todosC.flatMap(c => (c.participantes || []).map(p => p.id))]);
    const totalVendido = vendas.filter(vv => {
      if ((vv as any).deletedAt) return false;
      if (todosC.some(c => (vv as any).cicloId === c.id)) return true;
      if (!ids.has(vv.vendedorId)) return false;
      return todosC.some(c => {
        const d = new Date(vv.data).toISOString().slice(0, 10);
        if (c.dataInicio && d < c.dataInicio) return false;
        if (c.dataFim && d > c.dataFim) return false;
        return true;
      });
    }).reduce((s, vv) => s + vv.valorTotal, 0);
    return { ...v, uid, ativo, fechados, total: ciclosV.length, maisRecente, totalVendido };
  }).sort((a, b) => b.maisRecente.localeCompare(a.maisRecente));

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
  const vendedorTemCicloAtivo = vendedorSelecionado?.ativo != null;

  const handleCriar = async () => {
    if (!vendedorId || itensCiclo.length === 0) return;
    const vendedor = vendedores.find(v => (v.uid || v.id) === vendedorId);
    if (!vendedor) return;

    const prodsCiclo = itensCiclo
      .filter(item => item.produtoId && item.pacotes > 0)
      .map(item => {
        const prod = produtos.find(p => p.id === item.produtoId)!;
        return {
          produtoId: prod.id,
          modelo: prod.modelo,
          referencia: prod.referencia,
          pacotes: item.pacotes,
          valorUnitario: prod.valor,
        };
      });

    if (prodsCiclo.length === 0) return;
    setSaving(true);
    setErro('');
    try {
      await createCiclo(vendedorId, vendedor.nome, prodsCiclo, dataInicio || undefined, dataFim || undefined,
        participantesIds.length > 0 ? participantesIds.map(pid => { const u = allUsers.find(x => (x.uid || x.id) === pid); return { id: pid, nome: u?.nome || '' }; }) : undefined
      );
      setShowForm(false);
      setVendedorId('');
      setItensCiclo([]);
      setDataInicio(new Date().toISOString().slice(0, 10));
      setDataFim('');
      setParticipantesIds([]);
      setExpandedVendedor(null);
    } catch (e: any) {
      setErro(e.message || 'Erro ao criar ciclo');
    } finally { setSaving(false); }
  };

  const startEdit = (ciclo: Ciclo) => {
    setEditCicloId(ciclo.id);
    setEditItens(ciclo.produtos.map(p => ({ produtoId: p.produtoId, pacotes: p.pacotesInicial })));
    setEditErro('');
  };

  const cancelEdit = () => { setEditCicloId(null); setEditItens([]); setEditErro(''); };

  const editAddItem = () => setEditItens([...editItens, { produtoId: '', pacotes: 1 }]);
  const editRemoveItem = (i: number) => setEditItens(editItens.filter((_, j) => j !== i));
  const editUpdateItem = (i: number, field: 'produtoId' | 'pacotes', value: string | number) => {
    setEditItens(editItens.map((item, j) => j === i ? { ...item, [field]: value } : item));
  };

  const handleEditar = async () => {
    if (!editCicloId) return;
    const prodsCiclo = editItens
      .filter(item => item.produtoId && item.pacotes > 0)
      .map(item => {
        const prod = produtos.find(p => p.id === item.produtoId)!;
        return { produtoId: prod.id, modelo: prod.modelo, referencia: prod.referencia, pacotes: item.pacotes, valorUnitario: prod.valor };
      });
    if (prodsCiclo.length === 0) return;
    setEditSaving(true);
    setEditErro('');
    try {
      await editarCiclo(editCicloId, prodsCiclo);
      cancelEdit();
    } catch (e: any) {
      setEditErro(e.message || 'Erro ao editar ciclo');
    } finally { setEditSaving(false); }
  };

  const handleFechar = async (cicloId: string) => {
    const clicks = fecharClicks + 1;
    clearTimeout(fecharTimer);
    if (clicks >= 3) {
      setFecharClicks(0);
      setFecharLoading(true);
      try {
        await fecharCiclo(cicloId);
        setModalCiclo(null);
      } catch (e: any) {
        setErro(e.message);
      } finally {
        setFecharLoading(false);
      }
    } else {
      setFecharClicks(clicks);
      setFecharTimer(setTimeout(() => setFecharClicks(0), 3000));
    }
  };

  const fecharLabel = fecharLoading ? 'Aguarde...' : fecharClicks === 0 ? 'Fechar ciclo' : fecharClicks === 1 ? 'Tem certeza?' : 'Confirmar!';

  const handleDelete = async (cicloId: string) => {
    const clicks = deleteClicks + 1;
    clearTimeout(deleteTimer);
    if (clicks >= 3) {
      setDeleteClicks(0);
      setDeleteLoading(true);
      try {
        await deleteCiclo(cicloId);
        setModalCiclo(null);
      } catch (e: any) {
        setErro(e.message);
      } finally {
        setDeleteLoading(false);
      }
    } else {
      setDeleteClicks(clicks);
      setDeleteTimer(setTimeout(() => setDeleteClicks(0), 3000));
    }
  };

  const deleteLabel = deleteLoading ? 'Aguarde...' : deleteClicks === 0 ? 'Apagar ciclo' : deleteClicks === 1 ? 'Tem certeza?' : 'Confirmar!';

  const prods = (c: Ciclo) => c.produtos || [];
  const totalPecas = (c: Ciclo) => prods(c).reduce((s, p) => s + p.pecasAtual, 0);
  const totalPacotesInicial = (c: Ciclo) => prods(c).reduce((s, p) => s + p.pacotesInicial, 0);
  const totalVendidoPecas = (c: Ciclo) => prods(c).reduce((s, p) => s + (p.pecasInicial - p.pecasAtual), 0);
  const totalVendidoPacotes = (c: Ciclo) => Math.floor(totalVendidoPecas(c) / PECAS_POR_PACOTE);
  const totalVendidoValor = (c: Ciclo) => prods(c).reduce((s, p) => s + (p.pecasInicial - p.pecasAtual) * p.valorUnitario, 0);

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <div className="mb-4">
        {!showForm && (
          <button onClick={() => { setShowForm(true); addItem(); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-blue-400 active:scale-95">
            <Plus size={18} /> Novo Ciclo
          </button>
        )}
      </div>

      {/* Form novo ciclo */}
      {showForm && (
        <div className="rounded-lg border border-blue-500/30 bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-400">Novo ciclo</span>
            <button onClick={() => { setShowForm(false); setErro(''); }} className="text-content-muted hover:text-content"><X size={16} /></button>
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
                          disabled={!!v.ativo}
                          onClick={() => { if (!v.ativo) { setVendedorId(v.uid); setVendedorDropdown(false); setVendedorBusca(''); } }}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            v.ativo ? 'opacity-40 cursor-not-allowed' : vendedorId === v.uid ? 'bg-blue-500/10' : 'hover:bg-surface-hover'
                          }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            v.ativo ? 'bg-red-500/10 text-red-400' : vendedorId === v.uid ? 'bg-blue-500/20 text-blue-400' : 'bg-elevated text-content-secondary'
                          }`}>
                            {v.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${vendedorId === v.uid ? 'text-blue-400' : ''}`}>{v.nome}</p>
                            <p className="text-[10px] text-content-muted">@{v.username}</p>
                          </div>
                          {v.ativo && <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-medium shrink-0">Ciclo ativo</span>}
                          {vendedorId === v.uid && !v.ativo && <span className="text-blue-400 shrink-0">✓</span>}
                        </button>
                      ))}
                    {vendedoresComCiclo.filter(v => v.nome.toLowerCase().includes(vendedorBusca.toLowerCase())).length === 0 && (
                      <p className="px-3 py-4 text-xs text-content-muted text-center">Nenhum vendedor encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {vendedorTemCicloAtivo && <p className="text-xs text-red-400 mt-1">Este vendedor já possui um ciclo ativo.</p>}
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

          {/* Participantes adicionais */}
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
            <select value="" onChange={e => { if (e.target.value && !participantesIds.includes(e.target.value)) setParticipantesIds([...participantesIds, e.target.value]); e.target.value = ''; }} className={input}>
              <option value="">Adicionar pessoa...</option>
              {allUsers.filter(u => !u.deletedAt && (u.uid || u.id) !== vendedorId && !participantesIds.includes(u.uid || u.id)).map(u => (
                <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
              ))}
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
              const produtosFiltrados = busca
                ? produtosDisp.filter(p => p.modelo.toLowerCase().includes(busca.toLowerCase()) || (p.referencia || '').toLowerCase().includes(busca.toLowerCase()))
                : produtosDisp;
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
                                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                                      item.produtoId === p.id ? 'bg-blue-500/10' : 'hover:bg-surface-hover'
                                    }`}>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-sm font-medium truncate ${item.produtoId === p.id ? 'text-blue-400' : ''}`}>{p.modelo}</p>
                                      <p className="text-[10px] text-content-muted">{p.referencia} · {formatCurrency(p.valor)}/un</p>
                                    </div>
                                    <span className="text-xs text-content-secondary bg-surface px-2 py-0.5 rounded-md shrink-0">{pctDisp} pct</span>
                                    {item.produtoId === p.id && <span className="text-blue-400 shrink-0">✓</span>}
                                  </button>
                                );
                              })}
                              {produtosFiltrados.length === 0 && (
                                <p className="px-3 py-4 text-xs text-content-muted text-center">Nenhum produto disponível</p>
                              )}
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
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
              <Plus size={14} /> Adicionar produto
            </button>
          </div>

          {erro && <p className="text-xs text-red-400">{erro}</p>}

          <button onClick={handleCriar} disabled={saving || !vendedorId || vendedorTemCicloAtivo || itensCiclo.every(i => !i.produtoId)}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition disabled:opacity-30">
            {saving ? 'Criando...' : 'Criar Ciclo'}
          </button>
        </div>
      )}

      {/* Lista por vendedor */}
      {vendedoresComCiclo.filter(v => v.total > 0).length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-border-subtle py-12 text-center">
          <Package size={32} className="mx-auto mb-2 text-content-muted opacity-30" />
          <p className="text-sm text-content-muted">Nenhum ciclo criado ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vendedoresComCiclo.filter(v => v.total > 0).map(v => (
            <div key={v.uid} className="rounded-lg border border-border-subtle bg-surface overflow-hidden">
              <button
                onClick={() => setExpandedVendedor(expandedVendedor === v.uid ? null : v.uid)}
                className="w-full flex items-center justify-between p-3 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  {v.ativo ? <Unlock size={14} className="text-green-400" /> : <Lock size={14} className="text-content-muted" />}
                  <div className="text-left">
                    <span className="text-sm font-medium">{v.nome}</span>
                    <p className="text-xs text-content-muted">
                      {v.ativo ? 'Ciclo ativo' : 'Sem ciclo ativo'} · {v.fechados.length} fechado{v.fechados.length !== 1 ? 's' : ''} · <span className="text-green-400">{formatCurrency(v.totalVendido)}</span>
                    </p>
                  </div>
                </div>
                {expandedVendedor === v.uid ? <ChevronDown size={16} className="text-content-muted" /> : <ChevronRight size={16} className="text-content-muted" />}
              </button>

              {expandedVendedor === v.uid && (
                <div className="border-t border-border-subtle p-3 space-y-1.5">
                  {/* Ciclo ativo */}
                  {v.ativo && (() => {
                    const ca = v.ativo!;
                    const ids = new Set([ca.vendedorId, ...(ca.participantes || []).map(p => p.id)]);
                    const cv = vendas.filter(vv => {
                      if ((vv as any).deletedAt) return false;
                      if ((vv as any).cicloId === ca.id) return true;
                      if (!ids.has(vv.vendedorId)) return false;
                      const d = new Date(vv.data).toISOString().slice(0, 10);
                      if (ca.dataInicio && d < ca.dataInicio) return false;
                      if (ca.dataFim && d > ca.dataFim) return false;
                      return true;
                    });
                    const cvTotal = cv.reduce((s, vv) => s + vv.valorTotal, 0);
                    const cvPecas = cv.reduce((s, vv) => s + vv.produtos.reduce((ss, p) => ss + ((p as any).tipo === 'unidade' ? p.quantidade : p.quantidade * PECAS_POR_PACOTE), 0), 0);
                    return (
                    <button onClick={() => { setModalCiclo(ca); setFecharClicks(0); setDeleteClicks(0); }}
                      className="w-full rounded-lg bg-green-500/5 border border-green-500/20 p-2 text-left hover:bg-green-500/10 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-green-400 font-medium">Ativo</span>
                          <span className="text-content-muted">{ca.dataInicio ? new Date(ca.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : new Date(ca.createdAt).toLocaleDateString('pt-BR')} — em aberto</span>
                        </div>
                        <span className="text-green-400 font-medium">{formatCurrency(cvTotal)} · {Math.floor(cvPecas / PECAS_POR_PACOTE)}/{totalPacotesInicial(ca)} pct</span>
                      </div>
                    </button>
                    );
                  })()}

                  {/* Ciclos fechados */}
                  {v.fechados.map(c => {
                    const cv = vendas.filter(vv => {
                      if ((vv as any).deletedAt) return false;
                      if ((vv as any).cicloId === c.id) return true;
                      const ids = new Set([c.vendedorId, ...(c.participantes || []).map(p => p.id)]);
                      if (!ids.has(vv.vendedorId)) return false;
                      const d = new Date(vv.data).toISOString().slice(0, 10);
                      if (c.dataInicio && d < c.dataInicio) return false;
                      if (c.dataFim && d > c.dataFim) return false;
                      return true;
                    });
                    const cvTotal = cv.reduce((s, vv) => s + vv.valorTotal, 0);
                    const cvPecas = cv.reduce((s, vv) => s + vv.produtos.reduce((ss, p) => ss + ((p as any).tipo === 'unidade' ? p.quantidade : p.quantidade * PECAS_POR_PACOTE), 0), 0);
                    return (
                      <button key={c.id} onClick={() => { setModalCiclo(c); setFecharClicks(0); setDeleteClicks(0); }}
                        className="w-full rounded-lg bg-elevated p-2 text-left hover:bg-border-medium transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <Lock size={10} className="text-content-muted" />
                            <span className="text-content-muted">Fechado</span>
                            <span>{c.dataInicio ? new Date(c.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : new Date(c.createdAt).toLocaleDateString('pt-BR')} — {c.dataFim ? new Date(c.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : c.closedAt ? new Date(c.closedAt).toLocaleDateString('pt-BR') : ''}</span>
                          </div>
                          <span className="text-green-400 font-medium">{formatCurrency(cvTotal)} · {Math.floor(cvPecas / PECAS_POR_PACOTE)}/{totalPacotesInicial(c)} pct</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal ciclo fechado */}
      {modalCiclo && (
        <div className="fixed inset-0 lg:left-64 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalCiclo(null)}>
          <div className="w-full max-w-2xl rounded-xl border border-border-subtle bg-surface p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Ciclo — {modalCiclo.vendedorNome}</h3>
                {modalCiclo.participantes && modalCiclo.participantes.length > 0 && (
                  <p className="text-[10px] text-content-muted">+ {modalCiclo.participantes.map(p => p.nome).join(', ')}</p>
                )}
              </div>
              <button onClick={() => setModalCiclo(null)} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-content-muted block">Período</span>{modalCiclo.dataInicio ? new Date(modalCiclo.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : new Date(modalCiclo.createdAt).toLocaleDateString('pt-BR')} — {modalCiclo.dataFim ? new Date(modalCiclo.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : modalCiclo.closedAt ? new Date(modalCiclo.closedAt).toLocaleDateString('pt-BR') : 'em aberto'}</div>
              <div><span className="text-xs text-content-muted block">Status</span><span className={modalCiclo.status === 'ativo' ? 'text-green-400' : 'text-content-muted'}>{modalCiclo.status === 'ativo' ? 'Ativo' : 'Fechado'}</span></div>
            </div>

            {/* Dashboard do ciclo */}
            <CicloDashboard ciclo={modalCiclo} vendas={vendas} despesas={despesas} depositos={depositos} valeCards={valeCards} />

            {/* Editar ciclo */}
            {userIsAdmin(user) && (
              <button onClick={() => {
                setEditMetaOpen(true);
                setMetaDataInicio(modalCiclo.dataInicio || modalCiclo.createdAt?.slice(0, 10) || '');
                setMetaDataFim(modalCiclo.dataFim || '');
                setMetaParticipantes((modalCiclo.participantes || []).map(p => p.id));
              }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-2 text-xs font-medium transition-colors">
                <Pencil size={13} /> Editar ciclo
              </button>
            )}

            {/* Fechar ciclo ativo */}
            {userIsAdmin(user) && modalCiclo.status === 'ativo' && (
              <button
                onClick={() => handleFechar(modalCiclo.id)}
                disabled={fecharLoading}
                className={`w-full rounded-lg py-2.5 text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                  fecharClicks === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : fecharClicks === 1 ? 'bg-red-500/20 text-red-400'
                  : 'bg-red-600/30 text-red-300'
                }`}>
                <Lock size={13} /> {fecharLabel}
              </button>
            )}

            {/* Reabrir ciclo fechado */}
            {userIsAdmin(user) && modalCiclo.status === 'fechado' && (
              <button onClick={async () => { await reabrirCiclo(modalCiclo.id); setModalCiclo(null); }}
                className="w-full rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
                <Unlock size={13} /> Reabrir ciclo
              </button>
            )}

            {userIsAdmin(user) && (
              <button
                onClick={() => handleDelete(modalCiclo.id)}
                disabled={deleteLoading}
                className={`w-full rounded-lg py-2.5 text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                  deleteClicks === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : deleteClicks === 1 ? 'bg-red-500/20 text-red-400'
                  : 'bg-red-600/30 text-red-300'
                }`}
              >
                <Trash2 size={13} /> {deleteLabel}
              </button>
            )}
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-content-muted mb-1 block">Data início</label>
                <input type="date" value={metaDataInicio} onChange={e => setMetaDataInicio(e.target.value)} className={input} />
                <p className="text-[9px] text-content-muted mt-0.5">Vazio = data de criação</p>
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Data fim</label>
                <input type="date" value={metaDataFim} onChange={e => setMetaDataFim(e.target.value)} className={input} />
                <p className="text-[9px] text-content-muted mt-0.5">Vazio = até agora. Se passado, fecha o ciclo.</p>
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
                    dataInicio: metaDataInicio || undefined,
                    dataFim: metaDataFim || undefined,
                    participantes: metaParticipantes.map(pid => { const u = allUsers.find(x => (x.uid || x.id) === pid); return { id: pid, nome: u?.nome || '' }; }),
                  });
                  setEditMetaOpen(false);
                  setModalCiclo(null);
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
