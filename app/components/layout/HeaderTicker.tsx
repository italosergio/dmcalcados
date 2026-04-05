import { useEffect, useState, useRef, useCallback } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '~/services/firebase';
import { getProdutos } from '~/services/produtos.service';
import { getClientes } from '~/services/clientes.service';
import { formatCurrency } from '~/utils/format';
import { useAuth } from '~/contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Trophy, ShoppingBag, CalendarDays, CalendarRange, DollarSign, Package, Users, UserPlus, Medal } from 'lucide-react';
import { RankingModal } from './RankingModal';
import { calcularESalvarRanking } from '~/services/ranking.service';

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

async function getAllVendas() {
  const snapshot = await get(ref(db, 'vendas'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] })).filter((v: any) => !v.deletedAt);
}

async function getAllDespesas() {
  const snapshot = await get(ref(db, 'despesas'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] })).filter((d: any) => !d.deletedAt);
}

export function HeaderTicker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stat[]>([]);
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

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'desenvolvedor';

    Promise.all([getAllVendas(), getAllDespesas(), getProdutos(), getClientes()]).then(async ([vendas, despesas, produtos, clientes]) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);

      // Buscar users para identificar vendedores
      const usersSnap = await get(ref(db, 'users'));
      const usersData = usersSnap.exists() ? usersSnap.val() : {};
      const vendedorIds = new Set(Object.entries(usersData).filter(([_, u]: any) => {
        const roles: string[] = u.roles?.length ? u.roles : [u.role];
        return roles.some((r: string) => r === 'vendedor' || r === 'vendedor1' || r === 'vendedor2' || r === 'vendedor3');
      }).map(([id]) => id));

      // Salvar ranking snapshot
      calcularESalvarRanking().catch(() => {});

      if (isAdmin) {
        const vendasHoje = vendas.filter(v => new Date(v.data) >= hoje);
        const vendasMes = vendas.filter(v => new Date(v.data) >= inicioMes);
        const vendasAno = vendas.filter(v => new Date(v.data) >= inicioAno);

        const totalHoje = vendasHoje.reduce((s: number, v: any) => s + v.valorTotal, 0);
        const totalMes = vendasMes.reduce((s: number, v: any) => s + v.valorTotal, 0);
        const totalAno = vendasAno.reduce((s: number, v: any) => s + v.valorTotal, 0);

        const totalDespesas = despesas.reduce((s: number, d: any) => s + d.valor, 0);
        const valorEstoque = produtos.reduce((s, p) => s + (p.valor * p.estoque), 0);

        const vendedorMap: Record<string, { nome: string; total: number }> = {};
        vendasMes.filter(v => vendedorIds.has(v.vendedorId)).forEach((v: any) => {
          if (!vendedorMap[v.vendedorId]) vendedorMap[v.vendedorId] = { nome: v.vendedorNome, total: 0 };
          vendedorMap[v.vendedorId].total += v.valorTotal;
        });
        const topVendedor = Object.values(vendedorMap).sort((a, b) => b.total - a.total)[0];

        // Rankings por período
        const buildRankingAdmin = (filtradas: any[]) => {
          const map: Record<string, { nome: string; total: number }> = {};
          filtradas.filter(v => vendedorIds.has(v.vendedorId)).forEach((v: any) => {
            if (!map[v.vendedorId]) map[v.vendedorId] = { nome: v.vendedorNome, total: 0 };
            map[v.vendedorId].total += v.valorTotal;
          });
          return Object.values(map).sort((a, b) => b.total - a.total);
        };
        const rankDia = buildRankingAdmin(vendasHoje);
        const rankAno = buildRankingAdmin(vendasAno);
        const topDia = rankDia[0];
        const topAno = rankAno[0];

        const clientesNovos = clientes.filter(c => c.createdAt && new Date(c.createdAt) >= inicioMes).length;

        setStats([
          { label: 'Ranking dia', value: topDia ? `${topDia.nome} · ${formatCurrency(topDia.total)}` : '—', color: 'orange', icon: 'medal', action: { type: 'ranking', tab: 'dia' } },
          { label: 'Ranking mês', value: topVendedor ? `${topVendedor.nome} · ${formatCurrency(topVendedor.total)}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'mes' } },
          { label: 'Ranking ano', value: topAno ? `${topAno.nome} · ${formatCurrency(topAno.total)}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'ano' } },
          { label: 'Vendas hoje', value: `${formatCurrency(totalHoje)} (${vendasHoje.length})`, color: 'green', icon: 'shoppingBag', action: { type: 'navigate', to: '/vendas?periodo=hoje' } },
          { label: 'Vendas mês', value: `${formatCurrency(totalMes)} (${vendasMes.length})`, color: 'green', icon: 'calendarDays', action: { type: 'navigate', to: '/vendas?periodo=mes' } },
          { label: 'Vendas ano', value: `${formatCurrency(totalAno)} (${vendasAno.length})`, color: 'green', icon: 'calendarRange', action: { type: 'navigate', to: '/vendas?periodo=ano' } },
          { label: 'Despesas', value: formatCurrency(totalDespesas), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=tudo' } },
          { label: 'Estoque', value: formatCurrency(valorEstoque), color: 'blue', icon: 'package', action: { type: 'navigate', to: '/estoque' } },
          { label: 'Clientes', value: `${clientes.length}`, color: 'green', icon: 'users', action: { type: 'navigate', to: '/clientes' } },
          { label: 'Novos', value: `${clientesNovos}`, color: 'green', icon: 'userPlus', action: { type: 'navigate', to: '/clientes?novos=1' } },
        ]);
      } else {
        const uid = user.id;
        const minhasVendas = vendas.filter((v: any) => v.vendedorId === uid);
        const minhasHoje = minhasVendas.filter(v => new Date(v.data) >= hoje);
        const minhasMes = minhasVendas.filter(v => new Date(v.data) >= inicioMes);
        const minhasAno = minhasVendas.filter(v => new Date(v.data) >= inicioAno);

        const totalHoje = minhasHoje.reduce((s: number, v: any) => s + v.valorTotal, 0);
        const totalMes = minhasMes.reduce((s: number, v: any) => s + v.valorTotal, 0);
        const totalAno = minhasAno.reduce((s: number, v: any) => s + v.valorTotal, 0);

        // Rankings
        const buildRanking = (filtradas: any[]) => {
          const map: Record<string, number> = {};
          filtradas.filter(v => vendedorIds.has(v.vendedorId)).forEach((v: any) => { map[v.vendedorId] = (map[v.vendedorId] || 0) + v.valorTotal; });
          return Object.entries(map).sort((a, b) => b[1] - a[1]);
        };
        const rankDia = buildRanking(vendas.filter(v => new Date(v.data) >= hoje));
        const rankMes = buildRanking(vendas.filter(v => new Date(v.data) >= inicioMes));
        const rankAno = buildRanking(vendas.filter(v => new Date(v.data) >= inicioAno));
        const posDia = rankDia.findIndex(([id]) => id === uid) + 1;
        const posMes = rankMes.findIndex(([id]) => id === uid) + 1;
        const posAno = rankAno.findIndex(([id]) => id === uid) + 1;
        const total = rankMes.length;

        const clienteIds = new Set(minhasVendas.map((v: any) => v.clienteId));
        const clientesAntigos = new Set(minhasVendas.filter(v => new Date(v.data) < inicioMes).map((v: any) => v.clienteId));
        const clientesNovosIds = new Set(minhasVendas.filter(v => new Date(v.data) >= inicioMes).map((v: any) => v.clienteId));
        const clientesNovosMes = [...clientesNovosIds].filter(id => !clientesAntigos.has(id)).length;

        const minhasDespesas = despesas.filter((d: any) => d.usuarioId === uid || (d.rateio && d.rateio.some((r: any) => r.usuarioId === uid)));
        const despHoje = minhasDespesas.filter(d => new Date(d.data) >= hoje).reduce((s: number, d: any) => s + d.valor, 0);
        const despMes = minhasDespesas.filter(d => new Date(d.data) >= inicioMes).reduce((s: number, d: any) => s + d.valor, 0);
        const despAno = minhasDespesas.filter(d => new Date(d.data) >= inicioAno).reduce((s: number, d: any) => s + d.valor, 0);

        setStats([
          { label: 'Vendas hoje', value: `${formatCurrency(totalHoje)} (${minhasHoje.length})`, color: 'green', icon: 'shoppingBag', action: { type: 'navigate', to: '/vendas?periodo=hoje' } },
          { label: 'Vendas mês', value: `${formatCurrency(totalMes)} (${minhasMes.length})`, color: 'green', icon: 'calendarDays', action: { type: 'navigate', to: '/vendas?periodo=mes' } },
          { label: 'Vendas ano', value: `${formatCurrency(totalAno)} (${minhasAno.length})`, color: 'green', icon: 'calendarRange', action: { type: 'navigate', to: '/vendas?periodo=ano' } },
          { label: 'Ranking dia', value: posDia > 0 ? `${posDia}º de ${rankDia.length}` : '—', color: 'orange', icon: 'medal', action: { type: 'ranking', tab: 'dia' } },
          { label: 'Ranking mês', value: posMes > 0 ? `${posMes}º de ${total}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'mes' } },
          { label: 'Ranking ano', value: posAno > 0 ? `${posAno}º de ${rankAno.length}` : '—', color: 'orange', icon: 'trophy', action: { type: 'ranking', tab: 'ano' } },
          { label: 'Meus clientes', value: `${clienteIds.size}`, color: 'green', icon: 'users', action: { type: 'navigate', to: '/meus-clientes' } },
          { label: 'Clientes novos', value: `${clientesNovosMes}`, color: 'green', icon: 'userPlus', action: { type: 'navigate', to: '/meus-clientes?novos=1' } },
          { label: 'Despesas hoje', value: formatCurrency(despHoje), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=hoje' } },
          { label: 'Despesas mês', value: formatCurrency(despMes), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=mes' } },
          { label: 'Despesas ano', value: formatCurrency(despAno), color: 'orange', icon: 'dollarSign', action: { type: 'navigate', to: '/despesas?periodo=ano' } },
        ]);
      }
    }).catch(() => {});
  }, [user]);

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
    containerRef.current!.setPointerCapture(e.pointerId);
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
