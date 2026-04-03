import { useAuth } from '~/contexts/AuthContext';
import { Menu } from 'lucide-react';
import { HeaderTicker } from './HeaderTicker';

interface HeaderProps {
  onMenuClick: () => void;
  tickerVisible: boolean;
}

export function Header({ onMenuClick, tickerVisible }: HeaderProps) {
  const { user } = useAuth();

  return (
    <div className="border-b border-border-subtle bg-surface">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 lg:hidden">
          <img src="/logo-dmcalcados.png" alt="DM Calçados" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-tight">DM Calçados</span>
            <span className="text-[10px] text-content-muted">Painel administrativo</span>
          </div>
        </div>
        {tickerVisible && (
          <div className="hidden lg:block flex-1 min-w-0 overflow-hidden">
            <HeaderTicker />
          </div>
        )}
        <span className="hidden lg:block text-xs text-content-muted truncate ml-4">{user?.nome}</span>
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-lg p-2 hover:bg-surface-hover text-content-secondary transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </header>
      {tickerVisible && (
        <div className="lg:hidden px-2 py-1.5 border-t border-border-subtle/50">
          <HeaderTicker />
        </div>
      )}
    </div>
  );
}
