import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Package, Footprints, Tag, Warehouse, Calendar, Pencil, Trash2, X, LayoutGrid, List, Search, ImageIcon, ShoppingCart, Check, MoreVertical } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { useProdutos, useVendas } from '~/hooks/useRealtime';
import { deleteProduto, updateProduto, getPrecoHistorico, type PrecoHistorico } from '~/services/produtos.service';
import { formatCurrency } from '~/utils/format';
import type { Produto, Venda } from '~/models';
import { useAuth } from '~/contexts/AuthContext';
import { userIsAdmin } from '~/models';

export default function ProdutosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const allowed = !authLoading && user && userIsAdmin(user);

  useEffect(() => { if (!authLoading && !allowed) navigate('/vendas'); }, [authLoading, allowed]);

  const { produtos, loading } = useProdutos();
  const { vendas } = useVendas();
  const [search, setSearch] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [precoHistorico, setPrecoHistorico] = useState<PrecoHistorico[]>([]);
  const [editandoPreco, setEditandoPreco] = useState(false);
  const [novoPreco, setNovoPreco] = useState('');
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = {} as Record<string, ReturnType<typeof setTimeout>>;
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('produtos-list-view') as 'cards' | 'tabela') || 'cards';
    return 'cards';
  });

  // Load price history when product selected
  useEffect(() => {
    if (produtoSelecionado) {
      getPrecoHistorico(produtoSelecionado.id).then(setPrecoHistorico);
    } else {
      setPrecoHistorico([]);
      setEditandoPreco(false);
    }
  }, [produtoSelecionado]);

  // Vendas deste produto
  const vendasDoProduto = useMemo(() => {
    if (!produtoSelecionado) return [];
    return vendas
      .filter(v => !v.deletedAt && v.produtos.some(p => p.produtoId === produtoSelecionado.id || p.modelo === produtoSelecionado.modelo))
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [produtoSelecionado, vendas]);

  const handleSalvarPreco = async () => {
    const valor = parseFloat(novoPreco.replace(',', '.'));
    if (!produtoSelecionado || isNaN(valor) || valor <= 0) return;
    await updateProduto(produtoSelecionado.id, { valor });
    setProdutoSelecionado({ ...produtoSelecionado, valor });
    setEditandoPreco(false);
    getPrecoHistorico(produtoSelecionado.id).then(setPrecoHistorico);
  };

  if (!allowed) return null;

  const changeViewMode = (mode: 'cards' | 'tabela') => {
    setViewMode(mode);
    localStorage.setItem('produtos-list-view', mode);
  };

  const filtered = produtos.filter(p =>
    (p.modelo || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.referencia || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = useCallback((id: string) => {
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      deleteProduto(id).then(() => setProdutoSelecionado(null));
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const deleteLabel = (id: string) => {
    const clicks = deleteClicks[id] || 0;
    if (clicks === 0) return 'Excluir';
    if (clicks === 1) return 'Tem certeza?';
    return 'Confirmar!';
  };

  const totalPares = produtos.reduce((s, p) => s + p.estoque, 0);
  const valorEstoque = produtos.reduce((s, p) => s + p.valor * p.estoque, 0);

  return (
    <div className={viewMode === 'tabela' ? 'flex flex-col h-[calc(100vh-4rem)] overflow-hidden' : ''}>
      {/* Header */}
      <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:items-stretch sm:gap-3">
        <div className="flex items-center">
          <button onClick={() => navigate('/produtos/novo')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95 sm:self-stretch">
            <Plus size={18} /> Novo Produto
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 ml-auto">
          <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-800 !py-2 !px-2.5 sm:!px-3 sm:max-w-[7rem]">
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Produtos</p>
            <p className="text-xs sm:text-base font-bold text-green-400 leading-tight">{produtos.length}</p>
          </Card>
          <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800 !py-2 !px-2.5 sm:!px-3 cursor-pointer hover:brightness-110 transition" onClick={() => navigate('/estoque')}>
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Total pares</p>
            <p className="text-xs sm:text-base font-bold text-blue-400 leading-tight">{totalPares}</p>
          </Card>
          <Card className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border-yellow-800 !py-2 !px-2.5 sm:!px-3 cursor-pointer hover:brightness-110 transition" onClick={() => navigate('/estoque')}>
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Valor estoque</p>
            <p className="text-xs sm:text-base font-bold text-yellow-400 leading-tight">{formatCurrency(valorEstoque)}</p>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
          <input placeholder="Buscar modelo ou referência..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2 text-xs text-content focus:outline-none focus:border-border-medium transition-colors" />
        </div>
        <div className="ml-auto flex items-center bg-elevated rounded-lg p-0.5">
          <button onClick={() => changeViewMode('cards')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}
            aria-label="Visualizar como cards">
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => changeViewMode('tabela')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'tabela' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}
            aria-label="Visualizar como tabela">
            <List size={16} />
          </button>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhum produto encontrado</p>
          <p className="mb-6 text-sm text-content-muted">Cadastre seu primeiro produto</p>
          <button onClick={() => navigate('/produtos/novo')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
            <Plus size={20} /> Cadastrar Primeiro Produto
          </button>
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(produto => (
            <div key={produto.id} className="relative rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform aspect-[3/4]" onClick={() => setProdutoSelecionado(produto)}>
              {produto.foto ? (
                <img src={produto.foto} alt={produto.modelo} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-elevated flex items-center justify-center"><Footprints size={40} className="text-content-muted opacity-20" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-bold text-white truncate">{produto.modelo}</p>
                {produto.referencia && <p className="text-[10px] text-white/60">{produto.referencia}</p>}
                <p className="text-base font-bold text-green-400 mt-1">{formatCurrency(produto.valor)}</p>
                <p className="text-[10px] text-white/70">{produto.estoque} un · {Math.floor(produto.estoque / 15)} pct{produto.estoque % 15 > 0 ? ` + ${produto.estoque % 15}` : ''}</p>
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
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Foto</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Modelo</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Referência</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted">Estoque</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Valor</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(produto => (
                  <tr key={produto.id} onClick={() => setProdutoSelecionado(produto)} className="cursor-pointer hover:bg-surface-hover transition-colors">
                    <td className="px-3 py-2.5">
                      {produto.foto ? (
                        <img src={produto.foto} alt={produto.modelo} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-elevated flex items-center justify-center"><Footprints size={14} className="text-content-muted opacity-30" /></div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium truncate max-w-[140px]">{produto.modelo}</td>
                    <td className="px-3 py-2.5 text-sm text-content-muted hidden sm:table-cell">{produto.referencia || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-center text-blue-400">{Math.floor(produto.estoque / 15)} pct{produto.estoque % 15 > 0 ? <span className="text-content-muted text-xs"> +{produto.estoque % 15}</span> : ''}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold text-right text-green-400">{formatCurrency(produto.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalhe */}
      {produtoSelecionado && !vendaSelecionada && (() => {
        const p = produtoSelecionado;
        // Sparkline preço
        const hist = [...precoHistorico].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        const sparkW = 200; const sparkH = 40; const pad = 4;
        const vals = hist.map(h => h.valor);
        const min = Math.min(...vals, 0); const max = Math.max(...vals, 1);
        const range = max - min || 1;
        const sparkLine = hist.length > 1
          ? hist.map((h, i) => `${i === 0 ? 'M' : 'L'}${pad + i * ((sparkW - pad * 2) / (hist.length - 1))},${pad + (sparkH - pad * 2) - ((h.valor - min) / range) * (sparkH - pad * 2)}`).join(' ')
          : '';
        const sparkArea = sparkLine ? sparkLine + ` L${pad + (hist.length - 1) * ((sparkW - pad * 2) / (hist.length - 1))},${sparkH - pad} L${pad},${sparkH - pad} Z` : '';

        return (
          <div className="fixed inset-0 app-modal-overlay z-[100] flex items-center justify-center p-4" onClick={() => { setProdutoSelecionado(null); setMenuOpen(false); }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <h3 className="font-semibold">{p.modelo}</h3>
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="text-content-muted hover:text-content p-1 rounded-lg hover:bg-elevated transition-colors"><MoreVertical size={18} /></button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border-subtle bg-elevated shadow-xl z-10 py-1">
                        <button onClick={() => { setMenuOpen(false); setProdutoSelecionado(null); navigate(`/produtos/${p.id}/editar`); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-content hover:bg-surface-hover transition-colors">
                          <Pencil size={13} /> Editar
                        </button>
                        <button onClick={() => { setMenuOpen(false); handleDelete(p.id); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                            (deleteClicks[p.id] || 0) === 0 ? 'text-red-500 hover:bg-surface-hover'
                            : (deleteClicks[p.id] || 0) === 1 ? 'text-red-400 bg-red-500/10' : 'text-red-300 bg-red-600/20'
                          }`}>
                          <Trash2 size={13} /> {deleteLabel(p.id)}
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setProdutoSelecionado(null); setMenuOpen(false); }} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {p.foto ? (
                  <img src={p.foto} alt={p.modelo} className="w-full h-56 rounded-xl object-cover" />
                ) : (
                  <div className="w-full h-56 rounded-xl bg-elevated flex items-center justify-center"><Footprints size={48} className="text-content-muted opacity-30" /></div>
                )}

                {/* Preço editável + sparkline */}
                <div className="rounded-lg bg-elevated p-3">
                  <div className="flex items-center justify-between">
                    {editandoPreco ? (
                      <div className="flex items-center gap-2">
                        <span className="text-content-muted text-sm">R$</span>
                        <input type="text" value={novoPreco} onChange={e => setNovoPreco(e.target.value)}
                          className="w-28 rounded border border-border-subtle bg-surface px-2 py-1 text-lg font-bold text-green-400 focus:outline-none focus:border-green-500"
                          autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSalvarPreco(); if (e.key === 'Escape') setEditandoPreco(false); }} />
                        <button onClick={handleSalvarPreco} className="text-green-400 hover:text-green-300"><Check size={18} /></button>
                        <button onClick={() => setEditandoPreco(false)} className="text-content-muted hover:text-content"><X size={18} /></button>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-green-400 cursor-pointer hover:text-green-300 transition-colors"
                        onClick={() => { setNovoPreco(String(p.valor)); setEditandoPreco(true); }}>
                        {formatCurrency(p.valor)}
                      </p>
                    )}
                  </div>
                  {hist.length > 1 && (
                    <div className="mt-2">
                      <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="w-full h-10" preserveAspectRatio="none">
                        <path d={sparkArea} fill="rgba(16,185,129,0.1)" />
                        <path d={sparkLine} fill="none" stroke="#10b981" strokeWidth="1.5" />
                        {hist.map((h, i) => {
                          const cx = pad + i * ((sparkW - pad * 2) / (hist.length - 1));
                          const cy = pad + (sparkH - pad * 2) - ((h.valor - min) / range) * (sparkH - pad * 2);
                          return <circle key={i} cx={cx} cy={cy} r="2" fill="#10b981"><title>{new Date(h.data).toLocaleDateString('pt-BR')} · {formatCurrency(h.valor)}</title></circle>;
                        })}
                      </svg>
                      <div className="flex justify-between text-[9px] text-content-muted mt-0.5">
                        <span>{new Date(hist[0].data).toLocaleDateString('pt-BR')}</span>
                        <span>{new Date(hist[hist.length - 1].data).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Tag size={12} /><span className="text-[10px]">Referência</span></div>
                    <p className="text-xs font-semibold">{p.referencia || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Footprints size={12} /><span className="text-[10px]">Estoque</span></div>
                    <p className="text-xs font-semibold">{p.estoque} un · {Math.floor(p.estoque / 15)} pct{p.estoque % 15 > 0 ? ` + ${p.estoque % 15}` : ''}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-elevated p-2.5">
                  <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Warehouse size={12} /><span className="text-[10px]">Valor total em estoque</span></div>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(p.valor * p.estoque)}</p>
                </div>

                {/* Vendas deste modelo */}
                <div>
                  <div className="flex items-center gap-1.5 text-content-muted mb-1.5"><ShoppingCart size={12} /><span className="text-[10px] font-medium">Vendas ({vendasDoProduto.length})</span></div>
                  {vendasDoProduto.length === 0 ? (
                    <p className="text-xs text-content-muted text-center py-3">Nenhuma venda deste modelo</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {vendasDoProduto.map(v => {
                        const vp = v.produtos.find(pr => pr.produtoId === p.id || pr.modelo === p.modelo);
                        return (
                          <div key={v.id} onClick={() => setVendaSelecionada(v)}
                            className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-2.5 cursor-pointer hover:bg-border-subtle transition-colors">
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{v.clienteNome}</p>
                              <p className="text-[10px] text-content-muted">
                                {new Date(v.data).toLocaleDateString('pt-BR')}
                                {vp && <> · {vp.quantidade} un × {formatCurrency(vp.valorUnitario)}</>}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-green-400 shrink-0">{formatCurrency(v.valorTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal detalhe venda */}
      {vendaSelecionada && (() => {
        const v = vendaSelecionada;
        return (
          <div className="fixed inset-0 app-modal-overlay z-[110] flex items-center justify-center p-4" onClick={() => setVendaSelecionada(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  {v.pedidoNumero && <span className="text-xs bg-elevated px-2.5 py-1 rounded-md font-mono font-semibold">#{v.pedidoNumero}</span>}
                  <span className="text-xs text-content-muted">{v.clienteNome}</span>
                </div>
                <button onClick={() => setVendaSelecionada(null)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-2xl font-bold text-green-400">{formatCurrency(v.valorTotal)}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Data</span></div>
                    <p className="text-xs font-semibold">{new Date(v.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Tag size={12} /><span className="text-[10px]">Vendedor</span></div>
                    <p className="text-xs font-semibold">{v.vendedorNome}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-elevated p-2.5">
                  <p className="text-[10px] text-content-muted mb-1">Cliente</p>
                  <p className="text-xs font-semibold">{v.clienteNome}</p>
                </div>

                <div>
                  <p className="text-[10px] text-content-muted mb-1.5">Produtos</p>
                  <div className="space-y-1">
                    {v.produtos.map((pr, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{pr.modelo}</p>
                          <p className="text-[10px] text-content-muted">{pr.quantidade} un × {formatCurrency(pr.valorUnitario)}</p>
                        </div>
                        <span className="text-xs font-bold text-green-400 shrink-0">{formatCurrency(pr.valorTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-elevated p-2.5">
                  <p className="text-[10px] text-content-muted mb-0.5">Pagamento</p>
                  <p className="text-xs font-semibold">{v.condicaoPagamento === 'avista' ? 'À vista' : `${v.parcelas}x`}{v.condicaoPagamento?.includes('_entrada') ? ' com entrada' : ''}</p>
                </div>

                <button onClick={() => { setVendaSelecionada(null); setProdutoSelecionado(null); navigate(`/vendas?vendaId=${v.id}`); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
                  <ShoppingCart size={14} /> Ver em Vendas
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
