import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs sm:text-sm font-medium text-content-secondary">{label}</label>}
      <input
        className={`rounded-lg border border-border-subtle bg-elevated px-3.5 py-2.5 text-sm text-content placeholder:text-content-muted focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
