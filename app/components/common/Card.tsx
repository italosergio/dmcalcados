import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-700 bg-gray-800 p-3 sm:p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
