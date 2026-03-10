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

  await update(ref(db, `users/${userId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function updateUserRole(userId: string, role: 'admin' | 'vendedor'): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await update(ref(db, `users/${userId}`), { 
    role,
    roleUpdatedAt: new Date().toISOString(),
    roleUpdatedBy: user.uid
  });
}
