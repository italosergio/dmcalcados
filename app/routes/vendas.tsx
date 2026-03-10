import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { UserCircle, DollarSign } from 'lucide-react';
import { Button } from '~/components/common/Button';
import { Card } from '~/components/common/Card';
import { Input } from '~/components/common/Input';
import { getVendas } from '~/services/vendas.service';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filteredVendas, setFilteredVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVendedor, setSearchVendedor] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getVendas()
      .then(setVendas)
      .catch(() => setVendas([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchVendedor.trim() === '') {
      setFilteredVendas(vendas);
    } else {
      const filtered = vendas.filter(v => 
        v.vendedorNome?.toLowerCase().includes(searchVendedor.toLowerCase())
      );
      setFilteredVendas(filtered);
    }
  }, [searchVendedor, vendas]);

  const totalVendas = filteredVendas.reduce((sum, v) => sum + v.valorTotal, 0);
  const vendedoresUnicos = Array.from(new Set(vendas.map(v => v.vendedorNome).filter(Boolean))).sort();

  useEffect(() => {
    getVendas()
      .then(setVendas)
      .catch(() => setVendas([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Vendas</h1>
        <Button onClick={() => navigate('/vendas/nova')} className="w-full sm:w-auto">
          Nova Venda
        </Button>
      </div>

      {/* Card de Total */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Total de Vendas</p>
            <p className="text-2xl sm:text-4xl font-bold text-green-600 dark:text-green-400 mt-1">
              {formatCurrency(totalVendas)}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-1">
              {filteredVendas.length} {filteredVendas.length === 1 ? 'venda' : 'vendas'}
            </p>
          </div>
          <div className="bg-green-100 dark:bg-green-900/30 p-3 sm:p-4 rounded-full">
            <DollarSign size={32} className="text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      {/* Filtro por Vendedor */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Filtrar por vendedor..."
            value={searchVendedor}
            onChange={(e) => setSearchVendedor(e.target.value)}
            list="vendedores-list"
          />
          <datalist id="vendedores-list">
            {vendedoresUnicos.map(nome => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
        </div>
        {searchVendedor && (
          <Button 
            variant="secondary" 
            onClick={() => setSearchVendedor('')}
            className="w-full sm:w-auto"
          >
            Limpar Filtro
          </Button>
        )}
      </div>

      {loading && <p>Carregando...</p>}
      
      {!loading && filteredVendas.length === 0 && searchVendedor === '' && (
        <div className="rounded border bg-white p-6 sm:p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-4 text-sm sm:text-base">Nenhuma venda registrada</p>
          <Button onClick={() => navigate('/vendas/nova')} className="w-full sm:w-auto">
            Registrar Primeira Venda
          </Button>
        </div>
      )}

      {!loading && filteredVendas.length === 0 && searchVendedor !== '' && (
        <div className="rounded border bg-white p-6 sm:p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-4 text-sm sm:text-base">Nenhuma venda encontrada para "{searchVendedor}"</p>
          <Button onClick={() => setSearchVendedor('')} variant="secondary" className="w-full sm:w-auto">
            Limpar Filtro
          </Button>
        </div>
      )}

      {!loading && filteredVendas.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {filteredVendas.map(venda => (
            <div key={venda.id} className="rounded border bg-white p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-start sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-green-600">R$ {venda.valorTotal.toFixed(2)}</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{venda.clienteNome}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <UserCircle size={14} />
                    <span className="truncate">{venda.vendedorNome}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">{new Date(venda.data).toLocaleDateString('pt-BR')}</p>
                  <Button onClick={() => {
                    if (confirm('Deseja apagar esta venda?')) {
                      import('~/services/vendas.service').then(m => m.deleteVenda(venda.id)).then(() => window.location.reload());
                    }
                  }} className="mt-2 text-xs px-2 py-1">Apagar</Button>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {venda.produtos.map((p, i) => (
                  <p key={i} className="truncate">{p.quantidade}x {p.nome} - R$ {p.valorTotal.toFixed(2)}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
