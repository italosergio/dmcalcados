import { Outlet, Navigate, useLocation } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '~/contexts/AuthContext';
import { logout } from '~/services/auth.service';
import { useState, useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { userIsAdmin, userCanAccessAdmin, getUserRoles } from '~/models';

const isServer = typeof window === 'undefined';

function LoadingScreen() {
  return (
    <div className="flex relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/home-background.png)', minHeight: '100dvh', height: '100dvh' }}>
      <div className="absolute inset-0 bg-[#1a1a1e]/85" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative">
          <img
            src="/logo-dmcalcados.png"
            alt="DM Calçados"
            className="h-20 w-20 object-contain animate-pulse"
          />
          <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-gold/30" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, loading, switching } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const toggleSidebarCollapsed = () => setSidebarCollapsed(v => {
    const n = !v;
    localStorage.setItem('sidebar_collapsed', String(n));
    return n;
  });
  const location = useLocation();
  const prevPath = useRef<string>();

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;
    const LABELS: Record<string, string> = {
      '/vendas': 'Vendas', '/vendas/nova': 'Nova Venda',
      '/painel': 'Painel',
      '/despesas': 'Despesas', '/despesas/nova': 'Nova Despesa',
      '/produtos': 'Produtos', '/produtos/novo': 'Novo Produto',
      '/estoque': 'Estoque', '/clientes': 'Clientes', '/clientes/novo': 'Novo Cliente',
      '/meus-clientes': 'Meus Clientes', '/meu-estoque': 'Meu Estoque',
      '/dashboard': 'Dashboard', '/usuarios': 'Usuários', '/historico': 'Notificações',
      '/ciclos': 'Ciclos', '/conta': 'Conta',
    };
    const label = LABELS[location.pathname] || location.pathname;
    const ADMIN_ROUTES = ['/produtos', '/estoque', '/clientes', '/usuarios', '/historico', '/ciclos'];
    const ADMIN_ACCESS_ROUTES = ['/ciclos']; // Rotas que permitem financeiro/desenvolvedor via userCanAccessAdmin
    const isAdminRoute = ADMIN_ROUTES.some(r => location.pathname.startsWith(r));
    const isAdminAccessRoute = ADMIN_ACCESS_ROUTES.some(r => location.pathname.startsWith(r));
    const shouldFlagSuspicious = isAdminRoute && !userIsAdmin(user) && !(isAdminAccessRoute && userCanAccessAdmin(user));
    // Analytics removido - página substituída por notificações
  }, [location.pathname, user]);

  if (isServer || loading || switching) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'suspenso') {
    return (
      <div className="flex relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/home-background.png)', minHeight: '100dvh', height: '100dvh' }}>
        <div className="absolute inset-0 bg-[#1a1a1e]/90" />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-surface p-8 text-center space-y-4">
            <ShieldAlert size={48} className="mx-auto text-red-400" />
            <h1 className="text-xl font-bold text-red-400">Conta Suspensa</h1>
            <p className="text-sm text-content-secondary leading-relaxed">
              {user.suspensaoMotivo || 'Sua conta foi temporariamente suspensa por uso inadequado da plataforma. Um administrador entrará em contato com mais instruções sobre como restabelecer seu acesso.'}
            </p>
            <button onClick={async () => { await logout(); window.location.href = '/login'; }}
              className="w-full rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary hover:bg-border-medium transition">
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'} className="flex relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/home-background.png)', minHeight: '100dvh', height: '100dvh' }}>
      <div className="absolute inset-0 bg-[#1a1a1e]/75" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebarCollapsed} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
