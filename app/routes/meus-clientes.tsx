import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { Input } from '~/components/common/Input';
import { Button } from '~/components/common/Button';
import { getVendas } from '~/services/vendas.service';
import { useAuth } from '~/contexts/AuthContext';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';

interface ClienteInfo {
  id: string;
  nome: string;
  total: number;
  vendas: Venda[];
}

export default function MeusClientesPage() {
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    getVendas().then(vendasData => {
      const clientesMap: Record<string, ClienteInfo> = {};
      
      vendasData.forEach(venda => {
        // Filtrar apenas vendas do vendedor logado
        const isMinhaVenda = venda.vendedorId === user.uid || venda.vendedorId === user.id;
        
        if (!venda.deletedAt && isMinhaVenda) {
          if (!clientesMap[venda.clienteId]) {
            clientesMap[venda.clienteId] = {
              id: venda.clienteId,
              nome: venda.clienteNome,
              total: 0,
              vendas: []
            };
          }
          clientesMap[venda.clienteId].total += venda.valorTotal;
          clientesMap[venda.clienteId].vendas.push(venda);
        }
      });

      const clientesList = Object.values(clientesMap).map(c => ({
        ...c,
        vendas: c.vendas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      }));

      setClientes(clientesList);
      setLoading(false);
    });
  }, [user]);

  const filtered = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Meus Clientes</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Clientes que você já atendeu</p>
        </div>
        <Link to="/clientes/novo" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto flex items-center justify-center">
            <Plus size={20} className="mr-2" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 sm:mb-6"
      />

      {loading ? (
        <p className="text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 mb-4">Nenhum cliente encontrado</p>
          <Link to="/clientes/novo">
            <Button className="w-full sm:w-auto">
              <Plus size={20} className="mr-2" />
              Adicionar Primeiro Cliente
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filtered.map(cliente => {
            const isExpanded = expandedClient === cliente.id;
            
            return (
              <Card key={cliente.id}>
                <div 
                  className="flex cursor-pointer items-start sm:items-center justify-between gap-2"
                  onClick={() => setExpandedClient(isExpanded ? null : cliente.id)}
                >
                  <div className="flex flex-1 items-start sm:items-center gap-2 min-w-0">
                    {isExpanded ? <ChevronUp size={20} className="flex-shrink-0 mt-1 sm:mt-0" /> : <ChevronDown size={20} className="flex-shrink-0 mt-1 sm:mt-0" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{cliente.nome}</h3>
                      <p className="text-xs text-gray-500">{cliente.vendas.length} compra(s)</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm sm:text-lg font-bold text-green-600">
                      {formatCurrency(cliente.total)}
                    </p>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-2 border-t pt-4 dark:border-gray-700">
                    <h4 className="font-semibold text-xs sm:text-sm">Histórico de Vendas</h4>
                    {cliente.vendas.map(venda => (
                      <div key={venda.id} className="rounded bg-gray-50 p-2 sm:p-3 text-xs sm:text-sm dark:bg-gray-900">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{new Date(venda.data).toLocaleDateString('pt-BR')}</span>
                          <span className="font-bold text-green-600">{formatCurrency(venda.valorTotal)}</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          {venda.produtos.map((p, i) => (
                            <div key={i} className="flex justify-between gap-2">
                              <span className="truncate">{p.quantidade}x {p.nome}</span>
                              <span className="flex-shrink-0">{formatCurrency(p.valorTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
