import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { login } from '~/services/auth.service';
import { useAuth } from '~/contexts/AuthContext';
import { Card } from '~/components/common/Card';
import { Input } from '~/components/common/Input';
import { X, Loader2 } from 'lucide-react';
import { getSavedAccounts, saveAccount, removeAccount, getAccountCredential, hasStoredCredential, type SavedAccount } from '~/utils/accounts';
import { getUserRoles } from '~/models';
import { ROLE_LABELS } from '~/utils/roles';

function shortName(nome: string) {
  const parts = nome.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[] | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const navigate = useNavigate();
  const { waitForAuth } = useAuth();

  useEffect(() => { setAccounts(getSavedAccounts()); }, []);

  const doLogin = async (user: string, pass: string, silent = false) => {
    if (!silent) { setError(''); setLoading(true); }
    try {
      await login(user, pass);
      const userData = await waitForAuth();
      if (userData) {
        saveAccount({ username: user, nome: userData.nome, foto: userData.foto, role: getUserRoles(userData)[0], roles: getUserRoles(userData), password: pass });
      }
      navigate('/painel');
    } catch {
      if (silent) {
        // Credencial expirou, pede senha
        setSwitchingTo(null);
        setSelectedAccount(user);
        setUsername(user);
        setPassword('');
        setError('Sessão expirada, digite a senha');
      } else {
        setError('Usuário ou senha inválidos');
      }
    } finally { if (!silent) setLoading(false); }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doLogin(username, password);
  };

  const handleAccountClick = (acc: SavedAccount) => {
    // Se tem credencial salva, faz login direto
    if (hasStoredCredential(acc.username)) {
      setSwitchingTo(acc.username);
      const cred = getAccountCredential(acc.username);
      if (cred) {
        doLogin(acc.username, cred, true);
        return;
      }
    }
    // Senão pede senha
    setSelectedAccount(acc.username);
    setUsername(acc.username);
    setPassword('');
    setError('');
  };

  const handleRemoveAccount = (uname: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeAccount(uname);
    setAccounts(getSavedAccounts());
    if (selectedAccount === uname) { setSelectedAccount(null); setUsername(''); }
  };

  const handleBack = () => {
    setSelectedAccount(null); setUsername(''); setPassword(''); setError('');
  };

  if (accounts === null) {
    return (
      <Card className="w-full min-w-72 max-w-sm">
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-content-muted" />
        </div>
      </Card>
    );
  }

  // Switching loading
  if (switchingTo) {
    const acc = accounts.find(a => a.username === switchingTo);
    return (
      <Card className="w-full min-w-72 max-w-sm">
        <div className="flex flex-col items-center gap-4 py-8">
          {acc?.foto ? (
            <img src={acc.foto} alt={acc.nome} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-elevated flex items-center justify-center text-xl font-semibold text-content-secondary">
              {acc?.nome?.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="text-sm font-medium">{acc ? shortName(acc.nome) : switchingTo}</p>
          <Loader2 size={20} className="animate-spin text-content-muted" />
          <p className="text-xs text-content-muted">Entrando...</p>
        </div>
      </Card>
    );
  }

  // Lista de contas salvas
  if (accounts!.length > 0 && !selectedAccount) {
    return (
      <Card className="w-full min-w-72 max-w-sm">
        <div className="flex justify-center mb-4">
          <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-20 w-20 object-contain" />
        </div>
        <p className="text-xs text-content-muted text-center mb-3">Escolha uma conta</p>
        <div className="space-y-1.5">
          {accounts.map(acc => (
            <button key={acc.username} onClick={() => handleAccountClick(acc)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-elevated transition-colors text-left group">
              {acc.foto ? (
                <img src={acc.foto} alt={acc.nome} className="h-9 w-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-elevated flex items-center justify-center text-sm font-semibold text-content-secondary shrink-0">
                  {acc.nome?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{shortName(acc.nome)}</p>
                <p className="text-[10px] text-content-muted">@{acc.username} · {ROLE_LABELS[acc.role] || acc.role}</p>
              </div>
              <button onClick={(e) => handleRemoveAccount(acc.username, e)}
                className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-content-muted hover:text-red-400 hover:bg-red-500/10 transition">
                <X size={14} />
              </button>
            </button>
          ))}
        </div>
        <button onClick={() => { setSelectedAccount('__new__'); setUsername(''); }}
          className="mt-3 w-full rounded-lg border border-dashed border-border-subtle py-2.5 text-xs text-content-muted hover:text-content hover:border-border-medium transition-colors">
          + Adicionar outra conta
        </button>
        <button onClick={() => navigate('/')}
          className="mt-3 w-full text-center text-sm text-content-muted hover:text-content transition-colors">
          ← Voltar à página inicial
        </button>
      </Card>
    );
  }

  // Form de login
  const acc = selectedAccount && selectedAccount !== '__new__'
    ? accounts.find(a => a.username === selectedAccount) : null;

  return (
    <Card className="w-full max-w-sm">
      <div className="flex justify-center mb-6">
        <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-28 w-28 object-contain" />
      </div>
      {acc && (
        <div className="flex items-center gap-3 mb-4 rounded-lg bg-elevated p-3">
          {acc.foto ? (
            <img src={acc.foto} alt={acc.nome} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-surface flex items-center justify-center text-sm font-semibold text-content-secondary">
              {acc.nome?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{shortName(acc.nome)}</p>
            <p className="text-[10px] text-content-muted">@{acc.username}</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!acc && (
          <Input label="Usuário" type="text" value={username}
            onChange={(e) => setUsername(e.target.value)} placeholder="Seu usuário" required />
        )}
        <Input label="Senha" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required autoFocus={!!acc} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="cta-button group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#1a1a1e] overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed">
          <span className="cta-bg absolute inset-0" />
          <span className="cta-shine absolute inset-0" />
          <span className="relative z-10">{loading ? 'Entrando...' : 'Entrar'}</span>
        </button>
      </form>
      {accounts.length > 0 && (
        <button onClick={handleBack}
          className="mt-4 w-full text-center text-sm text-content-muted hover:text-content transition-colors">
          ← Voltar às contas
        </button>
      )}
      {accounts.length === 0 && (
        <button onClick={() => navigate('/')}
          className="mt-4 w-full text-center text-sm text-content-muted hover:text-content transition-colors">
          ← Voltar à página inicial
        </button>
      )}
    </Card>
  );
}
