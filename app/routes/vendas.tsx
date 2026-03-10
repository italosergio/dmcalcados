import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { UserCircle } from 'lucide-react';
import { Button } from '~/components/common/Button';
import { getVendas } from '~/services/vendas.service';
import type { Venda } from '~/models';

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getVendas()
      .then(setVendas)
      .catch(() => setVendas([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <Button onClick={() => navigate('/vendas/nova')}>
          Nova Venda
        </Button>
      </div>

      {loading && <p>Carregando...</p>}
      
      {!loading && vendas.length === 0 && (
        <div className="rounded border bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-4">Nenhuma venda registrada</p>
          <Button onClick={() => navigate('/vendas/nova')}>
            Registrar Primeira Venda
          </Button>
        </div>
      )}

      {!loading && vendas.length > 0 && (
        <div className="space-y-4">
          {vendas.map(venda => (
            <div key={venda.id} className="rounded border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-green-600">R$ {venda.valorTotal.toFixed(2)}</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{venda.clienteNome}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <UserCircle size={14} />
                    <span>{venda.vendedorNome}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{new Date(venda.data).toLocaleDateString('pt-BR')}</p>
                  <Button onClick={() => {
                    if (confirm('Deseja apagar esta venda?')) {
                      import('~/services/vendas.service').then(m => m.deleteVenda(venda.id)).then(() => window.location.reload());
                    }
                  }} className="mt-2 text-xs">Apagar</Button>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {venda.produtos.map((p, i) => (
                  <p key={i}>{p.quantidade}x {p.nome} - R$ {p.valorTotal.toFixed(2)}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
