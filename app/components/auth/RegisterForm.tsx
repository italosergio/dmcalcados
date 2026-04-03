import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { register } from '~/services/auth.service';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';

export function RegisterForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(username, password, nome);
      window.location.href = '/login';
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Usuário já existe');
      } else {
        setError('Erro ao criar usuário');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-10 w-10 object-contain" />
        <h1 className="text-xl font-semibold">Criar Conta</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome Completo"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
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
          minLength={6}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Conta'}
        </Button>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-sm text-content-secondary hover:text-content transition-colors"
        >
          Já tem conta? Entrar
        </button>
      </form>
    </Card>
  );
}
