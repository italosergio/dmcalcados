import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { ShoppingBag, DollarSign, Warehouse, Users, LayoutDashboard, RefreshCw, CreditCard, Banknote, Navigation, Package, Bell, Activity, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '~/contexts/AuthContext';
import { userIsAdmin, userIsVendedor, userCanAccessAdmin, getUserRoles } from '~/models';
import type { Ciclo } from '~/models';
import { useVendas, useClientes, useCiclos, useDespesas, useDepositos, useVales } from '~/hooks/useRealtime';
import { formatCurrency } from '~/utils/format';
import { CicloDashboard } from '~/components/ciclos/CicloDashboard';

const dashboardImage = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80';
const rotasImage = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80';
const clientesImage = 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=900&q=80';
const clientesBannerImage = 'https://images.pexels.com/photos/8470843/pexels-photo-8470843.jpeg?auto=compress&cs=tinysrgb&w=1200';

const cards = [
  { to: '/vendas', icon: ShoppingBag, label: 'Vendas', desc: 'Registrar e acompanhar vendas', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80', color: 'from-green-900/10 to-green-950/10', border: 'hover:border-green-500/40', roles: ['all'] },
  { to: '/despesas', icon: DollarSign, label: 'Despesas', desc: 'Controle de gastos por dia', img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80', color: 'from-red-900/10 to-red-950/10', border: 'hover:border-red-500/40', roles: ['all'] },
  { to: '/ciclos', icon: RefreshCw, label: 'Ciclos', desc: 'Gerenciar ciclos de venda', img: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&q=80', color: 'from-emerald-900/10 to-emerald-950/10', border: 'hover:border-emerald-500/40', roles: ['admin'] },
  { to: '/meu-estoque', icon: Package, label: 'Meu Estoque', desc: 'Pacotes no carro', img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80', color: 'from-sky-900/10 to-sky-950/10', border: 'hover:border-sky-500/40', roles: ['vendedor'] },
  { to: '/meus-clientes', icon: Users, label: 'Meus Clientes', desc: 'Carteira de clientes', img: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80', color: 'from-violet-900/10 to-violet-950/10', border: 'hover:border-violet-500/40', roles: ['vendedor'] },
  { to: '/estoque', icon: Warehouse, label: 'Estoque', desc: 'Produtos e entradas', img: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=80', color: 'from-blue-900/10 to-blue-950/10', border: 'hover:border-blue-500/40', roles: ['admin'] },
  { to: '/produtos', icon: Package, label: 'Produtos', desc: 'Catálogo de modelos', img: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80', color: 'from-orange-900/10 to-orange-950/10', border: 'hover:border-orange-500/40', roles: ['admin'] },
  { to: '/clientes', icon: Users, label: 'Clientes', desc: 'Todos os clientes', img: clientesImage, color: 'from-purple-900/10 to-purple-950/10', border: 'hover:border-purple-500/40', roles: ['admin'] },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Gráficos e métricas', img: dashboardImage, color: 'from-cyan-900/20 to-cyan-950/40', border: 'hover:border-cyan-500/40', roles: ['all'] },
  { to: '/pagamentos', icon: CreditCard, label: 'Pagamentos', desc: 'Parcelas e cobranças', img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80', color: 'from-indigo-900/10 to-indigo-950/10', border: 'hover:border-indigo-500/40', roles: ['adminAccess'] },
  { to: '/vales', icon: Banknote, label: 'Vales', desc: 'Vales de funcionários', img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80', color: 'from-amber-900/10 to-amber-950/10', border: 'hover:border-amber-500/40', roles: ['adminAccess'] },
  { to: '/rotas', icon: Navigation, label: 'Rotas', desc: 'Rastreamento GPS', img: rotasImage, color: 'from-teal-900/10 to-teal-950/10', border: 'hover:border-teal-500/40', roles: ['adminAccess'] },
  { to: '/historico', icon: Bell, label: 'Notificações', desc: 'Alertas e eventos recentes', img: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80', color: 'from-slate-800/10 to-slate-900/10', border: 'hover:border-slate-400/40', roles: ['admin'] },
  { to: '/analytics', icon: Activity, label: 'Analytics', desc: 'Análises avançadas', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80', color: 'from-fuchsia-900/10 to-fuchsia-950/10', border: 'hover:border-fuchsia-500/40', roles: ['dev'] },
];

export default function PainelPage() {
  const { user } = useAuth();

  const visibleCards = cards.filter(c => {
    if (c.roles.includes('all')) return true;
    if (c.roles.includes('admin') && user && userIsAdmin(user)) return true;
    if (c.roles.includes('vendedor') && user && userIsVendedor(user)) return true;
    if (c.roles.includes('adminAccess') && user && userCanAccessAdmin(user)) return true;
    if (c.roles.includes('dev') && user && getUserRoles(user).includes('desenvolvedor')) return true;
    return false;
  });

  const [busca, setBusca] = useState('');
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [HC, setHC] = useState<any>(null);
  const [HCReact, setHCReact] = useState<any>(null);
  const { vendas } = useVendas();
  const { clientes } = useClientes();
  const { ciclos } = useCiclos();
  const { despesas } = useDespesas();
  const { depositos } = useDepositos();
  const { valeCards } = useVales();
  const [modalCiclo, setModalCiclo] = useState<Ciclo | null>(null);

  useEffect(() => {
    import('highcharts').then(m => setHC(m.default));
    import('highcharts-react-official').then(m => setHCReact(() => m.default));
  }, []);

  const last30 = useMemo(() => {
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    return vendas.filter(v => !(v as any).deletedAt && new Date(v.data) >= d30);
  }, [vendas]);

  const chartTheme = { bg: 'transparent', text: '#e0e0e4', muted: '#888', grid: '#2e2e36' };

  // Vendas por dia (area)
  const vendasChart = useMemo(() => {
    if (!HC) return null;
    const map: Record<string, number> = {};
    last30.forEach(v => { const d = new Date(v.data).toISOString().slice(0, 10); map[d] = (map[d] || 0) + v.valorTotal; });
    const days = Object.keys(map).sort();
    return {
      chart: { type: 'area', height: 180, backgroundColor: chartTheme.bg, margin: [10, 15, 30, 50] },
      title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
      xAxis: { categories: days.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)), labels: { style: { fontSize: '9px', color: chartTheme.muted } }, lineColor: '#444', tickLength: 0, tickInterval: Math.max(1, Math.floor(days.length / 8)) },
      yAxis: { gridLineColor: chartTheme.grid, labels: { style: { fontSize: '8px', color: chartTheme.muted }, formatter: function(this: any) { return this.value >= 1000 ? (this.value / 1000).toFixed(0) + 'k' : this.value; } }, title: { text: undefined } },
      tooltip: { backgroundColor: '#1a1a1e', borderColor: '#333', style: { fontSize: '11px', color: '#fff' }, formatter: function(this: any) { return `<b>${this.x}</b><br/>${formatCurrency(this.y)}`; } },
      series: [{ data: days.map(d => map[d]), color: '#10b981', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(16,185,129,0.3)'], [1, 'rgba(16,185,129,0)']] }, lineWidth: 2.5, marker: { enabled: false } }],
    } as any;
  }, [HC, last30]);

  // Top modelos (bar horizontal — legível)
  const modelosChart = useMemo(() => {
    if (!HC) return null;
    const map: Record<string, number> = {};
    last30.forEach(v => v.produtos?.forEach(p => {
      const pct = (p as any).tipo === 'unidade' ? p.quantidade / 15 : p.quantidade;
      map[p.modelo] = (map[p.modelo] || 0) + pct;
    }));
    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 6);
    const grad = { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(200,200,210,0.6)'], [1, 'rgba(255,255,255,0)']] };
    return {
      chart: { type: 'bar', height: 180, backgroundColor: chartTheme.bg, margin: [5, 15, 5, 90] },
      title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
      xAxis: { categories: sorted.map(([m]) => m), labels: { style: { fontSize: '10px', color: chartTheme.text } }, lineWidth: 0, tickLength: 0 },
      yAxis: { visible: false },
      tooltip: { backgroundColor: '#1a1a1e', borderColor: '#333', style: { fontSize: '11px', color: '#fff' }, formatter: function(this: any) { return `<b>${this.point.category}</b>: ${Number(this.y).toFixed(1)} pct`; } },
      plotOptions: { bar: { borderWidth: 0, borderRadius: 3, dataLabels: { enabled: true, align: 'left' as const, x: 4, style: { fontSize: '10px', color: chartTheme.text, textOutline: 'none', fontWeight: 'bold' }, overflow: 'allow' as const, crop: false, formatter: function(this: any) { const v = this.y; return v % 1 === 0 ? `${v}` : v.toFixed(1); } } } },
      series: [{ data: sorted.map(([, v]) => v), color: grad }],
    } as any;
  }, [HC, last30]);

  // À vista vs Prazo
  const pagamentoChart = useMemo(() => {
    if (!HC) return null;
    const avista = last30.filter(v => v.condicaoPagamento === 'avista').reduce((s, v) => s + v.valorTotal, 0);
    const prazo = last30.reduce((s, v) => s + (v.valorPrazo || 0), 0);
    const entradas = last30.filter(v => v.condicaoPagamento?.includes('_entrada')).reduce((s, v) => s + (v.valorAvista || 0), 0);
    const gradV = (top: string) => ({ linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, top], [1, 'rgba(255,255,255,0)']] });
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const dlStyle = { fontSize: '9px', color: 'rgba(255,255,255,0.35)', textOutline: 'none', fontWeight: '600' as const };
    const dlHoverStyle = { fontSize: '11px', color: '#fff', textOutline: 'none', fontWeight: 'bold' as const };
    const avistaChart = {
      chart: { type: 'column', height: 160, backgroundColor: chartTheme.bg, margin: [10, 15, 5, 15] },
      title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
      xAxis: { categories: ['À vista', 'Entradas'], labels: { style: { fontSize: '11px', color: '#888' } }, lineWidth: 0, tickLength: 0 },
      yAxis: { visible: false },
      tooltip: { backgroundColor: '#1a1a1e', borderColor: '#333', style: { fontSize: '11px', color: '#fff' }, formatter: function(this: any) { return `<b>${this.point.category}</b><br/>${formatCurrency(this.y)}`; } },
      plotOptions: { column: { borderWidth: 0, borderRadius: 5, colorByPoint: true, states: { hover: { brightness: 0.15 } }, dataLabels: { enabled: true, style: isMobile ? dlStyle : dlStyle, formatter: function(this: any) { return formatCurrency(this.y); } }, point: { events: { mouseOver: function(this: any) { this.update({ dataLabels: { style: dlHoverStyle } }, false); this.series.chart.redraw(false); }, mouseOut: function(this: any) { this.update({ dataLabels: { style: dlStyle } }, false); this.series.chart.redraw(false); } } } } },
      series: [{ data: [{ y: avista, color: gradV('rgba(180,180,190,0.7)') }, { y: entradas, color: gradV('rgba(160,160,175,0.5)') }] }],
    } as any;
    const prazoChart = {
      chart: { type: 'column', height: 160, backgroundColor: chartTheme.bg, margin: [10, 15, 5, 15] },
      title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
      xAxis: { categories: ['À prazo'], labels: { style: { fontSize: '11px', color: '#888' } }, lineWidth: 0, tickLength: 0 },
      yAxis: { visible: false },
      tooltip: { backgroundColor: '#1a1a1e', borderColor: '#333', style: { fontSize: '11px', color: '#fff' }, formatter: function(this: any) { return `<b>${this.point.category}</b><br/>${formatCurrency(this.y)}`; } },
      plotOptions: { column: { borderWidth: 0, borderRadius: 5, states: { hover: { brightness: 0.15 } }, dataLabels: { enabled: true, style: isMobile ? dlStyle : dlStyle, formatter: function(this: any) { return formatCurrency(this.y); } }, point: { events: { mouseOver: function(this: any) { this.update({ dataLabels: { style: dlHoverStyle } }, false); this.series.chart.redraw(false); }, mouseOut: function(this: any) { this.update({ dataLabels: { style: dlStyle } }, false); this.series.chart.redraw(false); } } } } },
      series: [{ data: [{ y: prazo, color: gradV('rgba(200,200,210,0.6)') }] }],
    } as any;
    return { avistaChart, prazoChart, avista, entradas, prazo };
  }, [HC, last30]);

  const totalVendas30 = last30.reduce((s, v) => s + v.valorTotal, 0);
  const ciclosAtivos = ciclos.filter(c => c.status === 'ativo').length;
  const totalClientes = clientes.filter((c: any) => !c.deletedAt).length;

  // Métricas por ciclo para o slide
  const ciclosComMetricas = useMemo(() => {
    return ciclos.filter(c => !c.deletedAt).slice(0, 8).map(c => {
      const pIds = new Set([c.vendedorId, ...(c.participantes || []).map((p: any) => p.id)]);
      const vc = vendas.filter((v: any) => {
        if (v.deletedAt) return false;
        if (v.cicloId === c.id) return true;
        if (!pIds.has(v.vendedorId)) return false;
        const d = new Date(v.data).toISOString().slice(0, 10);
        if (c.dataInicio && d < c.dataInicio) return false;
        if (c.dataFim && d > c.dataFim) return false;
        return true;
      });
      const dc = despesas.filter((d: any) => {
        if (d.deletedAt) return false;
        if (d.cicloId === c.id) return true;
        if (!pIds.has(d.usuarioId)) return false;
        const dt = new Date(d.data).toISOString().slice(0, 10);
        if (c.dataInicio && dt < c.dataInicio) return false;
        if (c.dataFim && dt > c.dataFim) return false;
        return true;
      });
      const totalV = vc.reduce((s: number, v: any) => s + v.valorTotal, 0);
      const totalD = dc.reduce((s: number, d: any) => s + d.valor, 0);
      // Sparkline por dia
      const porDia: Record<string, number> = {};
      vc.forEach((v: any) => { const d = new Date(v.data).toISOString().slice(0, 10); porDia[d] = (porDia[d] || 0) + v.valorTotal; });
      const days = Object.keys(porDia).sort();
      const spark = days.map(d => porDia[d]);
      const pessoas = [c.vendedorNome, ...(c.participantes || []).map((p: any) => p.nome)];
      return { ...c, totalV, totalD, saldo: totalV - totalD, qtdVendas: vc.length, spark, pessoas };
    });
  }, [ciclos, vendas, despesas]);

  const ciclosAtivosData = ciclosComMetricas.filter(c => c.status === 'ativo').slice(0, 4);
  const ciclosFechadosData = ciclosComMetricas.filter(c => c.status !== 'ativo').slice(0, 4);

  // Vendas recentes para slide de clientes (últimas 6)
  const vendasRecentes = useMemo(() => {
    return [...vendas].filter((v: any) => !v.deletedAt).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 6);
  }, [vendas]);

  const slides: any[] = [
    { key: 'vendas-chart', label: 'Dashboard de Vendas', sub: `${formatCurrency(totalVendas30)} nos últimos 30 dias · ${last30.length} vendas`, chart: vendasChart, img: dashboardImage, to: '/dashboard' },
    { key: 'modelos', label: 'Ranking de Modelos', sub: 'Modelos mais vendidos nos últimos 30 dias', chart: modelosChart, img: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80', to: '/dashboard' },
    { key: 'vendas-info', label: 'Vendas', sub: `${last30.length} vendas realizadas`, chart: null, stat: formatCurrency(totalVendas30), statLabel: 'nos últimos 30 dias', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80', to: '/vendas' },
    { key: 'clientes', label: 'Clientes', sub: `${totalClientes} cadastrados · Últimas vendas`, customClientes: true, img: clientesBannerImage, to: '/clientes' },
    { key: 'ciclos', label: 'Ciclos', sub: `${ciclosAtivosData.length} ativo${ciclosAtivosData.length !== 1 ? 's' : ''} · ${ciclosFechadosData.length} fechado${ciclosFechadosData.length !== 1 ? 's' : ''}`, custom: true, img: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&q=80', to: '/ciclos' },
    { key: 'pagamento', label: 'Condições de Pagamento', sub: `À vista ${formatCurrency(pagamentoChart?.avista || 0)} · Prazo ${formatCurrency(pagamentoChart?.prazo || 0)}`, customPagamento: true, img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80', to: '/dashboard' },
  ];

  const startTimer = () => { clearInterval(timerRef.current); timerRef.current = setInterval(() => setSlide(s => (s + 1) % slides.length), 5000); };
  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current); }, [slides.length]);
  const goSlide = (i: number) => { setSlide(i); startTimer(); };
  const handleHover = (hovering: boolean) => { setPaused(hovering); if (hovering) clearInterval(timerRef.current); else startTimer(); };

  const filteredCards = visibleCards.filter(c => !busca || c.label.toLowerCase().includes(busca.toLowerCase()) || c.desc.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      {/* Carrossel Destaques */}
      <div className="mb-5 relative">
        <p className="text-[10px] text-content-muted font-medium uppercase tracking-wide mb-2">Destaques</p>
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle" style={{ height: 260 }}
          onMouseEnter={() => handleHover(true)} onMouseLeave={() => handleHover(false)}>
          {slides.map((s, i) => (
            <Link key={s.key} to={s.to}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${i === slide ? 'opacity-100 translate-x-0 z-10' : i < slide || (slide === 0 && i === slides.length - 1) ? 'opacity-0 -translate-x-full z-0 pointer-events-none' : 'opacity-0 translate-x-full z-0 pointer-events-none'}`}>
              {s.cssBg ? (
                <div className="absolute inset-0 bg-[#0a0a0f]">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #10b98140 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f640 0%, transparent 50%), radial-gradient(circle at 60% 80%, #8b5cf640 0%, transparent 40%)' }} />
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                </div>
              ) : (
                <>
                  <img src={s.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/70" />
                </>
              )}
              <div className="relative h-full flex flex-col p-5">
                <div className="mb-1">
                  <h3 className="text-base font-bold text-white drop-shadow-lg" style={{ fontFamily: '"Raleway", sans-serif' }}>{s.label}</h3>
                  <p className="text-xs text-white/60" style={{ fontFamily: '"Raleway", sans-serif' }}>{s.sub}</p>
                </div>
                <div className="flex-1 min-h-0 mt-1">
                  {s.custom ? (() => {
                    // Ciclos: se não tem ativos, fechados ocupam tudo
                    const hasAtivos = ciclosAtivosData.length > 0;
                    const hasFechados = ciclosFechadosData.length > 0;
                    const renderCicloCard = (c: any, color: string, sparkColor: string, dimmed?: boolean) => {
                      const sparkOpts = HC ? {
                        chart: { type: 'line', height: 30, width: 80, backgroundColor: 'transparent', margin: [2, 2, 2, 2] },
                        title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
                        xAxis: { visible: false }, yAxis: { visible: false }, tooltip: { enabled: false },
                        plotOptions: { line: { marker: { enabled: false }, lineWidth: 1.5 } },
                        series: [{ data: c.spark, color: sparkColor }],
                      } as any : null;
                      return (
                        <div key={c.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModalCiclo(c); }} className={`rounded-lg bg-white/5 border border-white/10 p-2.5 cursor-pointer hover:bg-white/10 transition ${dimmed ? 'opacity-60' : ''}`}>
                          <p className="text-[10px] font-semibold text-white truncate">{c.titulo || c.pessoas[0]}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-sm font-bold ${color}`}>{formatCurrency(c.totalV)}</span>
                            {HC && HCReact && sparkOpts && c.spark.length > 1 && <HCReact highcharts={HC} options={sparkOpts} />}
                          </div>
                          <p className="text-[9px] text-white/40 mt-0.5">{c.qtdVendas} vendas · Saldo {formatCurrency(c.saldo)}</p>
                        </div>
                      );
                    };
                    const cols = hasAtivos && hasFechados ? 'grid-cols-2' : 'grid-cols-1';
                    return (
                      <div className={`h-full grid ${cols} gap-3 overflow-hidden`}>
                        {hasAtivos && (
                          <div>
                            <p className="text-[9px] text-green-400 font-semibold uppercase tracking-wide mb-1.5">Ativos</p>
                            <div className={`grid ${!hasFechados ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5`}>
                              {ciclosAtivosData.map(c => renderCicloCard(c, 'text-green-400', '#10b981'))}
                            </div>
                          </div>
                        )}
                        {hasFechados && (
                          <div>
                            <p className="text-[9px] text-content-muted font-semibold uppercase tracking-wide mb-1.5">Fechados</p>
                            <div className={`grid ${!hasAtivos ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5`}>
                              {ciclosFechadosData.map(c => renderCicloCard(c, 'text-white/50', '#6b7280', true))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })() : s.customClientes ? (
                    <div className="h-full grid grid-cols-2 gap-3 overflow-hidden">
                      <div>
                        <p className="text-[9px] text-green-400 font-semibold uppercase tracking-wide mb-1.5">Últimas vendas</p>
                        <div className="space-y-1.5">
                          {vendasRecentes.slice(0, 3).map(v => (
                            <div key={v.id} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                              <div className="flex justify-between items-center">
                                <div className="rounded bg-white/10 h-3 w-20 animate-pulse" />
                                <span className="text-sm font-bold text-green-400">{formatCurrency(v.valorTotal)}</span>
                              </div>
                              <p className="text-[9px] text-white/40 mt-0.5">{new Date(v.data).toLocaleDateString('pt-BR')} · {v.produtos?.length || 0} item{(v.produtos?.length || 0) > 1 ? 's' : ''}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-wide mb-1.5">Maiores valores</p>
                        <div className="space-y-1.5">
                          {[...last30].sort((a, b) => b.valorTotal - a.valorTotal).slice(0, 3).map(v => (
                            <div key={v.id} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                              <div className="flex justify-between items-center">
                                <div className="rounded bg-white/10 h-3 w-20 animate-pulse" />
                                <span className="text-sm font-bold text-blue-400">{formatCurrency(v.valorTotal)}</span>
                              </div>
                              <p className="text-[9px] text-white/40 mt-0.5">{v.condicaoPagamento === 'avista' ? 'À vista' : 'Prazo'} · {v.vendedorNome}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : s.customPagamento && HC && HCReact && pagamentoChart ? (
                    <div className="h-full grid grid-cols-2 gap-3 overflow-hidden">
                      <div className="text-center">
                        <p className="text-[9px] text-content-muted font-semibold uppercase tracking-wide mb-1.5">À vista + Entradas</p>
                        <HCReact highcharts={HC} options={pagamentoChart.avistaChart} />
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-content-muted font-semibold uppercase tracking-wide mb-1.5">À prazo</p>
                        <HCReact highcharts={HC} options={pagamentoChart.prazoChart} />
                      </div>
                    </div>
                  ) : s.chart && HC && HCReact ? (
                    <HCReact highcharts={HC} options={s.chart} />
                  ) : s.stat ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-5xl font-black text-white drop-shadow-lg">{s.stat}</p>
                        <p className="text-sm text-white/50 mt-1">{s.statLabel}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
          <div onClick={(e) => { e.preventDefault(); goSlide((slide - 1 + slides.length) % slides.length); }}
            className="absolute left-0 top-0 bottom-0 w-[50px] z-20 flex items-center justify-center cursor-pointer hover:bg-black/30 transition group/arrow">
            <ChevronLeft size={18} className="text-white/70 opacity-0 group-hover/arrow:opacity-100 transition" />
          </div>
          <div onClick={(e) => { e.preventDefault(); goSlide((slide + 1) % slides.length); }}
            className="absolute right-0 top-0 bottom-0 w-[50px] z-20 flex items-center justify-center cursor-pointer hover:bg-black/30 transition group/arrow">
            <ChevronRight size={18} className="text-white/70 opacity-0 group-hover/arrow:opacity-100 transition" />
          </div>
        </div>
        {/* Progress bars */}
        <div className="flex gap-1 mt-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goSlide(i)} className="flex-1 h-1 rounded-full bg-content-muted/20 overflow-hidden">
              <div key={i === slide ? `${slide}-${paused}` : i}
                className="h-full rounded-full bg-blue-500"
                style={i < slide ? { width: '100%' } : i === slide ? (paused ? { width: '50%' } : { width: '100%', animation: 'progress-fill 5s linear forwards' }) : { width: '0%' }} />
            </button>
          ))}
        </div>
        <style>{`@keyframes progress-fill { from { width: 0% } to { width: 100% } }`}</style>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold">Olá, {user?.nome?.split(' ')[0]}</h1>
        <div className="flex items-center justify-between gap-3 mt-1">
          <p className="text-sm text-content-muted shrink-0">O que deseja acessar?</p>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
            className="max-w-xs rounded-lg border border-border-subtle bg-elevated px-3 py-1.5 text-sm text-content placeholder:text-content-muted/50 focus:outline-none focus:border-border-medium transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredCards.map(({ to, icon: Icon, label, desc, img, color, border, cssBg }: any) => (
          <Link key={to} to={to}
            className={`group relative overflow-hidden rounded-2xl border border-border-subtle ${border} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 active:scale-[0.98] aspect-square`}>
            {cssBg ? (
              <div className="absolute inset-0 bg-[#0a0a0f]">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #10b98140 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f640 0%, transparent 50%), radial-gradient(circle at 60% 80%, #8b5cf640 0%, transparent 40%)' }} />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              </div>
            ) : (
              <>
                <img src={img} alt="" loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className={`absolute inset-0 bg-gradient-to-t ${color}`} />
              </>
            )}
            <div className="relative h-full flex flex-col justify-end p-4">
              <div className="mb-auto">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/15 transition-colors">
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5 drop-shadow-lg">{label}</h3>
                <p className="text-[10px] text-white/60 leading-tight">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Modal ciclo dashboard */}
      {modalCiclo && (
        <div className="fixed inset-0 app-modal-overlay z-[100] flex items-center justify-center p-4" onClick={() => setModalCiclo(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
              <span className="text-sm font-semibold">{modalCiclo.titulo || modalCiclo.vendedorNome}</span>
              <button onClick={() => setModalCiclo(null)} className="text-content-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="p-4">
              <CicloDashboard ciclo={modalCiclo} vendas={vendas as any} despesas={despesas as any} depositos={depositos as any} valeCards={valeCards as any} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
