import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Package, Footprints, Tag, Warehouse, Calendar, Pencil, Trash2, X, LayoutGrid, List, Search, ImageIcon } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { useProdutos } from '~/hooks/useRealtime';
import { deleteProduto } from '~/services/produtos.service';
import { formatCurrency } from '~/utils/format';
import type { Produto } from '~/models';

export default function ProdutosPage() {
  const { produtos, loading } = useProdutos();
  const [search, setSearch] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = {} as Record<string, ReturnType<typeof setTimeout>>;
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('produtos-list-view') as 'cards' | 'tabela') || 'cards';
    return 'cards';
  });
  const navigate = useNavigate();

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
        <div className="space-y-3">
          {filtered.map(produto => (
            <div key={produto.id} className="rounded-xl border border-border-subtle bg-surface p-3 sm:p-4 cursor-pointer hover:border-border-medium transition-colors" onClick={() => setProdutoSelecionado(produto)}>
              <div className="flex items-start gap-3">
                {produto.foto ? (
                  <img src={produto.foto} alt={produto.modelo} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-elevated flex items-center justify-center shrink-0"><Footprints size={20} className="text-content-muted opacity-30" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate">{produto.modelo}</p>
                    {produto.referencia && <span className="text-xs bg-elevated px-2 py-0.5 rounded-md text-content-muted">{produto.referencia}</span>}
                  </div>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(produto.valor)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-content-muted">
                    <span>{produto.estoque} un</span>
                    <span>{Math.floor(produto.estoque / 15)} pct{produto.estoque % 15 > 0 ? ` + ${produto.estoque % 15}` : ''}</span>
                    <span className="text-green-400/70">{formatCurrency(produto.valor * produto.estoque)}</span>
                  </div>
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
      {produtoSelecionado && (() => {
        const p = produtoSelecionado;
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => setProdutoSelecionado(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <h3 className="font-semibold">{p.modelo}</h3>
                <button onClick={() => setProdutoSelecionado(null)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-3">
                {p.foto ? (
                  <img src={p.foto} alt={p.modelo} className="w-full h-56 rounded-xl object-cover" />
                ) : (
                  <div className="w-full h-56 rounded-xl bg-elevated flex items-center justify-center"><Footprints size={48} className="text-content-muted opacity-30" /></div>
                )}

                <p className="text-2xl font-bold text-green-400">{formatCurrency(p.valor)}</p>

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

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Cadastrado em</span></div>
                    <p className="text-xs font-semibold">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Atualizado em</span></div>
                    <p className="text-xs font-semibold">{new Date(p.updatedAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => { setProdutoSelecionado(null); navigate(`/produtos/${p.id}/editar`); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      (deleteClicks[p.id] || 0) === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : (deleteClicks[p.id] || 0) === 1 ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-600/30 text-red-300 hover:bg-red-600/40'
                    }`}>
                    <Trash2 size={14} /> {deleteLabel(p.id)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
