import type { Produto } from '~/models';
import { formatCurrency } from '~/utils/format';

interface ProdutoCardProps {
  produto: Produto;
}

export function ProdutoCard({ produto }: ProdutoCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <img 
        src={produto.foto} 
        alt={produto.nome} 
        className="h-48 w-full rounded object-cover"
      />
      <h3 className="mt-3 font-semibold">{produto.nome}</h3>
      <p className="mt-1 text-lg font-bold">{formatCurrency(produto.valor)}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Estoque: {produto.estoque}</p>
    </div>
  );
}
