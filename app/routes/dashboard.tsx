import { useState, useMemo } from 'react';
import { Card } from '~/components/common/Card';
import { useVendas, useDespesas } from '~/hooks/useRealtime';
import { formatCurrency } from '~/utils/format';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAuth } from '~/contexts/AuthContext';
import type { Venda } from '~/models';

type Periodo = 'hoje' | '7dias' | '30dias' | 'ano' | 'tudo';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const { vendas: todasVendasRaw, loading: vendasLoading } = useVendas();
  const { despesas: todasDespesasRaw, loading: despesasLoading } = useDespesas();
  const [periodo, setPeriodo] = useState<Periodo>('30dias');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCondicao, setFiltroCondicao] = useState<string[]>([]);
  const loading = vendasLoading || despesasLoading;
  const todasVendas = todasVendasRaw;
  const todasDespesas = todasDespesasRaw;

  const filtrarPorPeriodo = <T extends { data: Date }>(items: T[]): T[] => {
    let result = items;
    if (periodo !== 'tudo' && !filtroDataInicio && !filtroDataFim) {
      const agora = new Date();
      const inicio = new Date();
      if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0);
      else if (periodo === '7dias') inicio.setDate(agora.getDate() - 7);
      else if (periodo === '30dias') inicio.setDate(agora.getDate() - 30);
      else if (periodo === 'ano') inicio.setFullYear(agora.getFullYear(), 0, 1);
      result = result.filter(i => new Date(i.data) >= inicio);
    }
    if (filtroDataInicio) result = result.filter(i => new Date(i.data) >= new Date(filtroDataInicio + 'T00:00:00'));
    if (filtroDataFim) result = result.filter(i => new Date(i.data) <= new Date(filtroDataFim + 'T23:59:59'));
    return result;
  };

  const vendasPeriodo = useMemo(() => {
    let result = filtrarPorPeriodo(todasVendas).filter((v: any) => !v.deletedAt);
    if (filtroCondicao.length > 0) {
      result = result.filter(v => {
        const c = v.condicaoPagamento;
        return filtroCondicao.some(f => {
          if (f === 'entrada') return c?.includes('_entrada');
          if (f === 'avista') return c === 'avista';
          return c === f || c === f + '_entrada';
        });
      });
    }
    return result;
  }, [todasVendas, periodo, filtroDataInicio, filtroDataFim, filtroCondicao]);
  const despesasPeriodo = useMemo(() => filtrarPorPeriodo(todasDespesas).filter((d: any) => !d.deletedAt), [todasDespesas, periodo, filtroDataInicio, filtroDataFim]);

  const totalVendas = vendasPeriodo.reduce((s, v) => s + v.valorTotal, 0);
  const totalDespesas = despesasPeriodo.reduce((s, d) => s + d.valor, 0);
  const saldo = totalVendas - totalDespesas;

  const toggleFiltroCondicao = (val: string) => {
    setFiltroCondicao(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const chartTheme = { backgroundColor: '#232328', textColor: '#f0f0f2', gridColor: '#2e2e36' };

  // --- Gerar categorias baseadas no período ---
  const categories = useMemo(() => {
    if (periodo === 'ano' || periodo === 'tudo') {
      return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    }
    const days = periodo === 'hoje' ? 1 : periodo === '7dias' ? 7 : 30;
    const cats: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      cats.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return cats;
  }, [periodo]);

  const isMonthly = periodo === 'ano' || periodo === 'tudo';
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const bucketKey = (date: Date) => {
    if (isMonthly) return meses[date.getMonth()];
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // --- Dados vendas por dia/mês ---
  const vendasData = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(c => map[c] = 0);
    vendasPeriodo.forEach(v => { const k = bucketKey(new Date(v.data)); if (map[k] !== undefined) map[k] += v.valorTotal; });
    return categories.map(c => map[c] || 0);
  }, [vendasPeriodo, categories]);

  // --- Dados despesas por dia/mês ---
  const despesasData = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(c => map[c] = 0);
    despesasPeriodo.forEach(d => { const k = bucketKey(new Date(d.data)); if (map[k] !== undefined) map[k] += d.valor; });
    return categories.map(c => map[c] || 0);
  }, [despesasPeriodo, categories]);

  // --- Vendas por vendedor ---
  const vendedorData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasPeriodo.forEach(v => { const n = v.vendedorNome || 'Sem vendedor'; map[n] = (map[n] || 0) + v.valorTotal; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return { categories: sorted.map(([n]) => n), values: sorted.map(([, v]) => v) };
  }, [vendasPeriodo]);

  // --- Top clientes ---
  const clienteData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasPeriodo.forEach(v => { const n = v.clienteNome || 'Sem cliente'; map[n] = (map[n] || 0) + v.valorTotal; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { categories: sorted.map(([n]) => n), values: sorted.map(([, v]) => v) };
  }, [vendasPeriodo]);

  // --- Despesas por tipo ---
  const despesaTipoData = useMemo(() => {
    const map: Record<string, number> = {};
    despesasPeriodo.forEach(d => { const t = d.tipo || 'Outros'; map[t] = (map[t] || 0) + d.valor; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return { categories: sorted.map(([n]) => n), values: sorted.map(([, v]) => v) };
  }, [despesasPeriodo]);

  // --- Despesas por usuário ---
  const despesaUsuarioData = useMemo(() => {
    const map: Record<string, number> = {};
    despesasPeriodo.forEach(d => { const n = d.usuarioNome || 'Sem usuário'; map[n] = (map[n] || 0) + d.valor; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return { categories: sorted.map(([n]) => n), values: sorted.map(([, v]) => v) };
  }, [despesasPeriodo]);

  // --- Top modelos vendidos ---
  const modeloData = useMemo(() => {
    const map: Record<string, { modelo: string; pacotes: number; pares: number; valor: number }> = {};
    vendasPeriodo.forEach(v => v.produtos.forEach(p => {
      const k = p.modelo;
      if (!map[k]) map[k] = { modelo: k, pacotes: 0, pares: 0, valor: 0 };
      if (p.tipo === 'pacote') {
        map[k].pacotes += p.quantidade;
        map[k].pares += p.quantidade * 15;
      } else {
        map[k].pares += p.quantidade;
      }
      map[k].valor += p.valorTotal;
    }));
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [vendasPeriodo]);

  const baseAxis = (cats: string[], rotateLabels = false): Partial<Highcharts.XAxisOptions> => ({
    categories: cats,
    labels: { rotation: rotateLabels ? -45 : 0, style: { fontSize: '9px', color: chartTheme.textColor } },
    lineColor: chartTheme.gridColor, tickColor: chartTheme.gridColor,
  });

  const baseYAxis: Highcharts.YAxisOptions = {
    title: { text: null },
    labels: { formatter: function() { return 'R$ ' + (this.value as number).toFixed(0); }, style: { fontSize: '9px', color: chartTheme.textColor } },
    gridLineColor: chartTheme.gridColor,
  };

  const baseTooltip: Highcharts.TooltipOptions = {
    formatter: function() { return '<b>' + this.x + '</b><br/>' + this.series.name + ': ' + formatCurrency(this.y as number); }
  };

  // Gráfico vendas timeline
  const optVendasTimeline: Highcharts.Options = {
    chart: { type: 'area', height: 250, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Vendas no Período', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: { ...baseAxis(categories, true), labels: { step: Math.max(1, Math.floor(categories.length / 8)), rotation: -45, style: { fontSize: '9px', color: chartTheme.textColor } } },
    yAxis: baseYAxis,
    series: [{ type: 'area', name: 'Vendas', data: vendasData, color: '#10b981', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(16,185,129,0.3)'], [1, 'rgba(16,185,129,0)']] } }],
    credits: { enabled: false }, legend: { enabled: false }, tooltip: baseTooltip,
  };

  // Gráfico despesas timeline
  const optDespesasTimeline: Highcharts.Options = {
    chart: { type: 'area', height: 250, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Despesas no Período', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: { ...baseAxis(categories, true), labels: { step: Math.max(1, Math.floor(categories.length / 8)), rotation: -45, style: { fontSize: '9px', color: chartTheme.textColor } } },
    yAxis: baseYAxis,
    series: [{ type: 'area', name: 'Despesas', data: despesasData, color: '#ef4444', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(239,68,68,0.3)'], [1, 'rgba(239,68,68,0)']] } }],
    credits: { enabled: false }, legend: { enabled: false }, tooltip: baseTooltip,
  };

  // Vendas por vendedor
  const optVendedor: Highcharts.Options = {
    chart: { type: 'bar', height: 220, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Por Vendedor', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(vendedorData.categories) as Highcharts.XAxisOptions,
    yAxis: baseYAxis,
    series: [{ type: 'bar', name: 'Vendas', data: vendedorData.values, color: '#10b981' }],
    credits: { enabled: false }, legend: { enabled: false }, tooltip: baseTooltip,
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function() { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
  };

  // Top clientes
  const optClientes: Highcharts.Options = {
    chart: { type: 'bar', height: 220, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Top Clientes', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(clienteData.categories) as Highcharts.XAxisOptions,
    yAxis: baseYAxis,
    series: [{ type: 'bar', name: 'Compras', data: clienteData.values, color: '#f59e0b' }],
    credits: { enabled: false }, legend: { enabled: false }, tooltip: baseTooltip,
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function() { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
  };

  // Despesas por tipo
  const optDespesaTipo: Highcharts.Options = {
    chart: { type: 'bar', height: 220, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Por Tipo', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(despesaTipoData.categories) as Highcharts.XAxisOptions,
    yAxis: baseYAxis,
    series: [{ type: 'bar', name: 'Despesas', data: despesaTipoData.values, color: '#ef4444' }],
    credits: { enabled: false }, legend: { enabled: false }, tooltip: baseTooltip,
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function() { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
  };

  // Despesas por usuário
  const optDespesaUsuario: Highcharts.Options = {
    chart: { type: 'bar', height: 220, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Por Usuário', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(despesaUsuarioData.categories) as Highcharts.XAxisOptions,
    yAxis: baseYAxis,
    series: [{ type: 'bar', name: 'Despesas', data: despesaUsuarioData.values, color: '#ef4444' }],
    credits: { enabled: false }, legend: { enabled: false }, tooltip: baseTooltip,
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function() { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
  };

  // Gráfico top modelos
  const optModelos: Highcharts.Options = modeloData.length > 0 ? {
    chart: { type: 'bar', height: Math.max(220, modeloData.slice(0, 10).length * 30 + 60), backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Top Modelos', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(modeloData.slice(0, 10).map(m => m.modelo)) as Highcharts.XAxisOptions,
    yAxis: baseYAxis,
    series: [{ type: 'bar', name: 'Vendas', data: modeloData.slice(0, 10).map(m => m.valor), color: '#3b82f6' }],
    credits: { enabled: false }, legend: { enabled: false }, tooltip: baseTooltip,
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function() { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
  } : {};

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
        {([
          { value: 'hoje', label: 'Hoje' },
          { value: '7dias', label: '7 dias' },
          { value: '30dias', label: '30 dias' },
          { value: 'ano', label: 'Ano' },
          { value: 'tudo', label: 'Tudo' },
        ] as { value: Periodo; label: string }[]).map(opt => (
          <button key={opt.value} onClick={() => { setPeriodo(opt.value); setFiltroDataInicio(''); setFiltroDataFim(''); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              periodo === opt.value && !filtroDataInicio && !filtroDataFim
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-elevated text-content-secondary hover:bg-border-medium'
            }`}>
            {opt.label}
          </button>
        ))}
        <span className="hidden lg:inline text-content-muted/30">│</span>
        <input type="date" value={filtroDataInicio} onChange={(e) => { setFiltroDataInicio(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
          className={`rounded-lg border bg-elevated px-2 py-1.5 text-xs focus:outline-none focus:border-border-medium w-[7.5rem] transition-colors ${filtroDataInicio ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        <span className="text-[10px] text-content-muted">até</span>
        <input type="date" value={filtroDataFim} onChange={(e) => { setFiltroDataFim(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
          className={`rounded-lg border bg-elevated px-2 py-1.5 text-xs focus:outline-none focus:border-border-medium w-[7.5rem] transition-colors ${filtroDataFim ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        <span className="hidden lg:inline text-content-muted/30">│</span>
        <div className="flex items-center gap-1.5">
          {[
            { value: 'avista', label: 'À Vista', cor: 'bg-blue-600/10 text-blue-400 border-blue-600/30' },
            { value: 'entrada', label: 'Entrada', cor: 'bg-blue-600/10 text-blue-400 border-blue-600/30' },
            { value: '1x', label: '1x', cor: 'bg-orange-600/10 text-orange-400 border-orange-600/30' },
            { value: '2x', label: '2x', cor: 'bg-orange-600/10 text-orange-400 border-orange-600/30' },
            { value: '3x', label: '3x', cor: 'bg-orange-600/10 text-orange-400 border-orange-600/30' },
          ].map(opt => (
            <button key={opt.value} onClick={() => toggleFiltroCondicao(opt.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${
                filtroCondicao.includes(opt.value) ? opt.cor : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'
              }`}>
              {opt.label}
            </button>
          ))}
          {filtroCondicao.length > 0 && (
            <button onClick={() => setFiltroCondicao([])} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition">
              Limpar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-content-secondary">Carregando...</p>
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-800 cursor-pointer hover:brightness-110 transition" onClick={() => navigate('/vendas')}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1"><ShoppingBag size={16} className="text-green-400" /><h3 className="text-xs font-medium text-content-secondary">Vendas</h3></div>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(totalVendas)}</p>
                  <p className="text-xs text-content-muted">{vendasPeriodo.length} {vendasPeriodo.length === 1 ? 'venda' : 'vendas'} · Ticket {vendasPeriodo.length > 0 ? formatCurrency(totalVendas / vendasPeriodo.length) : 'R$ 0'}</p>
                </div>
                <div className="bg-green-900/30 p-2 rounded-full"><TrendingUp size={18} className="text-green-400" /></div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-red-900/20 to-rose-900/20 border-red-800 cursor-pointer hover:brightness-110 transition" onClick={() => navigate('/despesas')}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Receipt size={16} className="text-red-400" /><h3 className="text-xs font-medium text-content-secondary">Despesas</h3></div>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDespesas)}</p>
                  <p className="text-xs text-content-muted">{despesasPeriodo.length} {despesasPeriodo.length === 1 ? 'despesa' : 'despesas'}</p>
                </div>
                <div className="bg-red-900/30 p-2 rounded-full"><TrendingDown size={18} className="text-red-400" /></div>
              </div>
            </Card>
            <Card className={`sm:col-span-2 lg:col-span-1 ${isAdmin ? (saldo >= 0 ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-800' : 'bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-800') : 'bg-gradient-to-br from-purple-900/20 to-violet-900/20 border-purple-800'}`}>
              <div className="flex items-start justify-between">
                <div>
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className={saldo >= 0 ? 'text-blue-400' : 'text-orange-400'} /><h3 className="text-xs font-medium text-content-secondary">Saldo</h3></div>
                      <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{formatCurrency(saldo)}</p>
                      <p className="text-xs text-content-muted">{saldo >= 0 ? 'Lucro' : 'Prejuízo'} · Margem {totalVendas > 0 ? `${((saldo / totalVendas) * 100).toFixed(1)}%` : '0%'}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className="text-purple-400" /><h3 className="text-xs font-medium text-content-secondary">Comissão (10%)</h3></div>
                      <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalVendas * 0.1)}</p>
                      <p className="text-xs text-content-muted">sobre {formatCurrency(totalVendas)}</p>
                    </>
                  )}
                </div>
                <div className={`p-2 rounded-full ${isAdmin ? (saldo >= 0 ? 'bg-blue-900/30' : 'bg-orange-900/30') : 'bg-purple-900/30'}`}><DollarSign size={18} className={isAdmin ? (saldo >= 0 ? 'text-blue-400' : 'text-orange-400') : 'text-purple-400'} /></div>
              </div>
            </Card>
          </div>

          {/* Gráficos lado a lado: Vendas (esq) | Despesas (dir) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna Vendas */}
            <div className="space-y-4">
              <Card><HighchartsReact highcharts={Highcharts} options={optVendasTimeline} /></Card>
              {isAdmin && vendedorData.categories.length > 0 && (
                <Card><HighchartsReact highcharts={Highcharts} options={optVendedor} /></Card>
              )}
              {clienteData.categories.length > 0 && (
                <Card><HighchartsReact highcharts={Highcharts} options={optClientes} /></Card>
              )}
            </div>

            {/* Coluna Despesas */}
            <div className="space-y-4">
              <Card><HighchartsReact highcharts={Highcharts} options={optDespesasTimeline} /></Card>
              {isAdmin && despesaUsuarioData.categories.length > 0 && (
                <Card><HighchartsReact highcharts={Highcharts} options={optDespesaUsuario} /></Card>
              )}
              {despesaTipoData.categories.length > 0 && (
                <Card><HighchartsReact highcharts={Highcharts} options={optDespesaTipo} /></Card>
              )}
            </div>
          </div>

          {/* Top Modelos - gráfico + tabela */}
          {modeloData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <Card><HighchartsReact highcharts={Highcharts} options={optModelos} /></Card>
              <Card>
                <p className="text-xs font-medium text-content-secondary mb-2">Ranking de Modelos</p>
                <div className="rounded-xl border border-border-subtle overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-subtle bg-elevated/50">
                        <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">#</th>
                        <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Modelo</th>
                        <th className="px-2.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted">Pacotes</th>
                        <th className="px-2.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted">Pares</th>
                        <th className="px-2.5 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {modeloData.map((m, i) => (
                        <tr key={m.modelo}>
                          <td className="px-2.5 py-1.5 text-xs text-content-muted">{i + 1}º</td>
                          <td className="px-2.5 py-1.5 text-xs font-medium truncate max-w-[120px]">{m.modelo}</td>
                          <td className="px-2.5 py-1.5 text-xs text-center text-content-muted">{m.pacotes || '—'}</td>
                          <td className="px-2.5 py-1.5 text-xs text-center text-blue-400">{m.pares}</td>
                          <td className="px-2.5 py-1.5 text-xs font-semibold text-green-400 text-right whitespace-nowrap">{formatCurrency(m.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
