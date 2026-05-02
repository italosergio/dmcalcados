import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
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
  RefreshCw,
  Wallet,
  CreditCard,
  ArrowUpCircle,
  Edit3,
  RotateCcw,
  Ban,
  ExternalLink,
  LogIn,
} from 'lucide-react';
import { formatCurrency } from '~/utils/format';
import { useAuth } from '~/contexts/AuthContext';
import { userIsAdmin } from '~/models';
import { markNotificationsRead } from '~/utils/notifications';

interface HistoryItem {
  id: string;
  type: 'venda' | 'despesa' | 'produto' | 'usuario' | 'cliente' | 'role_change'
        | 'status_change' | 'password_reset'
        | 'ciclo' | 'deposito' | 'vale';
  action: 'created' | 'deleted' | 'role_changed' | 'status_changed' | 'password_reset'
        | 'updated' | 'closed' | 'reopened' | 'restored' | 'quitted' | 'vale_registro';
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
  if (item.type === 'despesa' || item.type === 'deposito' || item.type === 'vale') return 'financeiro';
  if (item.type === 'ciclo') return 'sistema';
  if (item.type === 'usuario' || item.type === 'cliente' || item.type === 'produto') return 'cadastros';
  if (item.type === 'role_change' || item.type === 'status_change' || item.type === 'password_reset') return 'sistema';
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

function resolveUserName(data: any, usersMap: Record<string, string>, fieldName = 'updatedBy'): string {
  const uid = data[fieldName];
  return uid ? (usersMap[uid] || data[`${fieldName}Nome`] || '') : (data[`${fieldName}Nome`] || '');
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
      get(ref(db, 'ciclos')),
      get(ref(db, 'depositos')),
      get(ref(db, 'vales')),
    ]).then(([vendas, despesas, produtos, users, clientes, ciclos, depositos, vales]) => {
      const items: HistoryItem[] = [];
      const usersMap: Record<string, string> = {};

      if (users.exists()) {
        Object.entries(users.val()).forEach(([id, data]: any) => {
          usersMap[id] = data.nome;
          // Criação
          items.push({
            id,
            type: 'usuario',
            action: data.deletedAt ? 'deleted' : 'created',
            data: { ...data, deletedByName: data.deletedByNome || usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
            userName: data.nome,
          });
          // Alteração de role
          if (data.roleUpdatedAt) {
            items.push({
              id: `${id}_role`,
              type: 'role_change',
              action: 'role_changed',
              data: { ...data, changedBy: data.roleUpdatedByNome || usersMap[data.roleUpdatedBy] || 'Admin' },
              timestamp: new Date(data.roleUpdatedAt),
              userName: data.nome,
            });
          }
          // Alteração de status
          if (data.statusUpdatedAt) {
            items.push({
              id: `${id}_status`,
              type: 'status_change',
              action: 'status_changed',
              data: { ...data, changedBy: usersMap[data.statusUpdatedBy] || '' },
              timestamp: new Date(data.statusUpdatedAt),
              userName: data.nome,
            });
          }
          // Reset de senha
          if (data.passwordResetAt) {
            items.push({
              id: `${id}_pwd`,
              type: 'password_reset',
              action: 'password_reset',
              data: { ...data, resetBy: usersMap[data.passwordResetBy] || '' },
              timestamp: new Date(data.passwordResetAt),
              userName: data.nome,
            });
          }
          // Restauração
          if (data.restoredAt) {
            items.push({
              id: `${id}_restored`,
              type: 'usuario',
              action: 'restored',
              data: { ...data, restoredByName: usersMap[data.restoredBy] || '' },
              timestamp: new Date(data.restoredAt),
              userName: data.nome,
            });
          }
        });
      }

      if (vendas.exists()) {
        Object.entries(vendas.val()).forEach(([id, data]: any) => {
          // Criação
          items.push({
            id,
            type: 'venda',
            action: 'created',
            data: { ...data },
            timestamp: new Date(data.createdAt),
            userName: data.vendedorNome,
          });
          // Edição
          if (data.updatedAt) {
            items.push({
              id: `${id}_updated`,
              type: 'venda',
              action: 'updated',
              data: { ...data, updatedByName: data.updatedByNome || usersMap[data.updatedBy] || '' },
              timestamp: new Date(data.updatedAt),
              userName: data.vendedorNome,
            });
          }
          // Exclusão
          if (data.deletedAt) {
            items.push({
              id: `${id}_deleted`,
              type: 'venda',
              action: 'deleted',
              data: { ...data, deletedByName: data.deletedByNome || usersMap[data.deletedBy] || '' },
              timestamp: new Date(data.deletedAt),
              userName: data.vendedorNome,
            });
          }
          // Restauração
          if (data.restoredAt) {
            items.push({
              id: `${id}_restored`,
              type: 'venda',
              action: 'restored',
              data: { ...data, restoredByName: data.restoredByNome || usersMap[data.restoredBy] || '' },
              timestamp: new Date(data.restoredAt),
              userName: data.vendedorNome,
            });
          }
        });
      }

      if (despesas.exists()) {
        Object.entries(despesas.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'despesa',
            action: 'created',
            data: { ...data },
            timestamp: new Date(data.createdAt),
            userName: data.usuarioNome,
          });
          if (data.updatedAt) {
            items.push({
              id: `${id}_updated`,
              type: 'despesa',
              action: 'updated',
              data: { ...data, updatedByName: data.updatedByNome || usersMap[data.updatedBy] || '' },
              timestamp: new Date(data.updatedAt),
              userName: data.usuarioNome,
            });
          }
          if (data.deletedAt) {
            items.push({
              id: `${id}_deleted`,
              type: 'despesa',
              action: 'deleted',
              data: { ...data, deletedByName: data.deletedByNome || usersMap[data.deletedBy] || '' },
              timestamp: new Date(data.deletedAt),
              userName: data.usuarioNome,
            });
          }
          if (data.restoredAt) {
            items.push({
              id: `${id}_restored`,
              type: 'despesa',
              action: 'restored',
              data: { ...data, restoredByName: data.restoredByNome || usersMap[data.restoredBy] || '' },
              timestamp: new Date(data.restoredAt),
              userName: data.usuarioNome,
            });
          }
        });
      }

      if (produtos.exists()) {
        Object.entries(produtos.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'produto',
            action: data.deletedAt ? 'deleted' : 'created',
            data: { ...data, deletedByName: data.deletedByNome || usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
          });
          if (data.updatedAt && !data.deletedAt) {
            items.push({
              id: `${id}_updated`,
              type: 'produto',
              action: 'updated',
              data: { ...data, updatedByName: data.updatedByNome || usersMap[data.updatedBy] || '' },
              timestamp: new Date(data.updatedAt),
            });
          }
        });
      }

      if (clientes.exists()) {
        Object.entries(clientes.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'cliente',
            action: 'created',
            data: { ...data },
            timestamp: new Date(data.createdAt),
          });
          if (data.updatedAt) {
            items.push({
              id: `${id}_updated`,
              type: 'cliente',
              action: 'updated',
              data: { ...data, updatedByName: data.updatedByNome || usersMap[data.updatedBy] || '' },
              timestamp: new Date(data.updatedAt),
              userName: data.nome,
            });
          }
          if (data.deletedAt) {
            items.push({
              id: `${id}_deleted`,
              type: 'cliente',
              action: 'deleted',
              data: { ...data, deletedByName: data.deletedByNome || usersMap[data.deletedBy] || '' },
              timestamp: new Date(data.deletedAt),
              userName: data.nome,
            });
          }
        });
      }

      if (ciclos.exists()) {
        Object.entries(ciclos.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'ciclo',
            action: 'created',
            data: { ...data },
            timestamp: new Date(data.createdAt),
            userName: data.criadoPorNome,
          });
          if (data.closedAt) {
            items.push({
              id: `${id}_closed`,
              type: 'ciclo',
              action: 'closed',
              data: { ...data, closedByName: data.fechadoPorNome || usersMap[data.fechadoPorId] || '' },
              timestamp: new Date(data.closedAt),
              userName: data.vendedorNome,
            });
          }
          if (data.reabertoAt) {
            items.push({
              id: `${id}_reopened`,
              type: 'ciclo',
              action: 'reopened',
              data: { ...data, reabertoByName: data.reabertoByNome || usersMap[data.reabertoBy] || '' },
              timestamp: new Date(data.reabertoAt),
              userName: data.vendedorNome,
            });
          }
          if (data.updatedAt) {
            items.push({
              id: `${id}_updated`,
              type: 'ciclo',
              action: 'updated',
              data: { ...data, updatedByName: data.updatedByNome || usersMap[data.updatedBy] || '' },
              timestamp: new Date(data.updatedAt),
              userName: data.vendedorNome,
            });
          }
          if (data.deletedAt) {
            items.push({
              id: `${id}_deleted`,
              type: 'ciclo',
              action: 'deleted',
              data: { ...data, deletedByName: data.deletedByNome || usersMap[data.deletedBy] || '' },
              timestamp: new Date(data.deletedAt),
              userName: data.vendedorNome,
            });
          }
        });
      }

      if (depositos.exists()) {
        Object.entries(depositos.val()).forEach(([id, data]: any) => {
          items.push({
            id,
            type: 'deposito',
            action: 'created',
            data: { ...data },
            timestamp: new Date(data.createdAt),
            userName: data.registradoPorNome,
          });
          if (data.updatedAt) {
            items.push({
              id: `${id}_updated`,
              type: 'deposito',
              action: 'updated',
              data: { ...data, updatedByName: data.updatedByNome || usersMap[data.updatedBy] || '' },
              timestamp: new Date(data.updatedAt),
              userName: data.registradoPorNome,
            });
          }
          if (data.deletedAt) {
            items.push({
              id: `${id}_deleted`,
              type: 'deposito',
              action: 'deleted',
              data: { ...data, deletedByName: data.deletedByNome || usersMap[data.deletedBy] || '' },
              timestamp: new Date(data.deletedAt),
              userName: data.registradoPorNome,
            });
          }
          if (data.restoredAt) {
            items.push({
              id: `${id}_restored`,
              type: 'deposito',
              action: 'restored',
              data: { ...data, restoredByName: data.restoredByNome || usersMap[data.restoredBy] || '' },
              timestamp: new Date(data.restoredAt),
              userName: data.registradoPorNome,
            });
          }
        });
      }

      if (vales.exists()) {
        Object.entries(vales.val()).forEach(([cardId, cardData]: any) => {
          items.push({
            id: cardId,
            type: 'vale',
            action: 'created',
            data: { ...cardData },
            timestamp: new Date(cardData.createdAt),
            userName: cardData.funcionarioNome,
          });
          if (cardData.quitadoEm) {
            items.push({
              id: `${cardId}_quitado`,
              type: 'vale',
              action: 'quitted',
              data: { ...cardData, quitadoPorNome: cardData.quitadoPorNome || usersMap[cardData.quitadoPor] || '' },
              timestamp: new Date(cardData.quitadoEm),
              userName: cardData.funcionarioNome,
            });
          }
          if (cardData.updatedAt) {
            items.push({
              id: `${cardId}_updated`,
              type: 'vale',
              action: 'updated',
              data: { ...cardData, updatedByName: cardData.updatedByNome || usersMap[cardData.updatedBy] || '' },
              timestamp: new Date(cardData.updatedAt),
              userName: cardData.funcionarioNome,
            });
          }
          // Registros individuais dentro do vale
          if (cardData.registros) {
            Object.entries(cardData.registros).forEach(([regId, reg]: any) => {
              items.push({
                id: `${cardId}_${regId}`,
                type: 'vale',
                action: 'vale_registro',
                data: { ...cardData, registro: reg },
                timestamp: new Date(reg.createdAt),
                userName: cardData.funcionarioNome,
              });
            });
          }
        });
      }

      setHistory(items.filter(item => !Number.isNaN(item.timestamp.getTime())).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [allowed]);

  const getRoute = (item: HistoryItem): string | null => {
    switch (item.type) {
      case 'venda': return '/vendas';
      case 'despesa': return '/despesas';
      case 'produto': return item.action === 'deleted' ? null : '/estoque';
      case 'usuario': return '/usuarios';
      case 'cliente': return '/clientes';
      case 'role_change': case 'status_change': return '/usuarios';
      case 'password_reset': return '/usuarios';
      case 'ciclo': return '/ciclos';
      case 'deposito': return '/depositos';
      case 'vale': return '/vales';
      default: return null;
    }
  };

  const getMeta = (item: HistoryItem) => {
    // Deletados
    if (item.action === 'deleted') {
      if (item.type === 'ciclo') return { icon: Trash2, tone: 'red', label: 'Ciclo removido', title: `Ciclo removido: ${item.data.titulo || item.data.vendedorNome}` };
      if (item.type === 'deposito') return { icon: Trash2, tone: 'red', label: 'Depósito removido', title: `Depósito removido: ${formatCurrency(item.data.valor)}` };
      if (item.type === 'vale') return { icon: Trash2, tone: 'red', label: 'Vale removido', title: `Vale removido: ${item.data.funcionarioNome}` };
      return { icon: Trash2, tone: 'red', label: 'Removido', title: item.type === 'venda' ? 'Venda removida' : item.type === 'despesa' ? 'Despesa removida' : 'Registro removido' };
    }
    // Restaurados
    if (item.action === 'restored') {
      return { icon: RotateCcw, tone: 'blue', label: 'Restaurado', title: `${item.type === 'venda' ? 'Venda' : item.type === 'despesa' ? 'Despesa' : item.type === 'deposito' ? 'Depósito' : 'Registro'} restaurado` };
    }
    // Editados
    if (item.action === 'updated') {
      if (item.type === 'ciclo') return { icon: Edit3, tone: 'cyan', label: 'Ciclo editado', title: `Ciclo editado: ${item.data.titulo || item.data.vendedorNome}` };
      if (item.type === 'produto') return { icon: Edit3, tone: 'blue', label: 'Produto editado', title: `Produto editado: ${item.data.modelo || ''}` };
      if (item.type === 'cliente') return { icon: Edit3, tone: 'violet', label: 'Cliente editado', title: `Cliente editado: ${item.data.nome || ''}` };
      if (item.type === 'venda') return { icon: Edit3, tone: 'green', label: 'Venda editada', title: `Venda editada — ${formatCurrency(item.data.valorTotal)}` };
      if (item.type === 'despesa') return { icon: Edit3, tone: 'amber', label: 'Despesa editada', title: `Despesa editada — ${formatCurrency(item.data.valor)}` };
      if (item.type === 'deposito') return { icon: Edit3, tone: 'cyan', label: 'Depósito editado', title: `Depósito editado — ${formatCurrency(item.data.valor)}` };
      if (item.type === 'vale') return { icon: Edit3, tone: 'amber', label: 'Vale editado', title: `Vale editado: ${item.data.funcionarioNome}` };
      return { icon: Edit3, tone: 'cyan', label: 'Editado', title: 'Registro editado' };
    }
    // Ciclos
    if (item.type === 'ciclo') {
      if (item.action === 'closed') return { icon: Ban, tone: 'red', label: 'Ciclo fechado', title: `Ciclo fechado: ${item.data.titulo || item.data.vendedorNome}` };
      if (item.action === 'reopened') return { icon: RefreshCw, tone: 'green', label: 'Ciclo reaberto', title: `Ciclo reaberto: ${item.data.titulo || item.data.vendedorNome}` };
      return { icon: RefreshCw, tone: 'emerald', label: 'Ciclo', title: `Ciclo criado: ${item.data.titulo || item.data.vendedorNome}` };
    }
    // Depósitos
    if (item.type === 'deposito') {
      return { icon: Wallet, tone: 'cyan', label: 'Depósito', title: `Depósito: ${formatCurrency(item.data.valor)}` };
    }
    // Vales
    if (item.type === 'vale') {
      if (item.action === 'quitted') return { icon: CheckCircle2, tone: 'green', label: 'Vale quitado', title: `Vale quitado: ${item.data.funcionarioNome}` };
      if (item.action === 'vale_registro') return { icon: CreditCard, tone: 'amber', label: 'Registro de vale', title: `Vale: ${formatCurrency(item.data.registro?.valor || 0)} — ${item.data.funcionarioNome}` };
      return { icon: CreditCard, tone: 'amber', label: 'Vale', title: `Vale criado: ${item.data.funcionarioNome}` };
    }
    // Usuários
    if (item.type === 'usuario') {
      return { icon: UserPlus, tone: 'emerald', label: 'Usuário', title: `Usuário criado: ${item.data.nome}` };
    }
    if (item.type === 'role_change') return { icon: UserCog, tone: 'sky', label: 'Permissão', title: `Permissão alterada para ${item.data.nome}` };
    if (item.type === 'status_change') return { icon: ShieldAlert, tone: 'red', label: 'Status', title: `Status alterado para ${item.data.nome}: ${item.data.status}` };
    if (item.type === 'password_reset') return { icon: LogIn, tone: 'amber', label: 'Senha', title: `Senha resetada para ${item.data.nome}` };
    // Padrões
    if (item.type === 'venda') return { icon: ShoppingBag, tone: 'green', label: 'Venda', title: `Venda registrada — ${formatCurrency(item.data.valorTotal)}` };
    if (item.type === 'despesa') return { icon: DollarSign, tone: 'amber', label: 'Financeiro', title: `Despesa registrada — ${formatCurrency(item.data.valor)}` };
    if (item.type === 'produto') return { icon: Package, tone: 'blue', label: 'Produto', title: `Produto criado${item.data.modelo ? `: ${item.data.modelo}` : ''}` };
    if (item.type === 'cliente') return { icon: Users, tone: 'violet', label: 'Cliente', title: `Cliente criado${item.data.nome ? `: ${item.data.nome}` : ''}` };
    return { icon: Sparkles, tone: 'cyan', label: 'Evento', title: 'Evento do sistema' };
  };

  const getDescription = (item: HistoryItem) => {
    switch (item.action) {
      case 'deleted': return `Removido por ${item.data.deletedByName || 'Usuário'}`;
      case 'restored': return `Restaurado por ${item.data.restoredByName || 'Usuário'}`;
      case 'updated': return `Editado por ${item.data.updatedByName || 'Usuário'}`;
      case 'closed': return `Fechado por ${item.data.closedByName || 'Usuário'}`;
      case 'reopened': return `Reaberto por ${item.data.reabertoByName || 'Usuário'}`;
      case 'quitted': return `Quitado por ${item.data.quitadoPorNome || 'Usuário'}`;
      case 'vale_registro': return `Valor: ${formatCurrency(item.data.registro?.valor || 0)} — ${item.data.registro?.descricao || ''}`;
      case 'role_changed': return `Alterado por ${item.data.changedBy || 'Admin'}`;
      case 'status_changed': return `Alterado para "${item.data.status}" por ${item.data.changedBy || 'Admin'}`;
      case 'password_reset': return `Resetada por ${item.data.resetBy || 'Admin'}`;
    }
    switch (item.type) {
      case 'venda': return item.data.clienteNome ? `Cliente: ${item.data.clienteNome}` : 'Nova venda registrada';
      case 'despesa': return `${item.data.tipo || 'Despesa'} registrada no caixa`;
      case 'ciclo': return `Criado por ${item.data.criadoPorNome || 'Admin'} · ${item.data.produtos?.length || 0} produto(s)`;
      case 'deposito': return `Registrado por ${item.data.registradoPorNome || 'Usuário'}`;
      case 'vale': return `Funcionário: ${item.data.funcionarioNome}`;
      case 'cliente': return item.data.nome || 'Novo cliente cadastrado';
    }
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
        item.data.vendedorNome,
        item.data.funcionarioNome,
        item.data.titulo,
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
    const financeiro = history.filter(item => (item.type === 'despesa' || item.type === 'deposito' || item.type === 'vale') && item.action !== 'deleted').length;
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
                  const isCiclo = item.type === 'ciclo';
                  const isDeposito = item.type === 'deposito';
                  const isVale = item.type === 'vale';
                  const isExpandable = isVenda || isDespesa || isCiclo || isDeposito || isVale;
                  const Icon = meta.icon;
                  const route = getRoute(item);

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
                              <div className="flex items-center gap-2">
                                <h2 className="truncate text-sm font-bold text-content">{meta.title}</h2>
                                {route && (
                                  <Link
                                    to={route}
                                    onClick={e => e.stopPropagation()}
                                    className="shrink-0 rounded p-1 text-content-muted/50 hover:text-cyan-300 transition-colors"
                                    title="Ir para a página"
                                  >
                                    <ExternalLink size={13} />
                                  </Link>
                                )}
                              </div>
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

                          {isExpanded && isCiclo && (
                            <div className="mt-3 grid gap-2 rounded-xl border border-cyan-300/10 bg-[#0c121b]/85 p-3 text-xs text-content-secondary sm:grid-cols-4">
                              <Detail label="Status" value={item.data.status} />
                              <Detail label="Período" value={`${item.data.dataInicio || '—'} a ${item.data.dataFim || '—'}`} />
                              <Detail label="Produtos" value={String(item.data.produtos?.length || 0)} />
                              <Detail label="Vendedor" value={item.data.vendedorNome} />
                            </div>
                          )}

                          {isExpanded && isDeposito && (
                            <div className="mt-3 grid gap-2 rounded-xl border border-cyan-300/10 bg-[#0c121b]/85 p-3 text-xs text-content-secondary sm:grid-cols-3">
                              <Detail label="Valor" value={formatCurrency(item.data.valor)} />
                              <Detail label="Depositante" value={item.data.depositanteNome} />
                              <Detail label="Data" value={new Date(item.data.data).toLocaleDateString('pt-BR')} />
                            </div>
                          )}

                          {isExpanded && isVale && item.action === 'vale_registro' && item.data.registro && (
                            <div className="mt-3 grid gap-2 rounded-xl border border-cyan-300/10 bg-[#0c121b]/85 p-3 text-xs text-content-secondary sm:grid-cols-3">
                              <Detail label="Valor" value={formatCurrency(item.data.registro.valor)} />
                              <Detail label="Data" value={new Date(item.data.registro.data).toLocaleDateString('pt-BR')} />
                              <Detail label="Descrição" value={item.data.registro.descricao} />
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
