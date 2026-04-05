import { useEffect, useRef, useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { Menu, UserCircle, LogOut, Plus, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { HeaderTicker } from './HeaderTicker';
import { getUserRoles, isVendedor } from '~/models';
import { logout } from '~/services/auth.service';
import { getSavedAccounts, hasStoredCredential, type SavedAccount } from '~/utils/accounts';
import { RoleBadge } from '~/utils/roles';

function getPainelLabel(user: ReturnType<typeof useAuth>['user']) {
  if (!user) return 'Painel';
  const roles = getUserRoles(user);
  if (roles.includes('financeiro')) return 'Painel financeiro';
  if (roles.some(r => isVendedor(r)) && !roles.some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor')) return 'Painel vendedor';
  return 'Painel administrativo';
}

function shortName(nome?: string) {
  if (!nome) return '';
  const parts = nome.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, switching, switchAccount } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showMenu) setAccounts(getSavedAccounts());
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleLogout = async () => {
    setShowMenu(false);
    await logout(true, user?.username);
    window.location.href = '/login';
  };

  const handleSwitch = async (acc: SavedAccount) => {
    setShowMenu(false);
    if (hasStoredCredential(acc.username)) {
      const ok = await switchAccount(acc.username);
      if (ok) { navigate('/vendas'); return; }
    }
    // Fallback: credencial expirada
    await logout();
    window.location.href = '/login';
  };

  const handleAddAccount = async () => {
    setShowMenu(false);
    await logout();
    window.location.href = '/login';
  };

  const otherAccounts = accounts.filter(a => a.username !== user?.username);

  if (switching) {
    return (
      <div className="border-b border-border-subtle bg-surface">
        <header className="flex items-center justify-center px-4 py-3 gap-2">
          <Loader2 size={14} className="animate-spin text-content-muted" />
          <span className="text-xs text-content-muted">Trocando conta...</span>
        </header>
      </div>
    );
  }

  return (
    <div className="border-b border-border-subtle bg-surface">
      <header className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3 lg:hidden">
          <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-8 w-8 object-contain logo-glow" />
          <div className="flex flex-col">
            <span style={{ fontFamily: '"Playfair Display", serif' }} className="text-base font-semibold leading-tight uppercase tracking-wide">DM Calçados</span>
            {user && <div className="flex flex-wrap gap-0.5">{getUserRoles(user).map(r => <RoleBadge key={r} role={r} size="sm" />)}</div>}
          </div>
        </Link>
        <div className="hidden lg:block flex-1 min-w-0 overflow-hidden">
          <HeaderTicker />
        </div>

        <div className="hidden lg:block relative ml-4" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {user?.foto ? (
              <img src={user.foto} alt={user.nome} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-elevated flex items-center justify-center text-xs font-semibold text-content-secondary">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-xs truncate max-w-[120px]">{shortName(user?.nome)}</span>
              {user && <div className="flex flex-wrap gap-0.5">{getUserRoles(user).map(r => <RoleBadge key={r} role={r} size="sm" />)}</div>}
            </div>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border-subtle bg-surface shadow-xl z-50 overflow-hidden">
              {otherAccounts.length > 0 && (
                <div className="border-b border-border-subtle">
                  {otherAccounts.map(acc => (
                    <button key={acc.username} onClick={() => handleSwitch(acc)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-elevated transition-colors text-left">
                      {acc.foto ? (
                        <img src={acc.foto} alt={acc.nome} className="h-6 w-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-elevated flex items-center justify-center text-[10px] font-semibold text-content-secondary shrink-0">
                          {acc.nome?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{shortName(acc.nome)}</p>
                        {acc.roles && <div className="flex flex-wrap gap-0.5">{acc.roles.map(r => <RoleBadge key={r} role={r} size="sm" />)}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={handleAddAccount}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-elevated transition-colors text-left text-xs text-content-muted border-b border-border-subtle">
                <Plus size={14} /> Adicionar conta
              </button>

              <Link to="/conta" onClick={() => setShowMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-elevated transition-colors text-sm text-content-secondary border-b border-border-subtle">
                <UserCircle size={16} /> Minha conta
              </Link>

              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-red-600/10 transition-colors text-left text-sm text-red-400">
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <Link to="/conta">
            {user?.foto ? (
              <img src={user.foto} alt={user.nome} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-elevated flex items-center justify-center text-[10px] font-semibold text-content-secondary">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <button onClick={onMenuClick}
            className="rounded-lg p-2 hover:bg-surface-hover text-content-secondary transition-colors"
            aria-label="Abrir menu">
            <Menu size={24} />
          </button>
        </div>
      </header>
      <div className="lg:hidden px-2 py-1.5 border-t border-border-subtle/50">
        <HeaderTicker />
      </div>
    </div>
  );
}
