import { useEffect, useRef, useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { Bell, Menu, UserCircle, LogOut, Plus, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { HeaderTicker } from './HeaderTicker';
import { getUserRoles, isVendedor, userIsAdmin } from '~/models';
import { logout } from '~/services/auth.service';
import { getSavedAccounts, hasStoredCredential, type SavedAccount } from '~/utils/accounts';
import { RoleBadge } from '~/utils/roles';
import { db } from '~/services/firebase';
import { onValue, ref, type Unsubscribe } from 'firebase/database';
import { getNotificationsReadAt, subscribeNotificationsReadAt } from '~/utils/notifications';

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
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({ onMenuClick, sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { user, switching, switchAccount } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [latestNotificationAt, setLatestNotificationAt] = useState(0);
  const [notificationsReadAt, setNotificationsReadAt] = useState(getNotificationsReadAt);
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

  useEffect(() => subscribeNotificationsReadAt(setNotificationsReadAt), []);

  useEffect(() => {
    if (!user || !userIsAdmin(user)) {
      setLatestNotificationAt(0);
      return;
    }

    const paths = ['vendas', 'despesas', 'produtos', 'users', 'clientes'];
    const latestByPath: Record<string, number> = {};
    const getTime = (value?: string) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };
    const getLatestFromData = (data: any) => {
      if (!data) return 0;
      return Object.values(data).reduce((max: number, item: any) => {
        const itemMax = Math.max(
          getTime(item?.createdAt),
          getTime(item?.deletedAt),
          getTime(item?.roleUpdatedAt)
        );
        return Math.max(max, itemMax);
      }, 0);
    };
    const updateLatest = () => setLatestNotificationAt(Math.max(0, ...Object.values(latestByPath)));

    const unsubscribers: Unsubscribe[] = paths.map(path => onValue(ref(db, path), snap => {
      latestByPath[path] = snap.exists() ? getLatestFromData(snap.val()) : 0;
      updateLatest();
    }));

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user]);

  const handleLogout = async () => {
    setShowMenu(false);
    await logout(true, user?.username);
    window.location.href = '/login';
  };

  const handleSwitch = async (acc: SavedAccount) => {
    setShowMenu(false);
    if (hasStoredCredential(acc.username)) {
      const ok = await switchAccount(acc.username);
      if (ok) { navigate('/painel'); return; }
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
  const hasNewNotifications = latestNotificationAt > notificationsReadAt;

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
        <div className="hidden lg:flex items-center gap-2 min-w-[40px]">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="rounded-xl p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content"
              title={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
              aria-label={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
        </div>
        <div className="hidden lg:block flex-1 min-w-0 overflow-hidden">
          <HeaderTicker />
        </div>

        <div className="hidden lg:flex items-center gap-2 relative ml-4" ref={menuRef}>
          {user && userIsAdmin(user) && (
            <Link
              to="/historico"
              className="relative rounded-xl p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content"
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell size={18} />
              {hasNewNotifications && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-cyan-300 ring-2 ring-surface" />}
            </Link>
          )}
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
          {user && userIsAdmin(user) && (
            <Link
              to="/historico"
              className="relative rounded-lg p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content"
              aria-label="Notificações"
            >
              <Bell size={20} />
              {hasNewNotifications && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-cyan-300 ring-2 ring-surface" />}
            </Link>
          )}
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
