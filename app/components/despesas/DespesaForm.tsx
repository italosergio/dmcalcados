import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createDespesa } from '~/services/despesas.service';
import { useAuth } from '~/contexts/AuthContext';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';

export function DespesaForm() {
  const [tipo, setTipo] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await createDespesa({
        tipo,
        valor: parseFloat(valor),
        data: new Date(data),
        usuarioNome: user.nome
      });
      navigate('/despesas');
    } catch (error) {
      alert('Erro ao cadastrar despesa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          placeholder="Ex: Aluguel, Fornecedor, Marketing"
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
          label="Data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/despesas')}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
