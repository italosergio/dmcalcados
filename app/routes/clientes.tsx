import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';
import { getClientes, deleteCliente } from '~/services/clientes.service';
import { getVendas } from '~/services/vendas.service';
import { useAuth } from '~/contexts/AuthContext';
import { formatCurrency } from '~/utils/format';
import type { Cliente, Venda } from '~/models';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clienteTotals, setClienteTotals] = useState<Record<string, number>>({});
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([getClientes(), getVendas()]).then(([clientesData, vendasData]) => {
      setClientes(clientesData);
      setVendas(vendasData);
      
      const totals: Record<string, number> = {};
      vendasData.forEach(venda => {
        if (!venda.deletedAt) {
          totals[venda.clienteId] = (totals[venda.clienteId] || 0) + venda.valorTotal;
        }
      });
      setClienteTotals(totals);
    }).finally(() => setLoading(false));
  }, []);

  const getClienteVendas = (clienteId: string) => {
    return vendas
      .filter(v => v.clienteId === clienteId && !v.deletedAt)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  };

  const filtered = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <Link to="/clientes/novo">
            <Button>
              <Plus size={20} className="mr-2" />
              Novo Cliente
            </Button>
          </Link>
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
              const clienteVendas = getClienteVendas(cliente.id);
              
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
                        <p className="text-sm text-gray-600 dark:text-gray-400">{cliente.endereco}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total comprado</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(clienteTotals[cliente.id] || 0)}
                        </p>
                      </div>
                      {user?.role === 'admin' && (
                        <Button onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Deseja apagar o cliente ${cliente.nome}?`)) {
                            deleteCliente(cliente.id).then(() => window.location.reload());
                          }
                        }} className="text-xs">
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 space-y-2 border-t pt-4 dark:border-gray-700">
                      <h4 className="font-semibold text-sm">Histórico de Compras</h4>
                      {clienteVendas.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma compra registrada</p>
                      ) : (
                        clienteVendas.map(venda => (
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
                            <div className="mt-2 text-xs text-gray-500">
                              Vendedor: {venda.vendedorNome}
                            </div>
                          </div>
                        ))
                      )}
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
