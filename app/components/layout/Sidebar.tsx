import { Link, useLocation } from 'react-router';
import { LayoutDashboard, ShoppingBag, Warehouse, Users, DollarSign, UserCog, History, LogOut, X, UserCircle, Home, Package, RefreshCw, Plus, ArrowRightLeft, Loader2, Activity, CreditCard, Navigation, PanelLeftClose, PanelLeftOpen, Banknote, Tag } from 'lucide-react';
import { APP_VERSION, ChangelogModal } from './ChangelogModal';
import { logout } from '~/services/auth.service';
import { useNavigate } from 'react-router';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { userIsVendedor, userIsAdmin, getUserRoles, isVendedor, userCanAccessAdmin } from '~/models';
import { RoleBadge } from '~/utils/roles';
import { getSavedAccounts, hasStoredCredential, type SavedAccount } from '~/utils/accounts';

function getPainelLabel(user: any) {
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, switching, switchAccount } = useAuth();
  const [showAccounts, setShowAccounts] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => { onClose(); setShowAccounts(false); }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSavedAccounts(getSavedAccounts());
    } else {
      document.body.style.overflow = 'unset';
      setShowAccounts(false);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await logout(true, user?.username);
    window.location.href = '/login';
  };

  const handleSwitch = async (acc: SavedAccount) => {
    setShowAccounts(false);
    if (hasStoredCredential(acc.username)) {
      const ok = await switchAccount(acc.username);
      if (ok) { onClose(); navigate('/vendas'); return; }
    }
    onClose();
    await logout();
    window.location.href = '/login';
  };

  const handleAddAccount = async () => {
    onClose();
    await logout();
    window.location.href = '/login';
  };

  const quickAdd: Record<string, string> = {
    '/vendas': '/vendas/nova',
    '/despesas': '/despesas/nova',
  };

  const links = [
    { to: '/painel', icon: Home, label: getPainelLabel(user) },
    { to: '/vendas', icon: ShoppingBag, label: 'Vendas' },
    { to: '/despesas', icon: DollarSign, label: 'Despesas' },
  ];

  if (user && userIsVendedor(user)) {
    links.push({ to: '/meu-estoque', icon: Package, label: 'Meu Estoque' });
    links.push({ to: '/meus-clientes', icon: Users, label: 'Meus Clientes' });
  }

  if (user && userIsAdmin(user)) {
    links.push({ to: '/ciclos', icon: RefreshCw, label: 'Ciclos' });
    links.push({ to: '/estoque', icon: Warehouse, label: 'Estoque' });
    links.push({ to: '/produtos', icon: Package, label: 'Produtos' });
    links.push({ to: '/clientes', icon: Users, label: 'Clientes' });
    links.push({ to: '/usuarios', icon: UserCog, label: 'Usuários' });
  }

  links.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });

  if (user && userCanAccessAdmin(user)) {
    links.push({ to: '/pagamentos', icon: CreditCard, label: 'Pagamentos' });
    links.push({ to: '/vales', icon: Banknote, label: 'Vales' });
    links.push({ to: '/rotas', icon: Navigation, label: 'Rotas' });
  }

  if (user && userIsAdmin(user)) {
    links.push({ to: '/historico', icon: History, label: 'Histórico' });
  }

  if (user && getUserRoles(user).includes('desenvolvedor')) {
    links.push({ to: '/analytics', icon: Activity, label: 'Analytics' });
  }

  const isActive = (path: string) => location.pathname.startsWith(path);
  const otherAccounts = savedAccounts.filter(a => a.username !== user?.username);
  const isDev = user ? getUserRoles(user).includes('desenvolvedor') : false;
  const sz = isDev ? { text: 'text-xs', py: 'py-1.5', icon: 16 } : { text: 'text-sm', py: 'py-2', icon: 18 };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />}

      <aside className={`fixed lg:static inset-y-0 right-0 z-50 flex w-64 flex-col border-l border-border-subtle bg-surface transition-all duration-300 lg:translate-x-0 lg:border-l-0 lg:border-r lg:left-0 lg:right-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      } ${collapsed ? 'lg:!w-16 lg:overflow-hidden' : ''}`}>

        {switching && (
          <div className="absolute inset-0 z-10 bg-surface/90 flex flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-content-muted" />
            <span className="text-xs text-content-muted">Trocando conta...</span>
          </div>
        )}

        <div className={`flex items-center justify-between px-5 py-4 lg:py-3 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <Link to="/" className={`hidden lg:flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-7 w-7 object-contain logo-glow shrink-0" />
            {!collapsed && (
              <div className="flex flex-col">
                <h1 style={{ fontFamily: '"Playfair Display", serif' }} className="text-base font-semibold leading-tight uppercase tracking-wide">DM Calçados</h1>
                {user && <div className="flex flex-wrap gap-0.5">{getUserRoles(user).map(r => <RoleBadge key={r} role={r} size="sm" />)}</div>}
              </div>
            )}
          </Link>
          <div className="flex lg:hidden items-center gap-2.5 flex-1 min-w-0">
            <Link to="/conta" className="shrink-0">
              {user?.foto ? (
                <img src={user.foto} alt={user.nome} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-elevated flex items-center justify-center text-xs font-semibold text-content-secondary">
                  {user?.nome?.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <Link to="/conta" className="flex flex-col min-w-0 gap-0.5">
              <span className="text-xs font-semibold leading-tight truncate">{shortName(user?.nome)}</span>
              <div className="flex flex-wrap gap-0.5">
                {user ? getUserRoles(user).map(r => <RoleBadge key={r} role={r} />) : null}
              </div>
            </Link>
            {otherAccounts.length > 0 ? (
              <button onClick={() => setShowAccounts(!showAccounts)}
                className="ml-auto rounded-lg p-1 text-content-muted/40 hover:text-content-muted hover:bg-surface-hover transition-colors shrink-0">
                <ArrowRightLeft size={14} />
              </button>
            ) : (
              <button onClick={handleAddAccount}
                className="ml-auto rounded-lg p-1 text-content-muted/40 hover:text-content-muted hover:bg-surface-hover transition-colors shrink-0">
                <Plus size={14} />
              </button>
            )}
          </div>
          <button onClick={onClose}
            className="lg:hidden rounded-lg p-1 hover:bg-surface-hover text-content-secondary transition-colors" aria-label="Fechar menu">
            <X size={22} />
          </button>
        </div>

        {showAccounts && (
          <div className="mx-3 mb-2 rounded-lg border border-border-subtle bg-elevated overflow-hidden lg:hidden">
            {otherAccounts.map(acc => (
              <button key={acc.username} onClick={() => handleSwitch(acc)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors text-left border-b border-border-subtle last:border-0">
                {acc.foto ? (
                  <img src={acc.foto} alt={acc.nome} className="h-6 w-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-surface flex items-center justify-center text-[10px] font-semibold text-content-secondary shrink-0">
                    {acc.nome?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate">{shortName(acc.nome)}</p>
                  <p className="text-[9px] text-content-muted">@{acc.username}</p>
                </div>
              </button>
            ))}
            <button onClick={handleAddAccount}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors text-left text-[11px] text-content-muted">
              <Plus size={12} /> Adicionar conta
            </button>
          </div>
        )}

        <nav className={`flex-1 space-y-0.5 px-3 overflow-y-auto ${collapsed ? 'lg:px-2' : ''}`}>
          {links.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 rounded-lg px-3 ${sz.py} ${sz.text} transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                isActive(to) ? 'bg-blue-600/10 text-blue-400' : 'text-content-secondary hover:bg-surface-hover hover:text-content'
              }`}
              title={collapsed ? label : undefined}>
              <div className={`flex items-center gap-3 ${collapsed ? 'lg:gap-0' : ''}`}><Icon size={sz.icon} />{!collapsed && <span>{label}</span>}{collapsed && <span className="lg:hidden">{label}</span>}</div>
              {!collapsed && quickAdd[to] && (
                <Link to={quickAdd[to]} onClick={(e) => e.stopPropagation()}
                  className="ml-auto rounded-md p-0.5 text-green-400 hover:bg-green-500/15 transition-colors"
                  title={`Nova ${label.slice(0, -1).toLowerCase()}`}>
                  <Plus size={14} />
                </Link>
              )}
            </Link>
          ))}
        </nav>

        <div className={`m-3 lg:mt-1 space-y-0.5 ${collapsed ? 'lg:mx-2' : ''}`}>
          {/* Collapse toggle - desktop only */}
          <button onClick={onToggleCollapse}
            className={`hidden lg:flex w-full items-center gap-3 rounded-lg px-3 ${sz.py} ${sz.text} text-content-secondary hover:bg-surface-hover hover:text-content transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? 'Expandir menu' : 'Minimizar menu'}>
            {collapsed ? <PanelLeftOpen size={sz.icon} /> : <><PanelLeftClose size={sz.icon} /> <span>Minimizar</span></>}
          </button>
          <Link to="/conta"
            className={`flex items-center gap-3 rounded-lg px-3 ${sz.py} ${sz.text} transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
              isActive('/conta') ? 'bg-blue-600/10 text-blue-400' : 'text-content-secondary hover:bg-surface-hover hover:text-content'
            }`}
            title={collapsed ? 'Conta' : undefined}>
            <UserCircle size={sz.icon} /> {!collapsed && <span>Conta</span>}{collapsed && <span className="lg:hidden">Conta</span>}
          </Link>
          <Link to="/"
            className={`flex items-center gap-3 rounded-lg px-3 ${sz.py} ${sz.text} text-content-secondary hover:bg-surface-hover hover:text-content transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
            title={collapsed ? 'Página Inicial' : undefined}>
            <Home size={sz.icon} /> {!collapsed && <span>Página Inicial</span>}{collapsed && <span className="lg:hidden">Página Inicial</span>}
          </Link>
          <button onClick={handleLogout}
            className={`w-full flex items-center gap-3 rounded-lg px-3 ${sz.py} ${sz.text} text-content-secondary hover:bg-red-600/10 hover:text-red-400 transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
            title={collapsed ? 'Sair' : undefined}>
            <LogOut size={sz.icon} /> {!collapsed && <span>Sair</span>}{collapsed && <span className="lg:hidden">Sair</span>}
          </button>
          {!collapsed && otherAccounts.length > 0 && (
            <button onClick={() => setShowAccounts(!showAccounts)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 ${sz.py} ${sz.text} text-content-secondary hover:bg-surface-hover hover:text-content transition-colors`}>
              <ArrowRightLeft size={sz.icon} /> <span>Trocar conta</span>
            </button>
          )}
          {!collapsed && otherAccounts.length === 0 && (
            <button onClick={handleAddAccount}
              className={`w-full flex items-center gap-3 rounded-lg px-3 ${sz.py} ${sz.text} text-content-secondary hover:bg-surface-hover hover:text-content transition-colors`}>
              <Plus size={sz.icon} /> <span>Adicionar conta</span>
            </button>
          )}
          {!collapsed && (
            <button onClick={() => setShowChangelog(true)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 ${sz.py} text-[10px] text-content-muted hover:text-blue-400 transition-colors`}>
              <Tag size={12} /> <span className="font-mono">{APP_VERSION}</span>
            </button>
          )}
          {collapsed && (
            <button onClick={() => setShowChangelog(true)}
              className="w-full flex justify-center py-1 text-[9px] font-mono text-content-muted hover:text-blue-400 transition-colors lg:block hidden"
              title={APP_VERSION}>
              <Tag size={10} />
            </button>
          )}
        </div>
      </aside>
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </>
  );
}
