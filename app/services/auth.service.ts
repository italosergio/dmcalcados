import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, db } from './firebase';
import type { User } from '~/models';

export async function login(username: string, password: string) {
  const email = `${username}@dmcalcados.local`;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function register(username: string, password: string, nome: string, role: 'admin' | 'vendedor' = 'vendedor') {
  const email = `${username}@dmcalcados.local`;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  await set(ref(db, `users/${userCredential.user.uid}`), {
    username,
    nome,
    role,
    createdAt: new Date().toISOString()
  });
  
  return userCredential.user;
}

export async function logout() {
  await signOut(auth);
}

export async function getUserData(uid: string): Promise<User | null> {
  const snapshot = await get(ref(db, `users/${uid}`));
  
  if (snapshot.exists()) {
    return { id: uid, ...snapshot.val() } as User;
  }
  return null;
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
