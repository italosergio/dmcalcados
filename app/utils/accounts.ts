import type { UserRole } from '~/models';

export interface SavedAccount {
  username: string;
  nome: string;
  foto?: string;
  role: string;
  roles?: UserRole[];
  lastLogin: number;
  _t?: string; // ofuscated credential
}

const KEY = 'dm_saved_accounts';

function encode(s: string): string { return btoa(encodeURIComponent(s)); }
function decode(s: string): string { try { return decodeURIComponent(atob(s)); } catch { return ''; } }

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveAccount(account: Omit<SavedAccount, 'lastLogin'> & { password?: string }) {
  const uname = account.username.toLowerCase();
  const accounts = getSavedAccounts();
  const existing = accounts.find(a => a.username.toLowerCase() === uname);
  const entry: SavedAccount = {
    username: uname,
    nome: account.nome,
    foto: account.foto,
    role: account.role,
    roles: account.roles,
    lastLogin: Date.now(),
    _t: account.password ? encode(account.password) : existing?._t,
  };
  const filtered = accounts.filter(a => a.username.toLowerCase() !== uname);
  filtered.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 10)));
}

export function removeAccount(username: string) {
  const uname = username.toLowerCase();
  localStorage.setItem(KEY, JSON.stringify(getSavedAccounts().filter(a => a.username.toLowerCase() !== uname)));
}

export function getAccountCredential(username: string): string | null {
  const acc = getSavedAccounts().find(a => a.username.toLowerCase() === username.toLowerCase());
  return acc?._t ? decode(acc._t) : null;
}

export function hasStoredCredential(username: string): boolean {
  const acc = getSavedAccounts().find(a => a.username.toLowerCase() === username.toLowerCase());
  return !!(acc?._t);
}
