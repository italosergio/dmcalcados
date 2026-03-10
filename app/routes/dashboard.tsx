import { useEffect, useState } from 'react';
import { Card } from '~/components/common/Card';
import { getVendas } from '~/services/vendas.service';
import { getDespesas } from '~/services/despesas.service';
import { formatCurrency } from '~/utils/format';

export default function DashboardPage() {
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getVendas(), getDespesas()])
      .then(([vendas, despesas]) => {
        console.log('Dashboard - Vendas:', vendas.length, 'Despesas:', despesas.length);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const vendasRecentes = vendas.filter(v => new Date(v.data) >= thirtyDaysAgo);
        const despesasRecentes = despesas.filter(d => new Date(d.data) >= thirtyDaysAgo);

        console.log('Vendas recentes:', vendasRecentes.length, 'Despesas recentes:', despesasRecentes.length);

        const somaVendas = vendasRecentes.reduce((sum, v) => sum + v.valorTotal, 0);
        const somaDespesas = despesasRecentes.reduce((sum, d) => sum + d.valor, 0);

        console.log('Soma vendas:', somaVendas, 'Soma despesas:', somaDespesas);

        setTotalVendas(somaVendas);
        setTotalDespesas(somaDespesas);
      })
      .catch(err => console.error('Erro dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const saldo = totalVendas - totalDespesas;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Vendas (30 dias)</h3>
            <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(totalVendas)}</p>
          </Card>
          <Card>
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Despesas (30 dias)</h3>
            <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
          </Card>
          <Card>
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Saldo</h3>
            <p className={`mt-2 text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldo)}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
