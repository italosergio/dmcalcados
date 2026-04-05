import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '~/services/firebase';
import { useVendas, useDespesas, useProdutos, useClientes, useUsers } from '~/hooks/useRealtime';
import { formatCurrency } from '~/utils/format';
import { useAuth } from '~/contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Trophy, ShoppingBag, CalendarDays, CalendarRange, DollarSign, Package, Users, UserPlus, Medal } from 'lucide-react';
import { RankingModal } from './RankingModal';
import { calcularESalvarRanking } from '~/services/ranking.service';
import { isVendedor as isVendedorRole } from '~/models';

const iconMap = {
  trophy: Trophy,
  shoppingBag: ShoppingBag,
  calendarDays: CalendarDays,
  calendarRange: CalendarRange,
  dollarSign: DollarSign,
  package: Package,
  users: Users,
  userPlus: UserPlus,
  medal: Medal,
} as const;

type Action = { type: 'navigate'; to: string } | { type: 'ranking'; tab?: 'dia' | 'mes' | 'ano' };

interface Stat {
  label: string;
  value: string;
  color: 'green' | 'orange' | 'blue';
  icon: keyof typeof iconMap;
  action?: Action;
}

export function HeaderTicker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vendas: todasVendas } = useVendas();
  const { despesas: todasDespesas } = useDespesas();
  const { produtos } = useProdutos();
  const { clientes } = useClientes();
  const { users } = useUsers();
  const [showRanking, setShowRanking] = useState(false);
  const [rankingTab, setRankingTab] = useState<'dia' | 'mes' | 'ano'>('mes');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const animRef = useRef<number>(0);
  const paused = useRef(false);
  const speed = 0.5;
  const rankingSaved = useRef(false);

  const vendas = useMemo(() => todasVendas.filter((v: any) => !v.deletedAt), [todasVendas]);
  const despesas = useMemo(() => todasDespesas.filter((d: any) => !d.deletedAt), [todasDespesas]);

  const nomeMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => { map[u.uid || u.id] = u.nome; map[u.id] = u.nome; });
    return map;
  }, [users]);

  const vendedorIds = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      const roles: string[] = (u as any).roles?.length ? (u as any).roles : [(u as any).role];
      if (roles.some(r => isVendedorRole(r as any))) set.add(u.uid || u.id);
    });
    return set;
  }, [users]);

  useEffect(() => {
    if (!rankingSaved.current && vendas.length > 0) {
      rankingSaved.current = true;
      calcularESalvarRanking().catch(() => {});
    }
  }, [vendas]);

  const stats = useMemo<Stat[]>(() => {
    if (!user || vendas.length === 0 && despesas.length === 0 && produtos.length === 0) return [];

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'desenvolvedor';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);

    const resolveName = (id: string, fallback: string) => nomeMap[id] || fallback;

    const buildRanking = (filtradas: any[]) => {
      const map: Record<string, { nome: string; total: number }> = {};
      filtradas.filter(v => vendedorIds.has(v.vendedorId)).forEach((v: any) => {
        if (!map[v.vendedorId]) map[v.vendedorId] = { nome: resolveName(v.vendedorId, v.vendedorNome), total: 0 };
        map[v.vendedorId].total += v.valorTotal;
      });
      return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
    };

    if (isAdmin) {
      const vendasHoje = vendas.filter(v => new Date(v.data) >= hoje);
      const vendasMes = vendas.filter(v => new Date(v.data) >= inicioMes);
      const vendasAno = vendas.filter(v => new Date(v.data) >= inicioAno);

      const totalHoje = vendasHoje.reduce((s, v: any) => s + v.valorTotal, 0);
      const totalMes = vendasMes.reduce((s, v: any) => s + v.valorTotal, 0);
      const totalAno = vendasAno.reduce((s, v: any) => s + v.valorTotal, 0);

      const totalDespesas = despesas.reduce((s, d: any) => s + d.valor, 0);
      const valorEstoque = produtos.reduce((s, p) => s + (p.valor * p.estoque), 0);

      const rankDia = buildRanking(vendasHoje);
      const rankMes = buildRanking(vendasMes);
      const rankAno = buildRanking(vendasAno);
      const topDia = rankDia[0];
      const topMes = rankMes[0];
      const topAno = rankAno[0];

      const clientesNovos = clientes.filter(c => c.createdAt && new Date(c.createdAt) >= inicioMes).length;

      return [
        { label: 'Ranking dia', value: topDia ? `${topDia[1].nome} · ${formatCurrency(topDia[1].total)}` : '—', color: 'orange', icon: 'medal', action: { type: 'ranking', tab: 'dia' } },
        { label: 'Ranking mês', value: topMes ? `${topMes[1].nome} · ${formatCurrency(topMes[1].total)}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'mes' } },
        { label: 'Ranking ano', value: topAno ? `${topAno[1].nome} · ${formatCurrency(topAno[1].total)}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'ano' } },
        { label: 'Vendas hoje', value: `${formatCurrency(totalHoje)} (${vendasHoje.length})`, color: 'green', icon: 'shoppingBag', action: { type: 'navigate', to: '/vendas?periodo=hoje' } },
        { label: 'Vendas mês', value: `${formatCurrency(totalMes)} (${vendasMes.length})`, color: 'green', icon: 'calendarDays', action: { type: 'navigate', to: '/vendas?periodo=mes' } },
        { label: 'Vendas ano', value: `${formatCurrency(totalAno)} (${vendasAno.length})`, color: 'green', icon: 'calendarRange', action: { type: 'navigate', to: '/vendas?periodo=ano' } },
        { label: 'Despesas', value: formatCurrency(totalDespesas), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=tudo' } },
        { label: 'Estoque', value: formatCurrency(valorEstoque), color: 'blue', icon: 'package', action: { type: 'navigate', to: '/estoque' } },
        { label: 'Clientes', value: `${clientes.length}`, color: 'green', icon: 'users', action: { type: 'navigate', to: '/clientes' } },
        { label: 'Novos', value: `${clientesNovos}`, color: 'green', icon: 'userPlus', action: { type: 'navigate', to: '/clientes?novos=1' } },
      ];
    } else {
      const uid = user.id;
      const minhasVendas = vendas.filter((v: any) => v.vendedorId === uid);
      const minhasHoje = minhasVendas.filter(v => new Date(v.data) >= hoje);
      const minhasMes = minhasVendas.filter(v => new Date(v.data) >= inicioMes);
      const minhasAno = minhasVendas.filter(v => new Date(v.data) >= inicioAno);

      const totalHoje = minhasHoje.reduce((s, v: any) => s + v.valorTotal, 0);
      const totalMes = minhasMes.reduce((s, v: any) => s + v.valorTotal, 0);
      const totalAno = minhasAno.reduce((s, v: any) => s + v.valorTotal, 0);

      const rankDia = buildRanking(vendas.filter(v => new Date(v.data) >= hoje));
      const rankMes = buildRanking(vendas.filter(v => new Date(v.data) >= inicioMes));
      const rankAno = buildRanking(vendas.filter(v => new Date(v.data) >= inicioAno));
      const posDia = rankDia.findIndex(([id]) => id === uid) + 1;
      const posMes = rankMes.findIndex(([id]) => id === uid) + 1;
      const posAno = rankAno.findIndex(([id]) => id === uid) + 1;

      const clienteIds = new Set(minhasVendas.map((v: any) => v.clienteId));
      const clientesAntigos = new Set(minhasVendas.filter(v => new Date(v.data) < inicioMes).map((v: any) => v.clienteId));
      const clientesNovosIds = new Set(minhasVendas.filter(v => new Date(v.data) >= inicioMes).map((v: any) => v.clienteId));
      const clientesNovosMes = [...clientesNovosIds].filter(id => !clientesAntigos.has(id)).length;

      const minhasDespesas = despesas.filter((d: any) => d.usuarioId === uid || (d.rateio && d.rateio.some((r: any) => r.usuarioId === uid)));
      const despHoje = minhasDespesas.filter(d => new Date(d.data) >= hoje).reduce((s, d: any) => s + d.valor, 0);
      const despMes = minhasDespesas.filter(d => new Date(d.data) >= inicioMes).reduce((s, d: any) => s + d.valor, 0);
      const despAno = minhasDespesas.filter(d => new Date(d.data) >= inicioAno).reduce((s, d: any) => s + d.valor, 0);

      return [
        { label: 'Vendas hoje', value: `${formatCurrency(totalHoje)} (${minhasHoje.length})`, color: 'green', icon: 'shoppingBag', action: { type: 'navigate', to: '/vendas?periodo=hoje' } },
        { label: 'Vendas mês', value: `${formatCurrency(totalMes)} (${minhasMes.length})`, color: 'green', icon: 'calendarDays', action: { type: 'navigate', to: '/vendas?periodo=mes' } },
        { label: 'Vendas ano', value: `${formatCurrency(totalAno)} (${minhasAno.length})`, color: 'green', icon: 'calendarRange', action: { type: 'navigate', to: '/vendas?periodo=ano' } },
        { label: 'Ranking dia', value: posDia > 0 ? `${posDia}º de ${rankDia.length}` : '—', color: 'orange', icon: 'medal', action: { type: 'ranking', tab: 'dia' } },
        { label: 'Ranking mês', value: posMes > 0 ? `${posMes}º de ${rankMes.length}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'mes' } },
        { label: 'Ranking ano', value: posAno > 0 ? `${posAno}º de ${rankAno.length}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'ano' } },
        { label: 'Meus clientes', value: `${clienteIds.size}`, color: 'green', icon: 'users', action: { type: 'navigate', to: '/meus-clientes' } },
        { label: 'Clientes novos', value: `${clientesNovosMes}`, color: 'green', icon: 'userPlus', action: { type: 'navigate', to: '/meus-clientes?novos=1' } },
        { label: 'Despesas hoje', value: formatCurrency(despHoje), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=hoje' } },
        { label: 'Despesas mês', value: formatCurrency(despMes), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=mes' } },
        { label: 'Despesas ano', value: formatCurrency(despAno), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=ano' } },
      ];
    }
  }, [user, vendas, despesas, produtos, clientes, nomeMap, vendedorIds]);

  const tick = useCallback(() => {
    const el = containerRef.current;
    if (el && !paused.current) {
      el.scrollLeft += speed;
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
    }
    animRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (stats.length === 0) return;
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [stats, tick]);

  const onPointerDown = (e: React.PointerEvent) => {
    paused.current = true;
    dragging.current = true;
    didDrag.current = false;
    startX.current = e.clientX;
    startScroll.current = containerRef.current!.scrollLeft;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 3) didDrag.current = true;
    containerRef.current!.scrollLeft = startScroll.current - dx;
  };

  const onPointerUp = () => {
    dragging.current = false;
    paused.current = false;
  };

  const handleClick = (action?: Action) => {
    if (didDrag.current || !action) return;
    if (action.type === 'navigate') navigate(action.to);
    else if (action.type === 'ranking') { setRankingTab(action.tab || 'mes'); setShowRanking(true); }
  };

  if (stats.length === 0) return null;

  const neon = (color: 'green' | 'orange' | 'blue') =>
    color === 'green'
      ? 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]'
      : color === 'blue'
        ? 'text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.6)]'
        : 'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]';

  const items = stats.map((s, i) => {
    const Icon = iconMap[s.icon];
    return (
      <span key={i} onClick={() => handleClick(s.action)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap ${s.action ? 'cursor-pointer hover:opacity-75' : ''}`}>
        <Icon size={11} className="text-content-muted/40" />
        <span className="text-[10px] text-content-muted">{s.label}</span>
        <span className={`text-xs font-bold ${neon(s.color)}`}>{s.value}</span>
        <span className="text-content-muted/20 mx-2">│</span>
      </span>
    );
  });

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent z-10" />
        <div
          ref={containerRef}
          className="overflow-hidden select-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none' }}
        >
          <div className="flex w-max">
            <div className="flex items-center">{items}</div>
            <div className="flex items-center">{items}</div>
          </div>
        </div>
      </div>
      {showRanking && <RankingModal initialTab={rankingTab} onClose={() => setShowRanking(false)} />}
    </>
  );
}
