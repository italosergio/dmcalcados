import { Link, useLocation } from 'react-router';
import { LayoutDashboard, ShoppingBag, Warehouse, Users, DollarSign, UserCog, History, LogOut, X, UserCircle, Home } from 'lucide-react';
import { logout } from '~/services/auth.service';
import { useNavigate } from 'react-router';
import { useAuth } from '~/contexts/AuthContext';
import { useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tickerVisible: boolean;
  onTickerToggle: (v: boolean) => void;
}

export function Sidebar({ isOpen, onClose, tickerVisible, onTickerToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await logout();
    window.location.href = '/';
  };

  const links = [
    { to: '/vendas', icon: ShoppingBag, label: 'Vendas' },
    { to: '/despesas', icon: DollarSign, label: 'Despesas' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  if (user?.role === 'vendedor') {
    links.push({ to: '/meus-clientes', icon: Users, label: 'Meus Clientes' });
  }

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    links.splice(2, 0, { to: '/produtos', icon: Warehouse, label: 'Estoque' });
    links.push({ to: '/clientes', icon: Users, label: 'Clientes' });
    links.push({ to: '/usuarios', icon: UserCog, label: 'Usuários' });
    links.push({ to: '/historico', icon: History, label: 'Histórico' });
  }

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 right-0 z-50 flex h-screen w-64 flex-col border-l border-border-subtle bg-surface transition-transform duration-300 lg:translate-x-0 lg:border-l-0 lg:border-r lg:left-0 lg:right-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">DM Calçados</h1>
            <span className="text-xs text-content-muted">Painel administrativo</span>
          </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-1 hover:bg-surface-hover text-content-secondary transition-colors"
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive(to)
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'text-content-secondary hover:bg-surface-hover hover:text-content'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />
                <span>{label}</span>
              </div>
              {(to === '/produtos' || to === '/clientes' || to === '/usuarios' || to === '/historico') && (
                <span className="rounded-md bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                  ADMIN
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mx-3 mb-2 px-3">
          <label className="flex items-center justify-between gap-2 text-xs text-content-secondary cursor-pointer group">
            <span className="group-hover:text-content transition-colors">Loop de estatísticas</span>
            <button
              type="button"
              role="switch"
              aria-checked={tickerVisible}
              onClick={() => onTickerToggle(!tickerVisible)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                tickerVisible ? 'bg-blue-500' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  tickerVisible ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </label>
        </div>
        <div className="m-3 space-y-1">
          <Link
            to="/conta"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive('/conta')
                ? 'bg-blue-600/10 text-blue-400'
                : 'text-content-secondary hover:bg-surface-hover hover:text-content'
            }`}
          >
            <UserCircle size={18} />
            <span>Conta</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-content-secondary hover:bg-surface-hover hover:text-content transition-colors"
          >
            <Home size={18} />
            <span>Página Inicial</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-content-secondary hover:bg-red-600/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
