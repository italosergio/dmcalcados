import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Package, Search, Warehouse, PackageOpen, Footprints, LayoutGrid, List, X, Pencil, Trash2, Calendar, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ProdutoCard } from '~/components/produtos/ProdutoCard';
import { getProdutos, deleteProduto } from '~/services/produtos.service';
import { getVendas } from '~/services/vendas.service';
import { getEntradas, migrarEntradasExistentes } from '~/services/entradas.service';
import { ResponsiveTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '~/components/common/ResponsiveTable';
import type { Produto, Venda, EntradaProduto } from '~/models';
import { formatCurrency } from '~/utils/format';
import { useAuth } from '~/contexts/AuthContext';

type Periodo = '7d' | '30d' | '90d' | '12m';

export default function ProdutosPage() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [entradas, setEntradas] = useState<EntradaProduto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const changeViewMode = (mode: 'cards' | 'table') => { setViewMode(mode); if (typeof window !== 'undefined') localStorage.setItem('produtos-view', mode); };
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [modelosFiltro, setModelosFiltro] = useState<string[]>([]);
  const [painelModo, setPainelModo] = useState<'saida' | 'entrada'>('saida');
  const [migrando, setMigrando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'vendedor') { navigate('/vendas'); }
  }, [user]);

  const loadProdutos = () => {
    setLoading(true);
    Promise.all([getProdutos(), getVendas(), getEntradas()])
      .then(([p, v, e]) => { setProdutos(p); setVendas(v); setEntradas(e); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProdutos();
    const saved = localStorage.getItem('produtos-view') as 'cards' | 'table';
    if (saved) setViewMode(saved);
  }, []);

  const totalPares = produtos.reduce((s, p) => s + p.estoque, 0);
  const totalPacotes = Math.floor(totalPares / 15);
  const paresAvulsos = totalPares % 15;
  const valorEstoque = produtos.reduce((s, p) => s + p.valor * p.estoque, 0);

  const filtered = produtos.filter(p =>
    (p.modelo || (p as any).nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.referencia || '').toLowerCase().includes(search.toLowerCase())
  );

  // --- Dados de saída/entrada por produto ---
  const periodoMs = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
  const dataLimite = new Date(Date.now() - periodoMs[periodo] * 86400000);

  const vendasFiltradas = useMemo(() =>
    vendas.filter(v => new Date(v.data) >= dataLimite),
    [vendas, periodo]
  );

  const entradasFiltradas = useMemo(() =>
    entradas.filter(e => new Date(e.createdAt) >= dataLimite),
    [entradas, periodo]
  );

  const saidaPorModelo = useMemo(() => {
    const map: Record<string, { modelo: string; quantidade: number; valor: number }> = {};
    vendasFiltradas.forEach(v => {
      v.produtos?.forEach(p => {
        if (!map[p.modelo]) map[p.modelo] = { modelo: p.modelo, quantidade: 0, valor: 0 };
        map[p.modelo].quantidade += p.quantidade;
        map[p.modelo].valor += p.valorTotal;
      });
    });
    return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
  }, [vendasFiltradas]);

  const entradaPorModelo = useMemo(() => {
    const map: Record<string, { modelo: string; quantidade: number; valor: number }> = {};
    entradasFiltradas.forEach(e => {
      if (!map[e.modelo]) map[e.modelo] = { modelo: e.modelo, quantidade: 0, valor: 0 };
      map[e.modelo].quantidade += e.quantidade;
      map[e.modelo].valor += e.quantidade * e.valorUnitario;
    });
    return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
  }, [entradasFiltradas]);

  const dadosPainel = painelModo === 'saida' ? saidaPorModelo : entradaPorModelo;
  const modelosDisponiveis = dadosPainel.map(s => s.modelo);
  const modelosAtivos = modelosFiltro.length > 0 ? modelosFiltro : modelosDisponiveis;

  // --- Dados do gráfico ao longo do tempo ---
  const chartData = useMemo(() => {
    const modelos = modelosAtivos.slice(0, 8);
    const buckets: Record<string, Record<string, number>> = {};

    if (painelModo === 'saida') {
      vendasFiltradas.forEach(v => {
        const d = new Date(v.data);
        const key = periodo === '12m'
          ? `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`
          : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        v.produtos?.forEach(p => {
          if (!modelos.includes(p.modelo)) return;
          if (!buckets[key]) buckets[key] = {};
          buckets[key][p.modelo] = (buckets[key][p.modelo] || 0) + p.quantidade;
        });
      });
    } else {
      entradasFiltradas.forEach(e => {
        const d = new Date(e.createdAt);
        const key = periodo === '12m'
          ? `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`
          : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!modelos.includes(e.modelo)) return;
        if (!buckets[key]) buckets[key] = {};
        buckets[key][e.modelo] = (buckets[key][e.modelo] || 0) + e.quantidade;
      });
    }

    const allDates: string[] = [];
    const days = periodoMs[periodo];
    if (periodo === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        allDates.push(`${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`);
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        allDates.push(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`);
      }
    }

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const series = modelos.map((m, i) => ({
      type: 'line' as const, name: m,
      data: allDates.map(c => buckets[c]?.[m] || 0),
      color: colors[i % colors.length],
    }));

    return { categories: allDates, series };
  }, [vendasFiltradas, entradasFiltradas, modelosAtivos, periodo, painelModo]);

  const chartTheme = { backgroundColor: '#232328', textColor: '#f0f0f2', gridColor: '#2e2e36' };

  const chartOptions: Highcharts.Options = {
    chart: { type: 'line', height: 220, backgroundColor: chartTheme.backgroundColor },
    title: { text: undefined },
    xAxis: {
      categories: chartData.categories,
      labels: { step: Math.max(1, Math.floor(chartData.categories.length / 6)), rotation: -45, style: { fontSize: '9px', color: chartTheme.textColor } },
      lineColor: chartTheme.gridColor, tickColor: chartTheme.gridColor,
    },
    yAxis: {
      title: { text: null },
      labels: { style: { fontSize: '9px', color: chartTheme.textColor } },
      gridLineColor: chartTheme.gridColor, allowDecimals: false,
    },
    series: chartData.series,
    credits: { enabled: false },
    legend: { enabled: false },
    tooltip: { formatter: function() { return '<b>' + this.series.name + '</b><br/>' + this.x + ': ' + this.y + ' un'; } },
    plotOptions: { line: { marker: { radius: 2 } } },
  };

  const produtosSemEntrada = useMemo(() => {
    const idsComEntrada = new Set(entradas.map(e => e.produtoId));
    return produtos.filter(p => !idsComEntrada.has(p.id) && p.estoque > 0);
  }, [produtos, entradas]);

  const handleMigrar = async () => {
    setMigrando(true);
    await migrarEntradasExistentes();
    loadProdutos();
    setMigrando(false);
  };

  const toggleModelo = (m: string) => {
    setModelosFiltro(prev => {
      if (prev.length === 0) return modelosDisponiveis.filter(x => x !== m);
      return prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m];
    });
  };

  return (
    <div className="flex flex-col lg:h-full" style={{ zoom: 0.8 }}>
      {!loading && produtos.length > 0 && (
        <div className="mb-4 sm:mb-6 space-y-3 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border-subtle bg-surface p-2 sm:p-3 flex items-center gap-2">
              <div className="rounded-lg bg-green-500/10 p-1.5 shrink-0"><Warehouse size={16} className="text-green-400" /></div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-content-muted truncate">Valor em estoque</p>
                <p className="text-xs sm:text-sm font-bold text-green-400 truncate">{formatCurrency(valorEstoque)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface p-2 sm:p-3 flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-1.5 shrink-0"><PackageOpen size={16} className="text-blue-400" /></div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-content-muted truncate">Pacotes</p>
                <p className="text-xs sm:text-sm font-bold text-blue-400 truncate">{totalPacotes}{paresAvulsos > 0 ? <span className="text-[10px] font-normal text-content-muted"> + {paresAvulsos}</span> : ''}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface p-2 sm:p-3 flex items-center gap-2">
              <div className="rounded-lg bg-orange-500/10 p-1.5 shrink-0"><Footprints size={16} className="text-orange-400" /></div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-content-muted truncate">Total de pares</p>
                <p className="text-xs sm:text-sm font-bold text-orange-400">{totalPares}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/produtos/novo')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
              <Plus size={16} /> <span className="hidden sm:inline">Novo Produto</span><span className="sm:hidden">Novo</span>
            </button>
            <div className="flex rounded-lg border border-border-subtle overflow-hidden">
              <button onClick={() => changeViewMode('cards')} className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-elevated text-content' : 'text-content-muted hover:text-content'}`}><LayoutGrid size={16} /></button>
              <button onClick={() => changeViewMode('table')} className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-elevated text-content' : 'text-content-muted hover:text-content'}`}><List size={16} /></button>
            </div>
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
              <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2 text-xs text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors" />
            </div>
          </div>
        </div>
      )}

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

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:min-h-0 lg:flex-1">
          {/* Lado esquerdo - Estoque */}
          <div className="lg:col-span-2 lg:min-h-0 lg:overflow-y-auto">
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {filtered.map(produto => (
                  <ProdutoCard key={produto.id} produto={produto} onDeleted={loadProdutos} onClick={() => setProdutoSelecionado(produto)} />
                ))}
              </div>
            )}

            {viewMode === 'table' && (
              <ResponsiveTable>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Foto</TableHeader>
                      <TableHeader>Modelo</TableHeader>
                      <TableHeader className="hidden sm:table-cell">Referência</TableHeader>
                      <TableHeader>Valor</TableHeader>
                      <TableHeader>Estoque</TableHeader>
                      <TableHeader className="hidden sm:table-cell">Total</TableHeader>
                      <TableHeader className="hidden sm:table-cell">Atualizado</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {filtered.map(produto => (
                      <TableRow key={produto.id} onClick={() => setProdutoSelecionado(produto)}>
                        <TableCell>
                          {produto.foto ? (
                            <img src={produto.foto} alt={produto.modelo} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-elevated flex items-center justify-center"><Footprints size={16} className="text-content-muted opacity-30" /></div>
                          )}
                        </TableCell>
                        <TableCell><span className="font-medium">{produto.modelo}</span></TableCell>
                        <TableCell className="hidden sm:table-cell"><span className="text-content-muted">{produto.referencia}</span></TableCell>
                        <TableCell><span className="font-semibold text-green-400">{formatCurrency(produto.valor)}</span></TableCell>
                        <TableCell>{produto.estoque} un</TableCell>
                        <TableCell className="hidden sm:table-cell"><span className="text-green-400">{formatCurrency(produto.valor * produto.estoque)}</span></TableCell>
                        <TableCell className="hidden sm:table-cell"><span className="text-content-muted">{produto.updatedAt ? new Date(produto.updatedAt).toLocaleDateString('pt-BR') : '—'}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )}
          </div>

          {/* Lado direito - Saída / Entrada */}
          <div className="lg:min-h-0 flex flex-col space-y-4">
            <div className="rounded-xl border border-border-subtle bg-surface p-4 lg:min-h-0 flex flex-col lg:flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex rounded-lg border border-border-subtle overflow-hidden">
                    <button onClick={() => { setPainelModo('entrada'); setModelosFiltro([]); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${painelModo === 'entrada' ? 'bg-elevated text-blue-400' : 'text-content-muted hover:text-content'}`}>
                      <TrendingDown size={13} /> Entrada
                    </button>
                    <button onClick={() => { setPainelModo('saida'); setModelosFiltro([]); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${painelModo === 'saida' ? 'bg-elevated text-green-400' : 'text-content-muted hover:text-content'}`}>
                      <TrendingUp size={13} /> Saída
                    </button>
                  </div>
                </div>
                <select value={periodo} onChange={e => { setPeriodo(e.target.value as Periodo); setModelosFiltro([]); }}
                  className="rounded-lg border border-border-subtle bg-elevated px-2 py-1 text-[10px] text-content focus:outline-none">
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                  <option value="90d">90 dias</option>
                  <option value="12m">12 meses</option>
                </select>
              </div>
              <div className="lg:overflow-y-auto space-y-1 lg:min-h-0 lg:flex-1">
                {dadosPainel.length === 0 && <p className="text-xs text-content-muted text-center py-4">{painelModo === 'saida' ? 'Sem vendas no período' : 'Sem entradas no período'}</p>}
                {painelModo === 'entrada' && produtosSemEntrada.length > 0 && (
                  <button onClick={handleMigrar} disabled={migrando}
                    className="w-full rounded-lg border border-dashed border-yellow-500/30 bg-yellow-500/5 p-2 text-[10px] text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50 mb-1">
                    {migrando ? 'Migrando...' : `Importar ${produtosSemEntrada.length} produto(s) antigo(s)`}
                  </button>
                )}
                {dadosPainel.map(s => (
                  <div key={s.modelo} className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{s.modelo}</p>
                      <p className="text-[10px] text-content-muted">{s.quantidade} un {painelModo === 'saida' ? 'vendidas' : 'recebidas'}</p>
                    </div>
                    <span className={`text-xs font-bold whitespace-nowrap ${painelModo === 'saida' ? 'text-green-400' : 'text-blue-400'}`}>{formatCurrency(s.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 mt-auto border-t border-border-subtle shrink-0">
                <span className="text-[10px] text-content-muted">Total</span>
                <span className={`text-xs font-bold ${painelModo === 'saida' ? 'text-green-400' : 'text-blue-400'}`}>{formatCurrency(dadosPainel.reduce((s, d) => s + d.valor, 0))}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                {painelModo === 'saida' ? <TrendingUp size={14} className="text-green-400" /> : <TrendingDown size={14} className="text-blue-400" />}
                <h3 className="text-xs font-semibold">{painelModo === 'saida' ? 'Saída' : 'Entrada'} por Modelo</h3>
              </div>
              {modelosDisponiveis.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {modelosDisponiveis.slice(0, 8).map(m => (
                    <button key={m} onClick={() => toggleModelo(m)}
                      className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${modelosAtivos.includes(m) ? 'bg-blue-500/20 text-blue-400' : 'bg-elevated text-content-muted'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
              {chartData.series.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              ) : (
                <p className="text-xs text-content-muted text-center py-8">Sem dados no período</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe */}
      {produtoSelecionado && (() => {
        const saida = saidaPorModelo.find(s => s.modelo === produtoSelecionado.modelo);
        const entrada = entradaPorModelo.find(s => s.modelo === produtoSelecionado.modelo);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setProdutoSelecionado(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <h3 className="font-semibold">{produtoSelecionado.modelo}</h3>
                <button onClick={() => setProdutoSelecionado(null)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-3">
                {produtoSelecionado.foto ? (
                  <img src={produtoSelecionado.foto} alt={produtoSelecionado.modelo} className="w-full h-56 rounded-xl object-cover" />
                ) : (
                  <div className="w-full h-56 rounded-xl bg-elevated flex items-center justify-center"><Footprints size={48} className="text-content-muted opacity-30" /></div>
                )}

                <p className="text-2xl font-bold text-green-400">{formatCurrency(produtoSelecionado.valor)}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Tag size={12} /><span className="text-[10px]">Referência</span></div>
                    <p className="text-xs font-semibold">{produtoSelecionado.referencia || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Footprints size={12} /><span className="text-[10px]">Estoque</span></div>
                    <p className="text-xs font-semibold">{produtoSelecionado.estoque} un · {Math.floor(produtoSelecionado.estoque / 15)} pct{produtoSelecionado.estoque % 15 > 0 ? ` + ${produtoSelecionado.estoque % 15} un` : ''}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-elevated p-2.5">
                  <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Warehouse size={12} /><span className="text-[10px]">Valor total em estoque</span></div>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(produtoSelecionado.valor * produtoSelecionado.estoque)}</p>
                </div>

                {saida && (
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><TrendingUp size={12} /><span className="text-[10px]">Vendido ({periodo})</span></div>
                    <p className="text-xs"><span className="font-semibold text-blue-400">{saida.quantidade} un</span> · <span className="font-semibold text-green-400">{formatCurrency(saida.valor)}</span></p>
                  </div>
                )}

                {entrada && (
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><TrendingDown size={12} /><span className="text-[10px]">Entrada ({periodo})</span></div>
                    <p className="text-xs"><span className="font-semibold text-blue-400">{entrada.quantidade} un</span> · <span className="font-semibold text-green-400">{formatCurrency(entrada.valor)}</span></p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Cadastrado em</span></div>
                    <p className="text-xs font-semibold">{new Date(produtoSelecionado.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Atualizado em</span></div>
                    <p className="text-xs font-semibold">{new Date(produtoSelecionado.updatedAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => { setProdutoSelecionado(null); navigate(`/produtos/${produtoSelecionado.id}/editar`); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={async () => { await deleteProduto(produtoSelecionado.id); setProdutoSelecionado(null); loadProdutos(); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 py-2 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={14} /> Excluir
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
