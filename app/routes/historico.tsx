import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '~/services/firebase';
import { ShoppingBag, DollarSign, Package, UserPlus, Trash2, UserCog, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '~/utils/format';

interface HistoryItem {
  id: string;
  type: 'venda' | 'despesa' | 'produto' | 'usuario' | 'cliente' | 'role_change';
  action: 'created' | 'deleted' | 'role_changed';
  data: any;
  timestamp: Date;
  userName?: string;
}

export default function HistoricoPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get(ref(db, 'vendas')),
      get(ref(db, 'despesas')),
      get(ref(db, 'produtos')),
      get(ref(db, 'users')),
      get(ref(db, 'clientes'))
    ]).then(([vendas, despesas, produtos, users, clientes]) => {
      const items: HistoryItem[] = [];
      const usersMap: any = {};

      if (users.exists()) {
        Object.entries(users.val()).forEach(([id, data]: any) => {
          usersMap[id] = data.nome;
          items.push({ 
            id, 
            type: 'usuario', 
            action: data.deletedAt ? 'deleted' : 'created', 
            data: { ...data, deletedByName: usersMap[data.deletedBy] },
            timestamp: new Date(data.deletedAt || data.createdAt),
            userName: data.nome
          });
          if (data.roleUpdatedAt) {
            items.push({
              id: `${id}_role`,
              type: 'role_change',
              action: 'role_changed',
              data: { ...data, changedBy: usersMap[data.roleUpdatedBy] || 'Admin' },
              timestamp: new Date(data.roleUpdatedAt),
              userName: data.nome
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
            userName: data.vendedorNome
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
            userName: data.usuarioNome
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
            timestamp: new Date(data.deletedAt || data.createdAt)
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
            timestamp: new Date(data.deletedAt || data.createdAt)
          });
        });
      }

      setHistory(items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      setLoading(false);
    });
  }, []);

  const getIcon = (type: string, action: string) => {
    if (action === 'deleted') {
      return <Trash2 size={18} className="text-red-600 flex-shrink-0" />;
    }
    switch(type) {
      case 'venda': return <ShoppingBag size={18} className="text-green-600 flex-shrink-0" />;
      case 'despesa': return <DollarSign size={18} className="text-red-600 flex-shrink-0" />;
      case 'produto': return <Package size={18} className="text-blue-600 flex-shrink-0" />;
      case 'cliente': return <UserPlus size={18} className="text-purple-600 flex-shrink-0" />;
      case 'usuario': return <UserPlus size={18} className="text-green-600 flex-shrink-0" />;
      case 'role_change': return <UserCog size={18} className="text-blue-600 flex-shrink-0" />;
      default: return null;
    }
  };

  const getActionText = (item: HistoryItem) => {
    if (item.action === 'deleted') return 'Deletado';
    if (item.action === 'role_changed') return `Role alterado para ${item.data.role}`;
    if (item.type === 'venda') return `Venda - ${formatCurrency(item.data.valorTotal)}`;
    if (item.type === 'despesa') return `Despesa - ${formatCurrency(item.data.valor)} - ${item.data.tipo}`;
    return 'Criado';
  };

  const getActionColor = (action: string) => {
    if (action === 'deleted') return 'text-red-600';
    if (action === 'role_changed') return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div>
      <h1 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold">Histórico de Atividades</h1>
      {loading ? (
        <p className="text-sm">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => {
            const isExpanded = expandedItem === item.id;
            const isVenda = item.type === 'venda';
            const isDespesa = item.type === 'despesa';
            const isExpandable = isVenda || isDespesa;
            
            return (
              <div 
                key={item.id} 
                className={`rounded border border-gray-700 bg-gray-800 p-2 sm:p-3 text-xs sm:text-sm ${
                  isExpandable ? 'cursor-pointer hover:bg-gray-900' : ''
                }`}
                onClick={() => isExpandable && setExpandedItem(isExpanded ? null : item.id)}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  {getIcon(item.type, item.action)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      <span className="font-medium">{item.type.toUpperCase()}</span>
                      <span>-</span>
                      <span className={getActionColor(item.action)}>
                        {getActionText(item)}
                      </span>
                      {isVenda && item.data.clienteNome && (
                        <>
                          <span>-</span>
                          <span className="text-gray-300 truncate">para {item.data.clienteNome}</span>
                        </>
                      )}
                      {isExpandable && (
                        <span className="ml-auto flex-shrink-0">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {item.userName && (
                        <span className="block sm:inline">Por: {item.userName} - </span>
                      )}
                      <span className="block sm:inline">{item.timestamp.toLocaleString('pt-BR')}</span>
                      {item.action === 'deleted' && item.data.deletedByName && (
                        <span className="block sm:inline sm:ml-2 text-red-600">Deletado por: {item.data.deletedByName}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {isExpanded && isVenda && item.data.produtos && (
                  <div className="mt-3 space-y-1 border-t pt-3 border-gray-700">
                    <p className="text-xs font-semibold text-gray-400">Produtos:</p>
                    {item.data.produtos.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between gap-2 text-xs text-gray-400">
                        <span className="truncate">{p.quantidade}x {p.nome}</span>
                        <span className="flex-shrink-0">{formatCurrency(p.valorTotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {isExpanded && isDespesa && (
                  <div className="mt-3 border-t pt-3 text-xs text-gray-400 border-gray-700">
                    <p><span className="font-semibold">Tipo:</span> {item.data.tipo}</p>
                    <p><span className="font-semibold">Valor:</span> {formatCurrency(item.data.valor)}</p>
                    <p><span className="font-semibold">Data:</span> {new Date(item.data.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
