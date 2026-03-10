import { ThemeToggle } from '~/components/common/ThemeToggle';
import { useAuth } from '~/contexts/AuthContext';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-lg font-semibold">Bem-vindo, {user?.nome}</h2>
      <ThemeToggle />
    </header>
  );
}
