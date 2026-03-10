import { Moon, Sun } from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="rounded p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
