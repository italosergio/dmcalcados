import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';
import { getClientes } from '~/services/clientes.service';
import type { Cliente } from '~/models';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientes().then(setClientes).finally(() => setLoading(false));
  }, []);

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
            {filtered.map(cliente => (
              <Card key={cliente.id}>
                <h3 className="font-semibold">{cliente.nome}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{cliente.endereco}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    
  );
}
