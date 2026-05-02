import type { UserRole } from '~/models';

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  superadmin: 'Super Admin',
  vendedor1: 'Vendedor I',
  vendedor2: 'Vendedor II',
  vendedor3: 'Vendedor III',
  financeiro: 'Financeiro',
  desenvolvedor: 'Desenvolvedor',
};

export const ROLE_COLORS: Record<string, string> = {
  vendedor1: 'bg-green-900/60 text-green-300',
  vendedor2: 'bg-green-800/60 text-green-400 drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]',
  vendedor3: 'bg-green-800/60 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]',
  admin: 'bg-red-900/60 text-red-300',
  financeiro: 'bg-yellow-900/60 text-yellow-300',
  desenvolvedor: 'bg-blue-900/60 text-blue-300',
  superadmin: 'bg-purple-900/80 text-purple-200',
};

export function RoleBadge({ role, size = 'md' }: { role: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm'
    ? 'inline-flex items-center rounded px-1 py-px text-[8px] font-semibold'
    : 'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold';
  return (
    <span className={`${cls} ${ROLE_COLORS[role] ?? 'bg-green-900/60 text-green-300'}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}
