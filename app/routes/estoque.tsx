import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Package, Warehouse, PackageOpen, Footprints, X, Pencil, Trash2, Calendar, Tag, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useProdutos, useVendas, useEntradas } from '~/hooks/useRealtime';
import { createEntrada, migrarEntradasExistentes } from '~/services/entradas.service';
import { createProduto, updateProduto as updateProdutoService, deleteProduto } from '~/services/produtos.service';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ProdutoCard } from '~/components/produtos/ProdutoCard';
import { ResponsiveTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '~/components/common/ResponsiveTable';
import type { Produto, Venda, EntradaProduto } from '~/models';
import { useAuth } from '~/contexts/AuthContext';
import { userIsAdmin, userIsVendedor } from '~/models';
import { useCachedState, clearFormCache } from '~/hooks/useFormCache';
import { formatCurrency } from '~/utils/format';

type Periodo = '7d' | '30d' | '90d' | '12m';

export default function ProdutosPage() {
  const { user } = useAuth();
  const { produtos, loading: produtosLoading } = useProdutos();
  const { vendas, loading: vendasLoading } = useVendas();
  const { entradas, loading: entradasLoading } = useEntradas();
  const loading = produtosLoading || vendasLoading || entradasLoading;
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [modelosFiltro, setModelosFiltro] = useState<string[]>([]);
  const [painelModo, setPainelModo] = useState<'saida' | 'entrada'>('saida');
  const [migrando, setMigrando] = useState(false);

  const [entradaLoteSelecionado, setEntradaLoteSelecionado] = useState<{ loteId: string; itens: EntradaProduto[] } | null>(null);
  // Modal entrada
  const [modalEntrada, setModalEntrada] = useState(false);
  const [entradaItens, setEntradaItens] = useCachedState<{ produtoId: string; modelo: string; referencia: string; valorUnitario: number; quantidade: number }[]>('entrada', 'itens', []);
  const [entradaBusca, setEntradaBusca] = useState('');
  const [entradaDropdown, setEntradaDropdown] = useState(false);
  const [entradaModo, setEntradaModo] = useCachedState<'pacote' | 'unidade'>('entrada', 'modo', 'pacote');
  const [entradaSaving, setEntradaSaving] = useState(false);
  const [npModal, setNpModal] = useState(false);
  const [npModelo, setNpModelo] = useState('');
  const [npReferencia, setNpReferencia] = useState('');
  const [npValor, setNpValor] = useState('');
  const [npSaving, setNpSaving] = useState(false);
  const navigate = useNavigate();

  type SortKey = 'modelo' | 'referencia' | 'pacotes' | 'estoque' | 'total';
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir(key === 'modelo' || key === 'referencia' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
    : <ArrowUpDown size={11} className="opacity-30" />;

  const modeloDup = npModelo.trim() && produtos.some(p => p.modelo.toLowerCase() === npModelo.trim().toLowerCase());
  const refDup = npReferencia.trim() && produtos.some(p => p.referencia.toLowerCase() === npReferencia.trim().toLowerCase());
  const npFormOk = npModelo.trim() && npReferencia.trim() && npValor && !modeloDup && !refDup;

  const entradaFiltered = produtos.filter(p =>
    !entradaItens.some(i => i.produtoId === p.id) &&
    ((p.modelo || '').toLowerCase().includes(entradaBusca.toLowerCase()) ||
     (p.referencia || '').toLowerCase().includes(entradaBusca.toLowerCase()))
  );

  const addEntradaProduto = (p: Produto) => {
    setEntradaItens(prev => [...prev, { produtoId: p.id, modelo: p.modelo, referencia: p.referencia, valorUnitario: p.valor, quantidade: 0 }]);
    setEntradaBusca(''); setEntradaDropdown(false);
  };

  const salvarNovoProduto = async () => {
    if (!npFormOk) return;
    setNpSaving(true);
    try {
      const valor = parseFloat(npValor) || 0;
      const id = await createProduto({ modelo: npModelo.trim(), referencia: npReferencia.trim(), valor, foto: '', estoque: 0 });
      const novo = { id, modelo: npModelo.trim(), referencia: npReferencia.trim(), valor, foto: '', estoque: 0, createdAt: new Date(), updatedAt: new Date() } as Produto;
      addEntradaProduto(novo);
      setNpModal(false); setNpModelo(''); setNpReferencia(''); setNpValor('');
    } catch { } finally { setNpSaving(false); }
  };

  const entradaTotalItens = entradaItens.filter(i => i.quantidade > 0);
  const entradaTotalUn = entradaTotalItens.reduce((s, i) => s + (entradaModo === 'pacote' ? i.quantidade * 15 : i.quantidade), 0);

  const handleEntradaSubmit = async () => {
    if (entradaTotalItens.length === 0) return;
    setEntradaSaving(true);
    try {
      const loteId = new Date().toISOString();
      for (const item of entradaTotalItens) {
        const qtdReal = entradaModo === 'pacote' ? item.quantidade * 15 : item.quantidade;
        await createEntrada({ produtoId: item.produtoId, modelo: item.modelo, referencia: item.referencia, quantidade: qtdReal, valorUnitario: item.valorUnitario, loteId });
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto) await updateProdutoService(item.produtoId, { estoque: produto.estoque + qtdReal });
      }
      setModalEntrada(false); setEntradaItens([]); clearFormCache('entrada');
    } catch { } finally { setEntradaSaving(false); }
  };

  useEffect(() => {
    if (user && userIsVendedor(user) && !userIsAdmin(user)) { navigate('/vendas'); }
  }, [user]);

  if (!user || (userIsVendedor(user) && !userIsAdmin(user))) return null;

  const totalPares = produtos.reduce((s, p) => s + p.estoque, 0);
  const totalPacotes = Math.floor(totalPares / 15);
  const paresAvulsos = totalPares % 15;
  const valorEstoque = produtos.reduce((s, p) => s + p.valor * p.estoque, 0);

  // --- Dados de saída/entrada por produto ---
  const periodoMs = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };

  const vendasFiltradas = useMemo(() => {
    const dataLimite = new Date(Date.now() - periodoMs[periodo] * 86400000);
    return vendas.filter(v => !v.deletedAt && new Date(v.data) >= dataLimite);
  }, [vendas, periodo]);

  const entradasFiltradas = useMemo(() => {
    const dataLimite = new Date(Date.now() - periodoMs[periodo] * 86400000);
    return entradas.filter(e => new Date(e.createdAt) >= dataLimite);
  }, [entradas, periodo]);

  const saidaPorModelo = useMemo(() => {
    const map: Record<string, { modelo: string; quantidade: number; valor: number }> = {};
    vendasFiltradas.forEach(v => {
      v.produtos?.forEach(p => {
        if (!p.modelo) return;
        const unidades = p.tipo === 'pacote' ? p.quantidade * 15 : p.quantidade;
        if (!map[p.modelo]) map[p.modelo] = { modelo: p.modelo, quantidade: 0, valor: 0 };
        map[p.modelo].quantidade += unidades;
        map[p.modelo].valor += p.valorTotal;
      });
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
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
    const totalBuckets: Record<string, number> = {};

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
          totalBuckets[key] = (totalBuckets[key] || 0) + p.quantidade;
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
        totalBuckets[key] = (totalBuckets[key] || 0) + e.quantidade;
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

    series.push({
      type: 'line' as const, name: 'Total',
      data: allDates.map(c => totalBuckets[c] || 0),
      color: '#ffffff',
    });

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
      title: { text: undefined },
      labels: { style: { fontSize: '9px', color: chartTheme.textColor } },
      gridLineColor: chartTheme.gridColor, allowDecimals: false,
    },
    series: chartData.series,
    credits: { enabled: false },
    legend: { enabled: true, itemStyle: { color: '#f0f0f2', fontSize: '9px' }, itemHoverStyle: { color: '#fff' } },
    tooltip: { formatter: function() { return '<b>' + this.series.name + '</b><br/>' + this.x + ': ' + this.y + ' un'; } },
    plotOptions: { line: { marker: { radius: 2 } } },
  };

  const entradasAgrupadas = useMemo(() => {
    const map: Record<string, EntradaProduto[]> = {};
    entradasFiltradas.forEach(e => {
      const key = (e as any).loteId || e.id;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map)
      .map(([loteId, itens]) => ({ loteId, itens }))
      .sort((a, b) => new Date(b.itens[0].createdAt).getTime() - new Date(a.itens[0].createdAt).getTime());
  }, [entradasFiltradas]);

  const produtosSemEntrada = useMemo(() => {
    const idsComEntrada = new Set(entradas.map(e => e.produtoId));
    return produtos.filter(p => !idsComEntrada.has(p.id) && p.estoque > 0);
  }, [produtos, entradas]);

  const produtosOrdenados = useMemo(() => {
    if (!sortKey) return produtos;
    const m = sortDir === 'asc' ? 1 : -1;
    return [...produtos].sort((a, b) => {
      switch (sortKey) {
        case 'modelo': return m * a.modelo.localeCompare(b.modelo);
        case 'referencia': return m * a.referencia.localeCompare(b.referencia);
        case 'pacotes': return m * (Math.floor(a.estoque / 15) - Math.floor(b.estoque / 15));
        case 'estoque': return m * (a.estoque - b.estoque);
        case 'total': return m * (a.valor * a.estoque - b.valor * b.estoque);
        default: return 0;
      }
    });
  }, [produtos, sortKey, sortDir]);

  const handleMigrar = async () => {
    setMigrando(true);
    await migrarEntradasExistentes();
    setMigrando(false);
  };

  const toggleModelo = (m: string) => {
    setModelosFiltro(prev => {
      if (prev.length === 0) return modelosDisponiveis.filter(x => x !== m);
      return prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m];
    });
  };

  return (
    <>
    <div className="flex flex-col lg:h-full" style={{ zoom: 0.8 }}>
      {!loading && produtos.length > 0 && (
        <div className="mb-4 sm:mb-6 shrink-0">
          <div className="flex flex-col lg:flex-row gap-2">
            <button onClick={() => { setEntradaBusca(''); setEntradaDropdown(false); setNpModal(false); setModalEntrada(true); }}
              className="order-last lg:order-first inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-2.5 lg:py-0 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-[0.98]">
              <Plus size={16} /> Registrar Entrada
            </button>
            <div className="grid grid-cols-3 gap-2 flex-1">
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
          </div>
        </div>
      )}

      {loading && <p>Carregando...</p>}

      {!loading && produtos.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhum produto encontrado</p>
          <p className="mb-6 text-sm text-content-muted">Cadastre seu primeiro produto</p>
          <button onClick={() => { setEntradaBusca(''); setEntradaDropdown(false); setNpModal(false); setModalEntrada(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-95">
            <Plus size={20} /> Registrar Primeira Entrada
          </button>
        </div>
      )}

      {!loading && produtos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:min-h-0 lg:flex-1">
          {/* Lado esquerdo - Estoque */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* Histórico de entradas */}
            <div className="rounded-xl border border-border-subtle bg-surface p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold">Últimas Entradas</h3>
              </div>
              {entradasAgrupadas.length === 0 ? (
                <p className="text-sm text-content-muted text-center py-4">Sem entradas no período</p>
              ) : (
                <div className="max-h-[17.5rem] lg:max-h-[12rem] overflow-y-auto space-y-1.5">
                  {entradasAgrupadas.map((lote) => {
                    const totalUn = lote.itens.reduce((s, e) => s + e.quantidade, 0);
                    const totalValor = lote.itens.reduce((s, e) => s + e.quantidade * e.valorUnitario, 0);
                    const modelos = lote.itens.length;
                    const data = new Date(lote.itens[0].createdAt).toLocaleDateString('pt-BR');
                    return (
                      <div key={lote.loteId} onClick={() => setEntradaLoteSelecionado(lote)} className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-3 cursor-pointer hover:bg-border-medium transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{data}</p>
                          <p className="text-xs text-content-muted">{modelos} modelo(s) · {Math.floor(totalUn / 15)} pct{totalUn % 15 > 0 ? ` + ${totalUn % 15} un` : ''}</p>
                        </div>
                        <span className="text-sm font-bold text-blue-400 shrink-0">{formatCurrency(totalValor)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border-subtle flex flex-col min-h-0 lg:flex-1">
                <p className="text-xs font-semibold text-content-muted px-4 py-2 bg-surface border-b border-border-subtle shrink-0">Estoque por Produtos</p>
                <div className="overflow-y-auto flex-1">
                  <table className="min-w-full divide-y divide-border-subtle">
                    <thead className="bg-surface sticky top-0 z-10">
                      <tr>
                        <TableHeader>Foto</TableHeader>
                        <TableHeader><button onClick={() => toggleSort('modelo')} className="inline-flex items-center gap-1">Modelo <SortIcon k="modelo" /></button></TableHeader>
                        <TableHeader className="hidden sm:table-cell"><button onClick={() => toggleSort('referencia')} className="inline-flex items-center gap-1">Referência <SortIcon k="referencia" /></button></TableHeader>
                        <TableHeader><button onClick={() => toggleSort('pacotes')} className="inline-flex items-center gap-1">Pacotes <SortIcon k="pacotes" /></button></TableHeader>
                        <TableHeader><button onClick={() => toggleSort('estoque')} className="inline-flex items-center gap-1">Sandálias <SortIcon k="estoque" /></button></TableHeader>
                        <TableHeader className="hidden sm:table-cell"><button onClick={() => toggleSort('total')} className="inline-flex items-center gap-1">Total <SortIcon k="total" /></button></TableHeader>
                      </tr>
                    </thead>
                    <TableBody>
                      {produtosOrdenados.map(produto => (
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
                          <TableCell><span className="text-blue-400 font-medium">{Math.floor(produto.estoque / 15)} pct{produto.estoque % 15 > 0 ? <span className="text-content-muted text-xs"> +{produto.estoque % 15}</span> : ''}</span></TableCell>
                          <TableCell>{produto.estoque} un</TableCell>
                          <TableCell className="hidden sm:table-cell"><span className="text-green-400">{formatCurrency(produto.valor * produto.estoque)}</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </div>
              </div>
          </div>

          {/* Lado direito - Saída / Entrada */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border-subtle bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
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
                <select value={periodo} onChange={e => { setPeriodo(e.target.value as Periodo); setModelosFiltro([]); }}
                  className="rounded-lg border border-border-subtle bg-elevated px-2 py-1 text-[10px] text-content focus:outline-none">
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                  <option value="90d">90 dias</option>
                  <option value="12m">12 meses</option>
                </select>
              </div>
              <div className="space-y-1 lg:max-h-[7.5rem] overflow-y-auto">
                {dadosPainel.length === 0 && <p className="text-xs text-content-muted text-center py-4">{painelModo === 'saida' ? 'Sem vendas no período' : 'Sem entradas no período'}</p>}
                {painelModo === 'entrada' && produtosSemEntrada.length > 0 && (
                  <button onClick={handleMigrar} disabled={migrando}
                    className="w-full rounded-lg border border-dashed border-yellow-500/30 bg-yellow-500/5 p-2 text-[10px] text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50 mb-1">
                    {migrando ? 'Migrando...' : `Importar ${produtosSemEntrada.length} produto(s) antigo(s)`}
                  </button>
                )}
                {dadosPainel.map((s, i) => (
                  <div key={s.modelo || i} className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{s.modelo}</p>
                      <p className="text-[10px] text-content-muted">{s.quantidade} un {painelModo === 'saida' ? 'vendidas' : 'recebidas'}</p>
                    </div>
                    <span className={`text-xs font-bold whitespace-nowrap ${painelModo === 'saida' ? 'text-green-400' : 'text-blue-400'}`}>{formatCurrency(s.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-subtle">
                <span className="text-[10px] text-content-muted">Total</span>
                <span className={`text-xs font-bold ${painelModo === 'saida' ? 'text-green-400' : 'text-blue-400'}`}>{formatCurrency(dadosPainel.reduce((s, d) => s + d.valor, 0))}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                {painelModo === 'saida' ? <TrendingUp size={14} className="text-green-400" /> : <TrendingDown size={14} className="text-blue-400" />}
                <h3 className="text-xs font-semibold">{painelModo === 'saida' ? 'Saída' : 'Entrada'} por Modelo</h3>
              </div>
              {chartData.series.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              ) : (
                <p className="text-xs text-content-muted text-center py-8">Sem dados no período</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>{/* fim zoom */}

      {/* Modal registrar entrada */}
      {modalEntrada && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setModalEntrada(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[92vh] rounded-2xl border border-border-subtle bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl shrink-0">
              <h3 className="font-semibold">Registrar Entrada</h3>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border-subtle overflow-hidden text-xs">
                  <button onClick={() => setEntradaModo('pacote')} className={`px-3 py-1 transition-colors ${entradaModo === 'pacote' ? 'bg-blue-600 text-white' : 'text-content-muted hover:text-content'}`}>Pacotes</button>
                  <button onClick={() => setEntradaModo('unidade')} className={`px-3 py-1 transition-colors ${entradaModo === 'unidade' ? 'bg-blue-600 text-white' : 'text-content-muted hover:text-content'}`}>Unidades</button>
                </div>
                <button onClick={() => setModalEntrada(false)} className="text-content-muted hover:text-content"><X size={20} /></button>
              </div>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1 min-h-[65vh]">
              {/* Buscar / novo produto inline */}
              {npModal ? (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400">Novo produto</span>
                    <button type="button" onClick={() => setNpModal(false)} className="text-content-muted hover:text-content"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input placeholder="Modelo" value={npModelo} onChange={e => setNpModelo(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:ring-1 focus:border-border-medium focus:ring-blue-500/30 transition-colors" />
                      {npModelo.trim() && <div className={`flex items-center gap-1 mt-1 text-[10px] ${modeloDup ? 'text-red-400' : 'text-green-400'}`}>{modeloDup ? <><AlertCircle size={10} /> Já existe</> : <><CheckCircle2 size={10} /> OK</>}</div>}
                    </div>
                    <div>
                      <input placeholder="Referência" value={npReferencia} onChange={e => setNpReferencia(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:ring-1 focus:border-border-medium focus:ring-blue-500/30 transition-colors" />
                      {npReferencia.trim() && <div className={`flex items-center gap-1 mt-1 text-[10px] ${refDup ? 'text-red-400' : 'text-green-400'}`}>{refDup ? <><AlertCircle size={10} /> Já existe</> : <><CheckCircle2 size={10} /> OK</>}</div>}
                    </div>
                  </div>
                  <input type="number" step="0.01" placeholder="Valor sugerido (R$)" value={npValor} onChange={e => setNpValor(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:ring-1 focus:border-border-medium focus:ring-blue-500/30 transition-colors" />
                  <button type="button" onClick={salvarNovoProduto} disabled={npSaving || !npFormOk}
                    className="w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                    {npSaving ? 'Salvando...' : 'Cadastrar e Adicionar'}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
                  <input placeholder="Buscar produto para adicionar..." value={entradaBusca}
                    onChange={e => { setEntradaBusca(e.target.value); setEntradaDropdown(true); }}
                    onFocus={() => setEntradaDropdown(true)}
                    className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium transition-colors" />
                  {entradaDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-border-subtle bg-surface shadow-xl max-h-48 overflow-y-auto">
                      {entradaFiltered.slice(0, 8).map(p => (
                        <button key={p.id} type="button" onClick={() => addEntradaProduto(p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-elevated transition-colors">
                          <div className="min-w-0"><span className="font-medium">{p.modelo}</span>{p.referencia && <span className="text-content-muted ml-2 text-xs">{p.referencia}</span>}</div>
                          <span className="text-xs text-content-muted">{p.estoque} un</span>
                        </button>
                      ))}
                      <button type="button" onClick={() => { setNpModal(true); setNpModelo(entradaBusca); setEntradaDropdown(false); setEntradaBusca(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors border-t border-border-subtle">
                        <Plus size={14} /> {entradaBusca.trim() ? `Cadastrar "${entradaBusca}"` : 'Cadastrar novo produto'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Itens */}
              {entradaItens.length > 0 && (
                <div className="space-y-2">
                  {entradaItens.map(item => (
                    <div key={item.produtoId} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-elevated px-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.modelo}</p>
                        <p className="text-[10px] text-content-muted">{item.referencia} · {formatCurrency(item.valorUnitario)}/un</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEntradaItens(prev => prev.map(i => i.produtoId === item.produtoId ? { ...i, quantidade: Math.max(0, i.quantidade - 1) } : i))} className="w-7 h-7 rounded-lg bg-white/10 text-sm font-bold hover:bg-white/20">−</button>
                        <div className="text-center w-8">
                          <span className="text-sm font-semibold">{item.quantidade}</span>
                          <p className="text-[9px] text-content-muted">{entradaModo === 'pacote' ? 'pct' : 'un'}</p>
                        </div>
                        <button onClick={() => setEntradaItens(prev => prev.map(i => i.produtoId === item.produtoId ? { ...i, quantidade: i.quantidade + 1 } : i))} className="w-7 h-7 rounded-lg bg-white/10 text-sm font-bold hover:bg-white/20">+</button>
                        <button onClick={() => setEntradaItens(prev => prev.filter(i => i.produtoId !== item.produtoId))} className="text-content-muted hover:text-red-400 transition-colors ml-1"><X size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumo */}
              {entradaTotalItens.length > 0 && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-content-muted">{entradaTotalItens.length} produto(s)</span>
                    <span className="font-semibold text-green-400">{entradaTotalUn} un ({Math.floor(entradaTotalUn / 15)} pct{entradaTotalUn % 15 > 0 ? ` + ${entradaTotalUn % 15}` : ''})</span>
                  </div>
                </div>
              )}

              <button type="button" onClick={handleEntradaSubmit} disabled={entradaSaving || entradaTotalItens.length === 0}
                className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
                {entradaSaving ? 'Registrando...' : 'Registrar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe lote entrada */}
      {entradaLoteSelecionado && (() => {
        const lote = entradaLoteSelecionado;
        const totalUn = lote.itens.reduce((s, e) => s + e.quantidade, 0);
        const totalValor = lote.itens.reduce((s, e) => s + e.quantidade * e.valorUnitario, 0);
        const data = new Date(lote.itens[0].createdAt).toLocaleDateString('pt-BR');
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setEntradaLoteSelecionado(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
                <div>
                  <h3 className="font-semibold">Entrada {data}</h3>
                  <p className="text-[10px] text-content-muted">{lote.itens.length} modelo(s) · {totalUn} un</p>
                </div>
                <button onClick={() => setEntradaLoteSelecionado(null)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-2">
                {lote.itens.map((e, i) => (
                  <div key={e.id || i} className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{e.modelo}</p>
                      <p className="text-[10px] text-content-muted">{e.referencia} · {Math.floor(e.quantidade / 15)} pct{e.quantidade % 15 > 0 ? ` + ${e.quantidade % 15} un` : ''} · {e.quantidade} un</p>
                    </div>
                    <span className="text-xs font-bold text-blue-400 shrink-0">{formatCurrency(e.quantidade * e.valorUnitario)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-border-subtle">
                  <span className="text-[10px] text-content-muted">Total</span>
                  <span className="text-sm font-bold text-blue-400">{formatCurrency(totalValor)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal detalhe produto */}
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
                  <button onClick={async () => { await deleteProduto(produtoSelecionado.id); setProdutoSelecionado(null); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 py-2 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
