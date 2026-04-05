import { useEffect, useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useNavigate } from 'react-router';
import { onAnalyticsEvents, type AnalyticsEvent } from '~/services/analytics.service';
import { Card } from '~/components/common/Card';
import { ResponsiveTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '~/components/common/ResponsiveTable';
import { Activity, LogIn, LogOut, Circle, Navigation, ShoppingBag, DollarSign, Warehouse, Users, LayoutDashboard, UserCog, History, Package, RefreshCw, UserCircle, BarChart3, Plus, ShieldAlert, Home } from 'lucide-react';
import { getUserRoles } from '~/models';

const EVENT_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  navegacao: Navigation,
  navegacao_suspeita: ShieldAlert,
};

const EVENT_COLORS: Record<string, string> = {
  login: 'text-green-400',
  logout: 'text-red-400',
  navegacao: 'text-blue-400',
  navegacao_suspeita: 'text-yellow-400',
};

const DETAIL_ICONS: Record<string, { icon: typeof LogIn; color: string }> = {
  'Vendas': { icon: ShoppingBag, color: 'text-blue-400' },
  'Nova Venda': { icon: Plus, color: 'text-blue-400' },
  'Despesas': { icon: DollarSign, color: 'text-red-400' },
  'Nova Despesa': { icon: Plus, color: 'text-red-400' },
  'Produtos': { icon: Package, color: 'text-orange-400' },
  'Novo Produto': { icon: Plus, color: 'text-orange-400' },
  'Estoque': { icon: Warehouse, color: 'text-amber-400' },
  'Meu Estoque': { icon: Package, color: 'text-amber-400' },
  'Clientes': { icon: Users, color: 'text-cyan-400' },
  'Novo Cliente': { icon: Plus, color: 'text-cyan-400' },
  'Meus Clientes': { icon: Users, color: 'text-cyan-400' },
  'Dashboard': { icon: LayoutDashboard, color: 'text-purple-400' },
  'Usuários': { icon: UserCog, color: 'text-yellow-400' },
  'Histórico': { icon: History, color: 'text-content-muted' },
  'Ciclos': { icon: RefreshCw, color: 'text-green-400' },
  'Conta': { icon: UserCircle, color: 'text-content-secondary' },
  'Analytics': { icon: BarChart3, color: 'text-purple-400' },
  'Página Inicial': { icon: Home, color: 'text-content-secondary' },
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function Analytics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [, setTick] = useState(0);

  const allowed = !loading && user && getUserRoles(user).includes('desenvolvedor');

  useEffect(() => {
    if (!loading && !allowed) navigate('/vendas');
  }, [loading, allowed]);

  useEffect(() => {
    if (!allowed) return;
    const unsub = onAnalyticsEvents(200, setEvents);
    return () => unsub();
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    const i = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(i);
  }, [allowed]);

  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity size={22} className="text-purple-400" />
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-1.5 ml-auto">
          <Circle size={8} className="text-green-400 fill-green-400 animate-pulse" />
          <span className="text-xs text-content-muted">Tempo real</span>
        </div>
      </div>

      <Card>
        <ResponsiveTable>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Evento</TableHeader>
                <TableHeader>Usuário</TableHeader>
                <TableHeader>Detalhes</TableHeader>
                <TableHeader>Quando</TableHeader>
                <TableHeader className="text-right">Hora</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-content-muted" colSpan={5}>
                    Nenhum evento registrado
                  </TableCell>
                </TableRow>
              )}
              {events.map((ev) => {
                const Icon = EVENT_ICONS[ev.tipo] || Activity;
                const color = EVENT_COLORS[ev.tipo] || 'text-content-muted';
                return (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={color} />
                        <span className={`text-xs font-medium uppercase ${color}`}>{ev.tipo}</span>
                      </div>
                    </TableCell>
                    <TableCell>{ev.usuarioNome}</TableCell>
                    <TableCell>
                      {ev.detalhes ? (
                        <div className="flex items-center gap-2">
                          {DETAIL_ICONS[ev.detalhes] && (
                            <span className={DETAIL_ICONS[ev.detalhes].color}>
                              {(() => { const DIcon = DETAIL_ICONS[ev.detalhes!].icon; return <DIcon size={14} />; })()}
                            </span>
                          )}
                          <span className="text-content-muted">{ev.detalhes}</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-content-muted text-xs">{timeAgo(ev.timestamp)}</TableCell>
                    <TableCell className="text-right text-content-muted text-xs">{formatTimestamp(ev.timestamp)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </Card>
    </div>
  );
}
