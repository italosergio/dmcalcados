import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <input
        className={`rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 ${className}`}
        {...props}
      />
    </div>
  );
}
