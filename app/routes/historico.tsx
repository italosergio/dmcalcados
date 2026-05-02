import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { get, ref } from 'firebase/database';
import { db } from '~/services/firebase';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Package,
  Search,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { formatCurrency } from '~/utils/format';
import { useAuth } from '~/contexts/AuthContext';
import { userIsAdmin } from '~/models';
import { markNotificationsRead } from '~/utils/notifications';

interface HistoryItem {
  id: string;
  type: 'venda' | 'despesa' | 'produto' | 'usuario' | 'cliente' | 'role_change';
  action: 'created' | 'deleted' | 'role_changed';
  data: any;
  timestamp: Date;
  userName?: string;
}

type NotificationGroup = 'todos' | 'recentes' | 'vendas' | 'financeiro' | 'cadastros' | 'sistema' | 'removidos';

const FILTERS: { key: NotificationGroup; label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'recentes', label: 'Recentes' },
  { key: 'vendas', label: 'Vendas' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'cadastros', label: 'Cadastros' },
  { key: 'sistema', label: 'Sistema' },
  { key: 'removidos', label: 'Removidos' },
];

function itemGroup(item: HistoryItem): NotificationGroup {
  if (item.action === 'deleted') return 'removidos';
  if (item.type === 'venda') return 'vendas';
  if (item.type === 'despesa') return 'financeiro';
  if (item.type === 'usuario' || item.type === 'cliente' || item.type === 'produto') return 'cadastros';
  return 'sistema';
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateGroupLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return 'Hoje';
  if (sameDay(date, yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isRecent(item: HistoryItem) {
  return Date.now() - item.timestamp.getTime() < 24 * 60 * 60 * 1000;
}

export default function HistoricoPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const allowed = Boolean(!authLoading && user && userIsAdmin(user));

  useEffect(() => { if (!authLoading && !allowed) navigate('/vendas'); }, [authLoading, allowed, navigate]);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationGroup>('todos');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    Promise.all([
      get(ref(db, 'vendas')),
      get(ref(db, 'despesas')),
      get(ref(db, 'produtos')),
      get(ref(db, 'users')),
      get(ref(db, 'clientes')),
    ]).then(([vendas, despesas, produtos, users, clientes]) => {
      const items: HistoryItem[] = [];
      const usersMap: Record<string, string> = {};

      if (users.exists()) {
        Object.entries(users.val()).forEach(([id, data]: any) => {
          usersMap[id] = data.nome;
          items.push({
            id,
            type: 'usuario',
            action: data.deletedAt ? 'deleted' : 'created',
            data: { ...data, deletedByName: usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
            userName: data.nome,
          });
          if (data.roleUpdatedAt) {
            items.push({
              id: `${id}_role`,
              type: 'role_change',
              action: 'role_changed',
              data: { ...data, changedBy: usersMap[data.roleUpdatedBy] || 'Admin' },
              timestamp: new Date(data.roleUpdatedAt),
              userName: data.nome,
            });
          }
        });
      }

      if (vendas.exists()) {
        Object.entries(vendas.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'venda',
            action: data.deletedAt ? 'deleted' : 'created',
            data: { ...data, deletedByName: usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
            userName: data.vendedorNome,
          });
        });
      }

      if (despesas.exists()) {
        Object.entries(despesas.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'despesa',
            action: data.deletedAt ? 'deleted' : 'created',
            data: { ...data, deletedByName: usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
            userName: data.usuarioNome,
          });
        });
      }

      if (produtos.exists()) {
        Object.entries(produtos.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'produto',
            action: data.deletedAt ? 'deleted' : 'created',
            data: { ...data, deletedByName: usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
          });
        });
      }

      if (clientes.exists()) {
        Object.entries(clientes.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'cliente',
            action: data.deletedAt ? 'deleted' : 'created',
            data: { ...data, deletedByName: usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
          });
        });
      }

      setHistory(items.filter(item => !Number.isNaN(item.timestamp.getTime())).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [allowed]);

  const getMeta = (item: HistoryItem) => {
    if (item.action === 'deleted') {
      return {
        icon: Trash2,
        tone: 'red',
        label: 'Removido',
        title: item.type === 'venda' ? 'Venda removida' : item.type === 'despesa' ? 'Despesa removida' : 'Registro removido',
      };
    }
    if (item.type === 'venda') return { icon: ShoppingBag, tone: 'green', label: 'Venda', title: `Venda registrada - ${formatCurrency(item.data.valorTotal)}` };
    if (item.type === 'despesa') return { icon: DollarSign, tone: 'amber', label: 'Financeiro', title: `Despesa registrada - ${formatCurrency(item.data.valor)}` };
    if (item.type === 'produto') return { icon: Package, tone: 'blue', label: 'Produto', title: `Produto criado${item.data.modelo ? `: ${item.data.modelo}` : ''}` };
    if (item.type === 'cliente') return { icon: Users, tone: 'violet', label: 'Cliente', title: `Cliente criado${item.data.nome ? `: ${item.data.nome}` : ''}` };
    if (item.type === 'usuario') return { icon: UserPlus, tone: 'emerald', label: 'Usuário', title: `Usuário criado${item.data.nome ? `: ${item.data.nome}` : ''}` };
    return { icon: UserCog, tone: 'sky', label: 'Permissão', title: `Permissão alterada para ${item.data.role}` };
  };

  const getDescription = (item: HistoryItem) => {
    if (item.action === 'deleted') {
      return item.data.deletedByName ? `Removido por ${item.data.deletedByName}` : 'Registro removido do sistema';
    }
    if (item.type === 'venda') return item.data.clienteNome ? `Cliente: ${item.data.clienteNome}` : 'Nova venda registrada';
    if (item.type === 'despesa') return `${item.data.tipo || 'Despesa'} registrada no caixa`;
    if (item.type === 'role_change') return `Alterado por ${item.data.changedBy || 'Admin'}`;
    return item.userName ? `Cadastro feito por ${item.userName}` : 'Novo registro cadastrado';
  };

  const filteredHistory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return history.filter(item => {
      const group = itemGroup(item);
      if (filter === 'recentes' && !isRecent(item)) return false;
      if (filter !== 'todos' && filter !== 'recentes' && group !== filter) return false;
      if (!needle) return true;
      const meta = getMeta(item);
      const haystack = [
        meta.title,
        meta.label,
        getDescription(item),
        item.userName,
        item.data.clienteNome,
        item.data.nome,
        item.data.tipo,
        item.data.modelo,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, history, query]);

  const grouped = useMemo(() => {
    return filteredHistory.reduce<Record<string, HistoryItem[]>>((acc, item) => {
      const label = dateGroupLabel(item.timestamp);
      acc[label] = acc[label] || [];
      acc[label].push(item);
      return acc;
    }, {});
  }, [filteredHistory]);

  const stats = useMemo(() => {
    const recent = history.filter(isRecent).length;
    const removidos = history.filter(item => item.action === 'deleted').length;
    const vendas = history.filter(item => item.type === 'venda' && item.action !== 'deleted').length;
    const financeiro = history.filter(item => item.type === 'despesa' && item.action !== 'deleted').length;
    return { recent, removidos, vendas, financeiro };
  }, [history]);
  const latestNotificationAt = history.reduce((max, item) => Math.max(max, item.timestamp.getTime()), 0);

  if (!allowed) return null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <section className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,13,24,0.98),rgba(12,23,39,0.96)_42%,rgba(13,58,77,0.86))] shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/15 px-3 py-1 text-[11px] font-semibold uppercase text-cyan-100 shadow-lg shadow-cyan-950/20">
              <Bell size={13} />
              Central de notificações
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Notificações</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300/90">
              Acompanhe eventos importantes do sistema em ordem cronológica, com contexto suficiente para agir sem abrir cada registro.
            </p>
            <button
              type="button"
              onClick={() => markNotificationsRead(latestNotificationAt || Date.now())}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/16"
            >
              <CheckCircle2 size={14} />
              Ler todas
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[430px]">
            <SummaryPill icon={Sparkles} label="Recentes" value={stats.recent} tone="cyan" active={filter === 'recentes'} onClick={() => setFilter('recentes')} />
            <SummaryPill icon={ShoppingBag} label="Vendas" value={stats.vendas} tone="green" active={filter === 'vendas'} onClick={() => setFilter('vendas')} />
            <SummaryPill icon={DollarSign} label="Financeiro" value={stats.financeiro} tone="amber" active={filter === 'financeiro'} onClick={() => setFilter('financeiro')} />
            <SummaryPill icon={ShieldAlert} label="Removidos" value={stats.removidos} tone="red" active={filter === 'removidos'} onClick={() => setFilter('removidos')} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-300/10 bg-[#101923]/90 p-3 shadow-xl shadow-cyan-950/10 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
            {FILTERS.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  filter === item.key ? 'bg-cyan-300/18 text-cyan-100 ring-1 ring-cyan-300/25' : 'text-content-secondary hover:bg-cyan-300/8 hover:text-content'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 lg:w-80">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por cliente, usuário, tipo..."
              className="w-full rounded-xl border border-cyan-300/10 bg-[#0c121b] py-2 pl-9 pr-3 text-sm text-content placeholder:text-content-muted/60 outline-none transition focus:border-cyan-300/45 focus:bg-[#101923]"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-cyan-300/10 bg-[#101923]/90 p-8 text-center text-sm text-content-muted">Carregando notificações...</div>
      ) : filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-300/20 bg-[#101923]/70 p-10 text-center">
          <CheckCircle2 size={34} className="mx-auto mb-3 text-green-400" />
          <h2 className="text-sm font-semibold text-content">Nada para mostrar</h2>
          <p className="mt-1 text-xs text-content-muted">Ajuste os filtros ou a busca para ver outras notificações.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([label, items]) => (
            <section key={label} className="space-y-2">
              <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-[#151b22]/88 px-1 py-1 backdrop-blur">
                <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-100/70">{label}</span>
                <span className="h-px flex-1 bg-cyan-300/10" />
                <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] text-cyan-100/70">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map(item => {
                  const meta = getMeta(item);
                  const isExpanded = expandedItem === item.id;
                  const isVenda = item.type === 'venda';
                  const isDespesa = item.type === 'despesa';
                  const isExpandable = isVenda || isDespesa;
                  const Icon = meta.icon;

                  return (
                    <article
                      key={item.id}
                      className={`group rounded-2xl border bg-[#101923]/92 p-3 transition ${
                        isRecent(item) ? 'border-cyan-300/28 shadow-lg shadow-cyan-950/15' : 'border-white/7'
                      } ${isExpandable ? 'cursor-pointer hover:border-cyan-300/22 hover:bg-[#13202b]' : ''}`}
                      onClick={() => isExpandable && setExpandedItem(isExpanded ? null : item.id)}
                    >
                      <div className="flex gap-3">
                        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass(meta.tone).iconBg}`}>
                          <Icon size={19} className={toneClass(meta.tone).iconText} />
                          {isRecent(item) && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101923] bg-cyan-300" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${toneClass(meta.tone).badge}`}>
                                  {meta.label}
                                </span>
                                {isRecent(item) && <span className="rounded-full bg-cyan-300/14 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 ring-1 ring-cyan-300/15">Novo</span>}
                              </div>
                              <h2 className="truncate text-sm font-bold text-content">{meta.title}</h2>
                              <p className="mt-0.5 text-xs text-content-muted">{getDescription(item)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <time className="hidden text-[11px] text-content-muted sm:block">
                                {item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </time>
                              {isExpandable && (isExpanded ? <ChevronUp size={17} className="text-content-muted" /> : <ChevronDown size={17} className="text-content-muted" />)}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-content-muted">
                            {item.userName && <span>Responsável: {item.userName}</span>}
                            <span className="hidden sm:inline">•</span>
                            <span>{item.timestamp.toLocaleString('pt-BR')}</span>
                          </div>

                          {isExpanded && isVenda && item.data.produtos && (
                            <div className="mt-3 rounded-xl border border-cyan-300/10 bg-[#0c121b]/85 p-3">
                              <p className="mb-2 text-[11px] font-bold uppercase text-content-muted">Produtos vendidos</p>
                              <div className="space-y-1.5">
                                {item.data.produtos.map((p: any, i: number) => (
                                  <div key={i} className="flex justify-between gap-3 text-xs text-content-secondary">
                                    <span className="truncate">{p.quantidade}x {p.modelo}</span>
                                    <span className="shrink-0 font-semibold text-content">{formatCurrency(p.valorTotal)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {isExpanded && isDespesa && (
                            <div className="mt-3 grid gap-2 rounded-xl border border-cyan-300/10 bg-[#0c121b]/85 p-3 text-xs text-content-secondary sm:grid-cols-3">
                              <Detail label="Tipo" value={item.data.tipo} />
                              <Detail label="Valor" value={formatCurrency(item.data.valor)} />
                              <Detail label="Data" value={new Date(item.data.data).toLocaleDateString('pt-BR')} />
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function toneClass(tone: string) {
  const tones: Record<string, { iconBg: string; iconText: string; badge: string }> = {
    green: { iconBg: 'bg-emerald-400/16 ring-1 ring-emerald-300/16', iconText: 'text-emerald-200', badge: 'bg-emerald-400/13 text-emerald-100 ring-1 ring-emerald-300/14' },
    amber: { iconBg: 'bg-amber-400/16 ring-1 ring-amber-300/16', iconText: 'text-amber-200', badge: 'bg-amber-400/13 text-amber-100 ring-1 ring-amber-300/14' },
    blue: { iconBg: 'bg-blue-400/16 ring-1 ring-blue-300/16', iconText: 'text-blue-200', badge: 'bg-blue-400/13 text-blue-100 ring-1 ring-blue-300/14' },
    violet: { iconBg: 'bg-violet-400/16 ring-1 ring-violet-300/16', iconText: 'text-violet-200', badge: 'bg-violet-400/13 text-violet-100 ring-1 ring-violet-300/14' },
    emerald: { iconBg: 'bg-emerald-400/16 ring-1 ring-emerald-300/16', iconText: 'text-emerald-200', badge: 'bg-emerald-400/13 text-emerald-100 ring-1 ring-emerald-300/14' },
    sky: { iconBg: 'bg-sky-400/16 ring-1 ring-sky-300/16', iconText: 'text-sky-200', badge: 'bg-sky-400/13 text-sky-100 ring-1 ring-sky-300/14' },
    red: { iconBg: 'bg-rose-400/16 ring-1 ring-rose-300/16', iconText: 'text-rose-200', badge: 'bg-rose-400/13 text-rose-100 ring-1 ring-rose-300/14' },
    cyan: { iconBg: 'bg-cyan-400/16 ring-1 ring-cyan-300/16', iconText: 'text-cyan-200', badge: 'bg-cyan-400/13 text-cyan-100 ring-1 ring-cyan-300/14' },
  };
  return tones[tone] || tones.cyan;
}

function SummaryPill({ icon: Icon, label, value, tone, active, onClick }: { icon: any; label: string; value: number; tone: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white/[0.11] ${
        active ? 'border-cyan-300/35 bg-cyan-300/13 ring-1 ring-cyan-300/20' : 'border-white/10 bg-white/[0.075]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase text-slate-400">{label}</span>
        <Icon size={14} className={toneClass(tone).iconText} />
      </div>
      <p className="text-xl font-black text-white">{value}</p>
    </button>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-content-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-content">{value || '-'}</p>
    </div>
  );
}
