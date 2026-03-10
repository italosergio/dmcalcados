import { Outlet, Navigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '~/contexts/AuthContext';

export default function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
