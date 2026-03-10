import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { ProdutoCard } from '~/components/produtos/ProdutoCard';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { getProdutos } from '~/services/produtos.service';
import type { Produto } from '~/models';

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProdutos().then(setProdutos).finally(() => setLoading(false));
  }, []);

  const filtered = produtos.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Produtos</h1>
        <Link to="/produtos/novo" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto flex items-center justify-center">
            <Plus size={20} className="mr-2" />
            Novo Produto
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 sm:mb-6"
      />

      {loading ? (
        <p className="text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum produto encontrado</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {filtered.map(produto => (
            <ProdutoCard key={produto.id} produto={produto} />
          ))}
        </div>
      )}
    </div>
  );
}
