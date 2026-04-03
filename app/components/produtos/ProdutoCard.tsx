import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Pencil, Trash2, Footprints } from 'lucide-react';
import { deleteProduto } from '~/services/produtos.service';
import { formatCurrency } from '~/utils/format';
import type { Produto } from '~/models';

interface ProdutoCardProps {
  produto: Produto;
  onDeleted?: () => void;
  onClick?: () => void;
}

export function ProdutoCard({ produto, onDeleted, onClick }: ProdutoCardProps) {
  const navigate = useNavigate();
  const [deleteClicks, setDeleteClicks] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleDelete = useCallback(async () => {
    const clicks = deleteClicks + 1;
    clearTimeout(timer.current);
    if (clicks >= 3) {
      await deleteProduto(produto.id);
      onDeleted?.();
    } else {
      setDeleteClicks(clicks);
      timer.current = setTimeout(() => setDeleteClicks(0), 3000);
    }
  }, [deleteClicks, produto.id, onDeleted]);

  const deleteLabel = deleteClicks === 0 ? 'Excluir' : deleteClicks === 1 ? 'Tem certeza?' : 'Confirmar!';

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 cursor-pointer" onClick={onClick}>
      {produto.foto ? (
        <img src={produto.foto} alt={produto.modelo} className="h-48 w-full rounded-lg object-cover" />
      ) : (
        <div className="h-48 w-full rounded-lg bg-elevated flex items-center justify-center">
          <Footprints size={40} className="text-content-muted opacity-30" />
        </div>
      )}
      <h3 className="mt-3 font-semibold">{produto.modelo}</h3>
      <p className="text-xs text-content-muted">REF: {produto.referencia}</p>
      <p className="text-sm font-semibold text-green-400 mt-1">{formatCurrency(produto.valor)}</p>
      <p className="text-xs text-content-muted mt-0.5">Total: {formatCurrency(produto.valor * produto.estoque)}</p>
      <p className="text-xs text-content-secondary">
        {produto.estoque} un · {Math.floor(produto.estoque / 15)} pct{produto.estoque % 15 > 0 ? ` + ${produto.estoque % 15} un` : ''}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/produtos/${produto.id}/editar`); }}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
          <Pencil size={14} /> Editar
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
            deleteClicks === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            : deleteClicks === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
          }`}>
          <Trash2 size={14} /> {deleteLabel}
        </button>
      </div>
    </div>
  );
}
