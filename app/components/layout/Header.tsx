import { useAuth } from '~/contexts/AuthContext';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded p-2 hover:bg-gray-700"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-base sm:text-lg font-semibold truncate">Bem-vindo, {user?.nome}</h2>
      </div>

    </header>
  );
}
