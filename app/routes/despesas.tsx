import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '~/components/common/Button';
import { Card } from '~/components/common/Card';
import { getDespesas } from '~/services/despesas.service';
import { formatCurrency, formatDate } from '~/utils/format';
import type { Despesa } from '~/models';

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDespesas().then(setDespesas).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Despesas</h1>
        <Link to="/despesas/nova" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto flex items-center justify-center">
            <Plus size={20} className="mr-2" />
            Nova Despesa
          </Button>
        </Link>
      </div>

        {loading ? (
          <p>Carregando...</p>
        ) : despesas.length === 0 ? (
          <p className="text-sm sm:text-base text-gray-600">Nenhuma despesa registrada</p>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {despesas.map(despesa => (
              <Card key={despesa.id}>
                <div className="flex items-start sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{despesa.tipo}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(new Date(despesa.data))}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                      {despesa.usuarioNome}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base sm:text-lg font-bold text-red-600">
                      {formatCurrency(despesa.valor)}
                    </p>
                    <Button onClick={() => {
                      if (confirm('Deseja apagar esta despesa?')) {
                        import('~/services/despesas.service').then(m => m.deleteDespesa(despesa.id)).then(() => window.location.reload());
                      }
                    }} className="mt-2 text-xs px-2 py-1">Apagar</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
