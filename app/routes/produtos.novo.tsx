import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ProdutoForm } from '~/components/produtos/ProdutoForm';
import { useAuth } from '~/contexts/AuthContext';

export default function NovoProdutoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'vendedor') navigate('/vendas');
  }, [user]);

  return <ProdutoForm />;
}
