import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      {children}
    </div>
  );
}
