import { Link, useLocation } from 'react-router';
import { LayoutDashboard, ShoppingBag, Package, Users, DollarSign, UserCog, History, LogOut } from 'lucide-react';
import { logout } from '~/services/auth.service';
import { useNavigate } from 'react-router';
import { useAuth } from '~/contexts/AuthContext';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vendas', icon: ShoppingBag, label: 'Vendas' },
    { to: '/produtos', icon: Package, label: 'Produtos' },
    { to: '/despesas', icon: DollarSign, label: 'Despesas' },
  ];

  if (user?.role === 'vendedor') {
    links.push({ to: '/meus-clientes', icon: Users, label: 'Meus Clientes' });
  }

  if (user?.role === 'admin') {
    links.push({ to: '/clientes', icon: Users, label: 'Clientes' });
    links.push({ to: '/usuarios', icon: UserCog, label: 'Usuários' });
    links.push({ to: '/historico', icon: History, label: 'Histórico' });
  }

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-6">
        <h1 className="text-xl font-bold">DM Calçados</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center justify-between gap-3 rounded px-3 py-2 ${
              isActive(to)
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} />
              <span>{label}</span>
            </div>
            {(to === '/clientes' || to === '/usuarios' || to === '/historico') && (
              <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                ADMIN
              </span>
            )}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="m-3 flex items-center gap-3 rounded px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900"
      >
        <LogOut size={20} />
        <span>Sair</span>
      </button>
    </aside>
  );
}
