import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ProdutoForm } from '~/components/produtos/ProdutoForm';
import { useAuth } from '~/contexts/AuthContext';
import { useProdutos } from '~/hooks/useRealtime';
import { userIsAdmin } from '~/models';

export default function EditarProdutoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { produtos, loading } = useProdutos();
  const allowed = !authLoading && user && userIsAdmin(user);

  useEffect(() => { if (!authLoading && !allowed) navigate('/vendas'); }, [authLoading, allowed]);

  useEffect(() => {
    if (!loading && produtos.length > 0 && !produtos.find(p => p.id === id)) navigate('/produtos');
  }, [loading, produtos, id]);

  if (!allowed) return null;
  if (loading) return <p className="text-center text-content-muted">Carregando...</p>;
  const produto = produtos.find(p => p.id === id);
  if (!produto) return null;

  return <ProdutoForm produto={produto} />;
}
