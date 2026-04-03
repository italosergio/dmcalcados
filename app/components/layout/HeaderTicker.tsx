import { useEffect, useState, useRef, useCallback } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '~/services/firebase';
import { getProdutos } from '~/services/produtos.service';
import { getClientes } from '~/services/clientes.service';
import { formatCurrency } from '~/utils/format';
import { useAuth } from '~/contexts/AuthContext';
import { Trophy, ShoppingBag, CalendarDays, CalendarRange, DollarSign, Package, Users, UserPlus, Medal } from 'lucide-react';

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

interface Stat {
  label: string;
  value: string;
  color: 'green' | 'orange';
  icon: keyof typeof iconMap;
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
  const [stats, setStats] = useState<Stat[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const animRef = useRef<number>(0);
  const paused = useRef(false);
  const speed = 0.5;

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    Promise.all([getAllVendas(), getAllDespesas(), getProdutos(), getClientes()]).then(([vendas, despesas, produtos, clientes]) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);

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
        vendasMes.forEach((v: any) => {
          if (!vendedorMap[v.vendedorId]) vendedorMap[v.vendedorId] = { nome: v.vendedorNome, total: 0 };
          vendedorMap[v.vendedorId].total += v.valorTotal;
        });
        const topVendedor = Object.values(vendedorMap).sort((a, b) => b.total - a.total)[0];

        const clientesNovos = clientes.filter(c => c.createdAt && new Date(c.createdAt) >= inicioMes).length;

        setStats([
          { label: 'Top vendedor', value: topVendedor ? `${topVendedor.nome} · ${formatCurrency(topVendedor.total)}` : '—', color: 'orange', icon: 'trophy' },
          { label: 'Vendas hoje', value: `${formatCurrency(totalHoje)} (${vendasHoje.length})`, color: 'green', icon: 'shoppingBag' },
          { label: 'Vendas mês', value: `${formatCurrency(totalMes)} (${vendasMes.length})`, color: 'green', icon: 'calendarDays' },
          { label: 'Vendas ano', value: `${formatCurrency(totalAno)} (${vendasAno.length})`, color: 'green', icon: 'calendarRange' },
          { label: 'Despesas', value: formatCurrency(totalDespesas), color: 'orange', icon: 'dollarSign' },
          { label: 'Estoque', value: formatCurrency(valorEstoque), color: 'orange', icon: 'package' },
          { label: 'Clientes', value: `${clientes.length}`, color: 'green', icon: 'users' },
          { label: 'Novos no mês', value: `${clientesNovos}`, color: 'green', icon: 'userPlus' },
        ]);
      } else {
        // Vendedor: apenas dados próprios
        const uid = user.id;

        const minhasVendas = vendas.filter((v: any) => v.vendedorId === uid);
        const minhasHoje = minhasVendas.filter(v => new Date(v.data) >= hoje);
        const minhasMes = minhasVendas.filter(v => new Date(v.data) >= inicioMes);
        const minhasAno = minhasVendas.filter(v => new Date(v.data) >= inicioAno);

        const totalHoje = minhasHoje.reduce((s: number, v: any) => s + v.valorTotal, 0);
        const totalMes = minhasMes.reduce((s: number, v: any) => s + v.valorTotal, 0);
        const totalAno = minhasAno.reduce((s: number, v: any) => s + v.valorTotal, 0);

        // Posição no ranking do mês
        const vendedorMap: Record<string, number> = {};
        const vendasMes = vendas.filter(v => new Date(v.data) >= inicioMes);
        vendasMes.forEach((v: any) => {
          vendedorMap[v.vendedorId] = (vendedorMap[v.vendedorId] || 0) + v.valorTotal;
        });
        const ranking = Object.entries(vendedorMap).sort((a, b) => b[1] - a[1]);
        const posicao = ranking.findIndex(([id]) => id === uid) + 1;
        const totalVendedores = ranking.length;

        // Clientes do vendedor (via vendas)
        const clienteIds = new Set(minhasVendas.map((v: any) => v.clienteId));
        const meusClientes = clienteIds.size;
        const clientesNovosIds = new Set(
          minhasVendas.filter(v => new Date(v.data) >= inicioMes).map((v: any) => v.clienteId)
        );
        // Clientes que compraram pela primeira vez este mês (não tinham compras antes)
        const clientesAntigos = new Set(
          minhasVendas.filter(v => new Date(v.data) < inicioMes).map((v: any) => v.clienteId)
        );
        const clientesNovosMes = [...clientesNovosIds].filter(id => !clientesAntigos.has(id)).length;

        // Despesas do vendedor
        const minhasDespesas = despesas.filter((d: any) => d.usuarioId === uid);
        const despHoje = minhasDespesas.filter(d => new Date(d.data) >= hoje).reduce((s: number, d: any) => s + d.valor, 0);
        const despMes = minhasDespesas.filter(d => new Date(d.data) >= inicioMes).reduce((s: number, d: any) => s + d.valor, 0);
        const despAno = minhasDespesas.filter(d => new Date(d.data) >= inicioAno).reduce((s: number, d: any) => s + d.valor, 0);

        setStats([
          { label: 'Vendas hoje', value: `${formatCurrency(totalHoje)} (${minhasHoje.length})`, color: 'green', icon: 'shoppingBag' },
          { label: 'Vendas mês', value: `${formatCurrency(totalMes)} (${minhasMes.length})`, color: 'green', icon: 'calendarDays' },
          { label: 'Vendas ano', value: `${formatCurrency(totalAno)} (${minhasAno.length})`, color: 'green', icon: 'calendarRange' },
          { label: 'Ranking mês', value: posicao > 0 ? `${posicao}º de ${totalVendedores}` : '—', color: 'orange', icon: 'medal' },
          { label: 'Meus clientes', value: `${meusClientes}`, color: 'green', icon: 'users' },
          { label: 'Clientes novos', value: `${clientesNovosMes}`, color: 'green', icon: 'userPlus' },
          { label: 'Despesas hoje', value: formatCurrency(despHoje), color: 'orange', icon: 'dollarSign' },
          { label: 'Despesas mês', value: formatCurrency(despMes), color: 'orange', icon: 'dollarSign' },
          { label: 'Despesas ano', value: formatCurrency(despAno), color: 'orange', icon: 'dollarSign' },
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
    startX.current = e.clientX;
    startScroll.current = containerRef.current!.scrollLeft;
    containerRef.current!.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    containerRef.current!.scrollLeft = startScroll.current - dx;
  };

  const onPointerUp = () => {
    dragging.current = false;
    paused.current = false;
  };

  if (stats.length === 0) return null;

  const neon = (color: 'green' | 'orange') =>
    color === 'green'
      ? 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]'
      : 'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]';

  const items = stats.map((s, i) => {
    const Icon = iconMap[s.icon];
    return (
      <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Icon size={11} className="text-content-muted/40" />
        <span className="text-[10px] text-content-muted">{s.label}</span>
        <span className={`text-xs font-bold ${neon(s.color)}`}>{s.value}</span>
        <span className="text-content-muted/20 mx-2">│</span>
      </span>
    );
  });

  return (
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
  );
}
