import { ref, get, update } from 'firebase/database';
import { db } from './firebase';
import type { User } from '~/models';

export async function getUsers(): Promise<User[]> {
  const snapshot = await get(ref(db, 'users'));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function updateUserRole(userId: string, role: 'admin' | 'vendedor'): Promise<void> {
  await update(ref(db, `users/${userId}`), { role });
}
