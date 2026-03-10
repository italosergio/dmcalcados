import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createCliente } from '~/services/clientes.service';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';

export function ClienteForm() {
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createCliente({ nome, endereco });
      navigate('/clientes');
    } catch (error) {
      alert('Erro ao cadastrar cliente');
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
          label="Endereço"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/clientes')}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
