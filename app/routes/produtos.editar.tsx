import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getProdutos } from '~/services/produtos.service';
import { ProdutoForm } from '~/components/produtos/ProdutoForm';
import { useAuth } from '~/contexts/AuthContext';
import type { Produto } from '~/models';

export default function EditarProdutoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'vendedor') { navigate('/vendas'); return; }
    getProdutos().then(produtos => {
      const found = produtos.find(p => p.id === id);
      if (found) setProduto(found);
      else navigate('/produtos');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <p className="text-center text-content-muted">Carregando...</p>;
  if (!produto) return null;

  return <ProdutoForm produto={produto} />;
}
