import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { Input } from '~/components/common/Input';
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
    getVendas().then(vendasData => {
      const clientesMap: Record<string, ClienteInfo> = {};
      
      vendasData.forEach(venda => {
        if (!venda.deletedAt) {
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
  }, []);

  const filtered = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meus Clientes</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Clientes que você já atendeu</p>
      </div>

      <Input
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6"
      />

      {loading ? (
        <p>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">Nenhum cliente encontrado</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map(cliente => {
            const isExpanded = expandedClient === cliente.id;
            
            return (
              <Card key={cliente.id}>
                <div 
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setExpandedClient(isExpanded ? null : cliente.id)}
                >
                  <div className="flex flex-1 items-center gap-2">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    <div className="flex-1">
                      <h3 className="font-semibold">{cliente.nome}</h3>
                      <p className="text-xs text-gray-500">{cliente.vendas.length} compra(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total vendido</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(cliente.total)}
                    </p>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-2 border-t pt-4 dark:border-gray-700">
                    <h4 className="font-semibold text-sm">Histórico de Vendas</h4>
                    {cliente.vendas.map(venda => (
                      <div key={venda.id} className="rounded bg-gray-50 p-3 text-sm dark:bg-gray-900">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{new Date(venda.data).toLocaleDateString('pt-BR')}</span>
                          <span className="font-bold text-green-600">{formatCurrency(venda.valorTotal)}</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          {venda.produtos.map((p, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{p.quantidade}x {p.nome}</span>
                              <span>{formatCurrency(p.valorTotal)}</span>
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
