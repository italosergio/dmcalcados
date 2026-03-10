import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createProduto } from '~/services/produtos.service';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';

export function ProdutoForm() {
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [foto, setFoto] = useState('');
  const [estoque, setEstoque] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createProduto({
        nome,
        valor: parseFloat(valor),
        foto,
        estoque: parseInt(estoque)
      });
      navigate('/produtos');
    } catch (error) {
      alert('Erro ao cadastrar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
        <Input
          label="URL da Foto"
          type="url"
          value={foto}
          onChange={(e) => setFoto(e.target.value)}
          required
        />
        <Input
          label="Estoque"
          type="number"
          value={estoque}
          onChange={(e) => setEstoque(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/produtos')}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
