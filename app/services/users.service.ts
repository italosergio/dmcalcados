import { ref, get, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { User, UserRole, UserStatus } from '~/models';

export async function getUsers(): Promise<User[]> {
  const snapshot = await get(ref(db, 'users'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .filter(u => !u.deletedAt);
}

function getCurrentRoles(userData: any): string[] {
  return userData?.roles?.length ? userData.roles : [userData?.role];
}

function isDev(userData: any): boolean {
  return getCurrentRoles(userData).includes('desenvolvedor');
}

function isSuperAdmin(userData: any): boolean {
  return getCurrentRoles(userData).includes('superadmin');
}

function isAdminLevel(userData: any): boolean {
  const roles = getCurrentRoles(userData);
  return roles.some((r: string) => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor');
}

// Hierarquia: desenvolvedor > superadmin > admin > resto
function getHierarchyLevel(userData: any): number {
  const roles = getCurrentRoles(userData);
  if (roles.includes('desenvolvedor')) return 3;
  if (roles.includes('superadmin')) return 2;
  if (roles.includes('admin')) return 1;
  return 0;
}

async function getCurrentUser() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado');
  const snap = await get(ref(db, `users/${uid}`));
  if (!snap.exists()) throw new Error('Usuário não encontrado');
  return { uid, data: snap.val() };
}

export async function deleteUser(userId: string): Promise<void> {
  const current = await getCurrentUser();
  const targetSnap = await get(ref(db, `users/${userId}`));
  if (!targetSnap.exists()) throw new Error('Usuário não encontrado');
  const target = targetSnap.val();

  if (getHierarchyLevel(target) >= getHierarchyLevel(current.data)) {
    throw new Error('Sem permissão para remover este usuário');
  }

  await update(ref(db, `users/${userId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: current.uid,
    deletedByNome: current.data.nome,
  });
}

export async function updateUserRoles(userId: string, roles: UserRole[]): Promise<void> {
  const current = await getCurrentUser();
  const targetSnap = await get(ref(db, `users/${userId}`));
  if (!targetSnap.exists()) throw new Error('Usuário não encontrado');
  const target = targetSnap.val();

  // Só dev pode alterar roles de superadmin
  if (isSuperAdmin(target) && !isDev(current.data)) {
    throw new Error('Apenas Desenvolvedor pode alterar roles de Super Admin');
  }

  // Só dev pode alterar roles de dev
  if (isDev(target) && !isDev(current.data)) {
    throw new Error('Apenas Desenvolvedor pode alterar roles de outro Desenvolvedor');
  }

  // Só dev/superadmin podem atribuir superadmin ou desenvolvedor
  if (roles.includes('superadmin') || roles.includes('desenvolvedor')) {
    if (!isDev(current.data)) {
      throw new Error('Apenas Desenvolvedor pode atribuir esta role');
    }
  }

  const priority: UserRole[] = ['superadmin', 'desenvolvedor', 'admin', 'financeiro', 'vendedor1', 'vendedor2', 'vendedor3'];
  const primaryRole = priority.find(r => roles.includes(r)) ?? roles[0];

  await update(ref(db, `users/${userId}`), {
    role: primaryRole,
    roles,
    roleUpdatedAt: new Date().toISOString(),
    roleUpdatedBy: current.uid,
    roleUpdatedByNome: current.data.nome,
  });
}

export async function updateUserStatus(userId: string, status: UserStatus, motivo?: string): Promise<void> {
  const current = await getCurrentUser();
  const targetSnap = await get(ref(db, `users/${userId}`));
  if (!targetSnap.exists()) throw new Error('Usuário não encontrado');
  const target = targetSnap.val();

  // Não pode suspender/inativar alguém de hierarquia >= a sua
  if (getHierarchyLevel(target) >= getHierarchyLevel(current.data)) {
    throw new Error('Sem permissão para alterar status deste usuário');
  }

  const updates: Record<string, any> = {
    status,
    statusUpdatedAt: new Date().toISOString(),
    statusUpdatedBy: current.uid,
  };

  if (status === 'suspenso' && motivo) {
    updates.suspensaoMotivo = motivo;
  } else if (status !== 'suspenso') {
    updates.suspensaoMotivo = null;
  }

  await update(ref(db, `users/${userId}`), updates);
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  const current = await getCurrentUser();
  if (!isDev(current.data)) throw new Error('Apenas Desenvolvedor pode alterar senha de outros usuários');

  // Usar segunda instância do Firebase para não deslogar
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');
  const { app } = await import('./firebase');

  const targetSnap = await get(ref(db, `users/${userId}`));
  if (!targetSnap.exists()) throw new Error('Usuário não encontrado');
  const target = targetSnap.val();
  const email = `${target.username}@dmcalcados.local`;

  // Não podemos logar como o target sem saber a senha atual
  // Solução: usar Admin SDK seria ideal, mas no client-side
  // vamos salvar um flag para forçar troca de senha no próximo login
  await update(ref(db, `users/${userId}`), {
    _pendingPassword: btoa(encodeURIComponent(newPassword)),
    passwordResetAt: new Date().toISOString(),
    passwordResetBy: current.uid,
  });
}

export async function restoreUser(userId: string): Promise<void> {
  const current = await getCurrentUser();
  if (getHierarchyLevel({ id: userId }) >= getHierarchyLevel(current.data)) {
    throw new Error('Sem permissão para restaurar este usuário');
  }

  await update(ref(db, `users/${userId}`), {
    deletedAt: null,
    deletedBy: null,
    restoredAt: new Date().toISOString(),
    restoredBy: current.uid,
  });
}

// compat
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  return updateUserRoles(userId, [role]);
}
