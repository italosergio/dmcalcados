import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div className={`rounded-xl border border-border-subtle bg-surface p-4 sm:p-5 ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
