import { ref, get, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { User, UserRole } from '~/models';
import { isVendedor } from '~/models';

export async function getUsers(): Promise<User[]> {
  const snapshot = await get(ref(db, 'users'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .filter(u => !u.deletedAt);
}

export async function deleteUser(userId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  const targetUserSnapshot = await get(ref(db, `users/${userId}`));
  if (targetUserSnapshot.exists() && targetUserSnapshot.val().role === 'superadmin') {
    throw new Error('Não é possível deletar um Super Admin');
  }
  await update(ref(db, `users/${userId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function updateUserRoles(userId: string, roles: UserRole[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const targetSnap = await get(ref(db, `users/${userId}`));
  if (targetSnap.exists() && targetSnap.val().role === 'superadmin') {
    throw new Error('Não é possível alterar a role de um Super Admin');
  }

  if (roles.includes('superadmin') || roles.includes('desenvolvedor')) {
    const currentUserSnap = await get(ref(db, `users/${user.uid}`));
    if (!currentUserSnap.exists() || currentUserSnap.val().role !== 'superadmin') {
      throw new Error('Apenas Super Admins podem atribuir esta role');
    }
  }

  // role principal = primeira da lista (ou a mais privilegiada)
  const priority: UserRole[] = ['superadmin', 'desenvolvedor', 'admin', 'financeiro', 'vendedor1', 'vendedor2', 'vendedor3', 'vendedor'];
  const primaryRole = priority.find(r => roles.includes(r)) ?? roles[0];

  await update(ref(db, `users/${userId}`), {
    role: primaryRole,
    roles,
    roleUpdatedAt: new Date().toISOString(),
    roleUpdatedBy: user.uid
  });
}

// compat
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  return updateUserRoles(userId, [role]);
}
