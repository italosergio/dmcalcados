import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ProdutoForm } from '~/components/produtos/ProdutoForm';
import { useAuth } from '~/contexts/AuthContext';
import { userIsAdmin } from '~/models';

export default function NovoProdutoPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = !loading && user && userIsAdmin(user);

  useEffect(() => { if (!loading && !allowed) navigate('/vendas'); }, [loading, allowed]);

  if (!allowed) return null;

  return <ProdutoForm />;
}
