import { Outlet, Navigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '~/contexts/AuthContext';
import { useState } from 'react';

const isServer = typeof window === 'undefined';

export default function Layout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickerVisible, setTickerVisible] = useState(true);

  if (isServer || loading) {
    return (
      <div className="flex h-screen items-center justify-center text-content-secondary">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/home-background.png)', minHeight: '100dvh', height: '100dvh' }}>
      <div className="absolute inset-0 bg-[#1a1a1e]/85" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} tickerVisible={tickerVisible} onTickerToggle={setTickerVisible} />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} tickerVisible={tickerVisible} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
