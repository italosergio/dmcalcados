import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, db } from './firebase';
import type { User } from '~/models';

export async function login(username: string, password: string) {
  const email = `${username}@dmcalcados.local`;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  if (typeof window !== 'undefined') localStorage.setItem('loginTime', Date.now().toString());
  return userCredential.user;
}

export async function register(username: string, password: string, nome: string, role: 'admin' | 'vendedor' | 'superadmin' = 'vendedor') {
  const email = `${username}@dmcalcados.local`;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await set(ref(db, `users/${userCredential.user.uid}`), {
      username, nome, role, createdAt: new Date().toISOString()
    });
    return userCredential.user;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      // Tentar reativar: faz login com a nova senha não vai funcionar,
      // então busca no DB pelo username e reativa se estiver soft-deleted
      const snapshot = await get(ref(db, 'users'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const entry = Object.entries(data).find(([_, v]: any) => v.username === username && v.deletedAt);
        if (entry) {
          const [uid] = entry;
          await set(ref(db, `users/${uid}`), {
            username, nome, role, createdAt: new Date().toISOString()
          });
          return { uid } as any;
        }
      }
    }
    throw err;
  }
}

export async function logout() {
  await signOut(auth);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('loginTime');
  }
}

export async function getUserData(uid: string): Promise<User | null> {
  const snapshot = await get(ref(db, `users/${uid}`));
  
  if (snapshot.exists()) {
    return { 
      id: uid, 
      uid: uid, // Adiciona o Firebase UID
      ...snapshot.val() 
    } as User;
  }
  return null;
}

export async function updateProfile(uid: string, data: { nome?: string; foto?: string }) {
  const snapshot = await get(ref(db, `users/${uid}`));
  const current = snapshot.val();
  const updates: Record<string, string> = {};
  if (data.nome) updates.nome = data.nome;
  if (data.foto !== undefined) updates.foto = data.foto;
  await set(ref(db, `users/${uid}`), { ...current, ...updates });
}

export async function updatePassword(newPassword: string) {
  const { updatePassword: firebaseUpdatePassword } = await import('firebase/auth');
  if (!auth.currentUser) throw new Error('Usuário não autenticado');
  await firebaseUpdatePassword(auth.currentUser, newPassword);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
