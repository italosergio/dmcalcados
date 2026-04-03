import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { login } from '~/services/auth.service';
import { useAuth } from '~/contexts/AuthContext';
import { Button } from '~/components/common/Button';
import { Input } from '~/components/common/Input';
import { Card } from '~/components/common/Card';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { waitForAuth } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      await waitForAuth();
      navigate('/vendas');
    } catch (err) {
      setError('Usuário ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <div className="flex justify-center mb-6">
        <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-28 w-28 object-contain" />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Usuário"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Seu usuário"
          required
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="cta-button group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#1a1a1e] overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed">
          <span className="cta-bg absolute inset-0" />
          <span className="cta-shine absolute inset-0" />
          <span className="relative z-10">{loading ? 'Entrando...' : 'Entrar'}</span>
        </button>
      </form>
      <button
        onClick={() => navigate('/')}
        className="mt-4 w-full text-center text-sm text-content-muted hover:text-content transition-colors"
      >
        ← Voltar à página inicial
      </button>
    </Card>
  );
}
