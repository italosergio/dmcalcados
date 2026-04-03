import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-elevated hover:bg-border-medium text-content border border-border-subtle',
    danger: 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20',
    ghost: 'bg-transparent hover:bg-surface-hover text-content-secondary',
  };

  return (
    <button
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${variants[variant]} ${className} disabled:opacity-40 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
}
