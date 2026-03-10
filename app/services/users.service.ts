import { ref, get, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { User } from '~/models';

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

  // Verificar se o usuário alvo é superadmin
  const targetUserSnapshot = await get(ref(db, `users/${userId}`));
  if (targetUserSnapshot.exists() && targetUserSnapshot.val().role === 'superadmin') {
    throw new Error('Não é possível deletar um Super Admin');
  }

  await update(ref(db, `users/${userId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function updateUserRole(userId: string, role: 'admin' | 'vendedor' | 'superadmin'): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  // Verificar se o usuário alvo é superadmin
  const targetUserSnapshot = await get(ref(db, `users/${userId}`));
  if (targetUserSnapshot.exists() && targetUserSnapshot.val().role === 'superadmin') {
    throw new Error('Não é possível alterar a role de um Super Admin');
  }

  // Verificar se está tentando promover para superadmin
  if (role === 'superadmin') {
    const currentUserSnapshot = await get(ref(db, `users/${user.uid}`));
    if (!currentUserSnapshot.exists() || currentUserSnapshot.val().role !== 'superadmin') {
      throw new Error('Apenas Super Admins podem promover outros usuários a Super Admin');
    }
  }

  await update(ref(db, `users/${userId}`), { 
    role,
    roleUpdatedAt: new Date().toISOString(),
    roleUpdatedBy: user.uid
  });
}
