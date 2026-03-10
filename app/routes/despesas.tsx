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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Despesas</h1>
          <Link to="/despesas/nova">
            <Button>
              <Plus size={20} className="mr-2" />
              Nova Despesa
            </Button>
          </Link>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : despesas.length === 0 ? (
          <p className="text-gray-600">Nenhuma despesa registrada</p>
        ) : (
          <div className="grid gap-4">
            {despesas.map(despesa => (
              <Card key={despesa.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{despesa.tipo}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(new Date(despesa.data))}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {despesa.usuarioNome}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(despesa.valor)}
                    </p>
                    <Button onClick={() => {
                      if (confirm('Deseja apagar esta despesa?')) {
                        import('~/services/despesas.service').then(m => m.deleteDespesa(despesa.id)).then(() => window.location.reload());
                      }
                    }} className="mt-2 text-xs">Apagar</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    
  );
}
