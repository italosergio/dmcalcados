import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { login } from '~/services/auth.service';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Usuário ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <h1 className="mb-6 text-2xl font-bold">DM Calçados</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Usuário"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="text-sm text-blue-600 hover:underline"
        >
          Criar nova conta
        </button>
      </form>
    </Card>
  );
}
