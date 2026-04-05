import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { Navigate } from 'react-router';
import { createCiclo, fecharCiclo, editarCiclo } from '~/services/ciclos.service';
import { formatCurrency } from '~/utils/format';
import type { Ciclo, CicloProduto, Produto, User } from '~/models';
import { userIsAdmin, userIsVendedor, userCanAccessAdmin } from '~/models';
import { useProdutos, useCiclos, useUsers } from '~/hooks/useRealtime';
import { Plus, Minus, X, Package, ChevronDown, ChevronRight, Lock, Unlock, Pencil } from 'lucide-react';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const PECAS_POR_PACOTE = 15;

export default function CiclosPage() {
  const { user } = useAuth();
  const { ciclos, loading: ciclosLoading } = useCiclos();
  const { users: allUsers, loading: usersLoading } = useUsers();
  const { produtos, loading: produtosLoading } = useProdutos();
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
  const [editCicloId, setEditCicloId] = useState<string | null>(null);
  const [editItens, setEditItens] = useState<{ produtoId: string; pacotes: number }[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editErro, setEditErro] = useState('');
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

  if (!user || !userCanAccessAdmin(user)) return <Navigate to="/vendas" replace />;
  if (loading) return <div className="flex items-center justify-center py-20 text-content-secondary">Carregando...</div>;

  const vendedoresComCiclo = vendedores.map(v => {
    const uid = v.uid || v.id;
    const ciclosV = ciclos.filter(c => c.vendedorId === uid);
    const ativo = ciclosV.find(c => c.status === 'ativo');
    const fechados = ciclosV.filter(c => c.status === 'fechado');
    return { ...v, uid, ativo, fechados, total: ciclosV.length };
  });

  const addItem = () => setItensCiclo([...itensCiclo, { produtoId: '', pacotes: 1 }]);
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
      await createCiclo(vendedorId, vendedor.nome, prodsCiclo);
      setShowForm(false);
      setVendedorId('');
      setItensCiclo([]);
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
                      {v.ativo ? 'Ciclo ativo' : 'Sem ciclo ativo'} · {v.fechados.length} fechado{v.fechados.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {expandedVendedor === v.uid ? <ChevronDown size={16} className="text-content-muted" /> : <ChevronRight size={16} className="text-content-muted" />}
              </button>

              {expandedVendedor === v.uid && (
                <div className="border-t border-border-subtle p-3 space-y-3">
                  {/* Ciclo ativo */}
                  {v.ativo && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-400">Ciclo ativo</span>
                        <div className="flex items-center gap-2">
                          {editCicloId !== v.ativo.id && (
                            <button onClick={() => startEdit(v.ativo!)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Editar ciclo">
                              <Pencil size={13} />
                            </button>
                          )}
                          <span className="text-[10px] text-content-muted">Desde {new Date(v.ativo.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      {editCicloId === v.ativo.id ? (
                        <div className="rounded-lg border border-blue-500/30 bg-elevated p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-400">Editando ciclo</span>
                            <button onClick={cancelEdit} className="text-content-muted hover:text-content"><X size={14} /></button>
                          </div>
                          {editItens.map((item, i) => {
                            const prod = produtos.find(p => p.id === item.produtoId);
                            const cicloP = v.ativo!.produtos.find(p => p.produtoId === item.produtoId);
                            const vendidas = cicloP ? cicloP.pecasInicial - cicloP.pecasAtual : 0;
                            const minPacotes = Math.ceil(vendidas / PECAS_POR_PACOTE);
                            const estoqueGeral = prod ? prod.estoque : 0;
                            const pecasOriginais = cicloP ? cicloP.pecasInicial : 0;
                            const maxPecas = estoqueGeral + pecasOriginais;
                            const maxPacotes = Math.floor(maxPecas / PECAS_POR_PACOTE);
                            const jaUsados = editItens.filter((it, j) => j !== i && it.produtoId).map(it => it.produtoId);
                            const produtosDisp = produtos.filter(p => p.estoque >= 15 || p.id === item.produtoId).filter(p => !jaUsados.includes(p.id));
                            return (
                              <div key={i} className="rounded-lg border border-border-subtle bg-surface p-2.5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <select value={item.produtoId} onChange={e => editUpdateItem(i, 'produtoId', e.target.value)}
                                    className={`${input} flex-1 text-xs !py-2`}>
                                    <option value="">Produto...</option>
                                    {produtosDisp.map(p => (
                                      <option key={p.id} value={p.id}>{p.modelo} ({p.referencia})</option>
                                    ))}
                                  </select>
                                  {editItens.length > 1 && (
                                    <button onClick={() => editRemoveItem(i)} className="text-red-500/40 hover:text-red-500"><X size={14} /></button>
                                  )}
                                </div>
                                {item.produtoId && (
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-0">
                                      <button type="button" onClick={() => editUpdateItem(i, 'pacotes', Math.max(minPacotes || 1, item.pacotes - 1))}
                                        className="rounded-l-lg border border-border-subtle bg-elevated px-2 py-1.5 text-content-secondary hover:bg-border-medium transition-colors"><Minus size={12} /></button>
                                      <span className="border-y border-border-subtle bg-elevated px-3 py-1.5 text-xs font-semibold min-w-[2.5rem] text-center">{item.pacotes}</span>
                                      <button type="button" onClick={() => editUpdateItem(i, 'pacotes', Math.min(maxPacotes, item.pacotes + 1))}
                                        className="rounded-r-lg border border-border-subtle bg-elevated px-2 py-1.5 text-content-secondary hover:bg-border-medium transition-colors"><Plus size={12} /></button>
                                    </div>
                                    <span className="text-[10px] text-content-muted">pct · {item.pacotes * 15} pçs</span>
                                    {vendidas > 0 && <span className="text-[10px] text-yellow-400">mín {minPacotes} pct ({vendidas} vendidas)</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <button onClick={editAddItem} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                            <Plus size={14} /> Adicionar produto
                          </button>
                          {editErro && <p className="text-xs text-red-400">{editErro}</p>}
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={cancelEdit} className="rounded-lg border border-border-subtle bg-elevated py-2 text-xs font-medium text-content-secondary hover:bg-border-medium transition">Cancelar</button>
                            <button onClick={handleEditar} disabled={editSaving || editItens.every(i => !i.produtoId)}
                              className="rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-500 transition disabled:opacity-30">
                              {editSaving ? 'Salvando...' : 'Salvar alterações'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-elevated p-2">
                          <p className="text-xs text-content-muted">Vendido</p>
                          <p className="text-sm font-bold text-green-400">{totalVendidoPacotes(v.ativo)}/{totalPacotesInicial(v.ativo)} pct</p>
                          <p className="text-[10px] text-content-muted">{totalVendidoPecas(v.ativo)} pçs</p>
                        </div>
                        <div className="rounded-lg bg-elevated p-2">
                          <p className="text-xs text-content-muted">Valor vendido</p>
                          <p className="text-sm font-bold text-green-400">{formatCurrency(totalVendidoValor(v.ativo))}</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border-subtle">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border-subtle bg-elevated text-left text-content-muted">
                              <th className="px-2 py-1.5">Modelo</th>
                              <th className="px-2 py-1.5 text-center">Vendido</th>
                              <th className="px-2 py-1.5 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.ativo.produtos.map((p, i) => {
                              const vendidoPecas = p.pecasInicial - p.pecasAtual;
                              const vendidoPct = Math.floor(vendidoPecas / PECAS_POR_PACOTE);
                              const avulsos = vendidoPecas % PECAS_POR_PACOTE;
                              return (
                                <tr key={i} className="border-b border-border-subtle last:border-0">
                                  <td className="px-2 py-1.5 font-medium">{p.modelo}</td>
                                  <td className="px-2 py-1.5 text-center text-green-400">{vendidoPct}/{p.pacotesInicial} pct{avulsos > 0 ? <span className="text-content-muted"> +{avulsos}</span> : ''}</td>
                                  <td className="px-2 py-1.5 text-right text-green-400">{formatCurrency(vendidoPecas * p.valorUnitario)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={() => handleFechar(v.ativo!.id)}
                        disabled={fecharLoading}
                        className={`w-full rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                          fecharClicks === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : fecharClicks === 1 ? 'bg-red-500/20 text-red-400'
                          : 'bg-red-600/30 text-red-300'
                        }`}
                      >
                        {fecharLabel}
                      </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Ciclos fechados */}
                  {v.fechados.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-content-muted">Fechados</span>
                      {v.fechados.map(c => (
                        <button key={c.id} onClick={() => { setModalCiclo(c); setFecharClicks(0); }}
                          className="w-full rounded-lg bg-elevated p-2 text-left hover:bg-border-medium transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')} — {c.closedAt ? new Date(c.closedAt).toLocaleDateString('pt-BR') : ''}</span>
                            <span className="text-green-400 font-medium">{formatCurrency(totalVendidoValor(c))} · {totalVendidoPacotes(c)}/{totalPacotesInicial(c)} pct</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal ciclo fechado */}
      {modalCiclo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalCiclo(null)}>
          <div className="w-full max-w-2xl rounded-xl border border-border-subtle bg-surface p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Ciclo — {modalCiclo.vendedorNome}</h3>
              <button onClick={() => setModalCiclo(null)} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-content-muted block">Período</span>{new Date(modalCiclo.createdAt).toLocaleDateString('pt-BR')} — {modalCiclo.closedAt ? new Date(modalCiclo.closedAt).toLocaleDateString('pt-BR') : ''}</div>
              <div><span className="text-xs text-content-muted block">Valor vendido</span><span className="text-green-400 font-semibold">{formatCurrency(totalVendidoValor(modalCiclo))}</span></div>
              <div><span className="text-xs text-content-muted block">Vendido</span>{totalVendidoPacotes(modalCiclo)}/{totalPacotesInicial(modalCiclo)} pct ({totalVendidoPecas(modalCiclo)} pçs)</div>
              <div><span className="text-xs text-content-muted block">Devolvido</span>{totalPecas(modalCiclo)} pçs</div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-elevated text-left text-content-muted">
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2 text-center">Vendido</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {modalCiclo.produtos.map((p, i) => {
                    const vendidoPecas = p.pecasInicial - p.pecasAtual;
                    const vendidoPct = Math.floor(vendidoPecas / PECAS_POR_PACOTE);
                    const avulsos = vendidoPecas % PECAS_POR_PACOTE;
                    return (
                      <tr key={i} className="border-b border-border-subtle last:border-0">
                        <td className="px-3 py-2 font-medium">{p.modelo}</td>
                        <td className="px-3 py-2 text-center text-green-400">{vendidoPct}/{p.pacotesInicial} pct{avulsos > 0 ? <span className="text-content-muted"> +{avulsos}</span> : ''}</td>
                        <td className="px-3 py-2 text-right text-green-400">{formatCurrency(vendidoPecas * p.valorUnitario)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
