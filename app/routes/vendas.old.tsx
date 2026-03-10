import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '~/components/layout/Layout';
import { Button } from '~/components/common/Button';
import { Card } from '~/components/common/Card';
import { getVendas } from '~/services/vendas.service';
import { formatCurrency, formatDate } from '~/utils/format';
import type { Venda } from '~/models';

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Carregando vendas...');
    getVendas()
      .then(data => {
        console.log('Vendas carregadas:', data);
        const sorted = data.sort((a, b) => 
          new Date(b.createdAt || b.data).getTime() - new Date(a.createdAt || a.data).getTime()
        );
        setVendas(sorted);
      })
      .catch(err => {
        console.error('Erro ao carregar vendas:', err);
        setVendas([]);
      })
      .finally(() => {
        console.log('Finalizou carregamento');
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Vendas</h1>
          <Button onClick={() => navigate('/vendas/nova')}>
            Nova Venda
          </Button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : vendas.length === 0 ? (
          <div className="rounded border border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-4 text-gray-600 dark:text-gray-400">Nenhuma venda registrada</p>
            <Button onClick={() => navigate('/vendas/nova')}>
              Registrar Primeira Venda
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {vendas.map(venda => (
              <Card key={venda.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(new Date(venda.data))}
                    </p>
                    <p className="mt-1 text-sm">
                      {venda.produtos.length} produto(s)
                    </p>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(venda.valorTotal)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
