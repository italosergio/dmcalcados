import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { ref, get, set, update, query, orderByChild, equalTo } from 'firebase/database';
import { auth, app, db } from './firebase';
import type { User, UserRole } from '~/models';

export async function login(username: string, password: string) {
  const email = `${username.toLowerCase()}@dmcalcados.local`;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  if (typeof window !== 'undefined') localStorage.setItem('loginTime', Date.now().toString());
  return userCredential.user;
}

export async function register(username: string, password: string, nome: string, role: UserRole = 'vendedor1') {
  const email = `${username}@dmcalcados.local`;
  try {
    // Usar uma segunda instância de Auth para não deslogar o admin
    const { initializeApp, deleteApp } = await import('firebase/app');
    const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
    const tempApp = initializeApp(app.options, '_temp_register_');
    const tempAuth = getAuth(tempApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      await set(ref(db, `users/${userCredential.user.uid}`), {
        username, nome, role, createdAt: new Date().toISOString()
      });
      await tempAuth.signOut();
      await deleteApp(tempApp);
      return userCredential.user;
    } catch (innerErr) {
      await deleteApp(tempApp).catch(() => {});
      throw innerErr;
    }
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
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

export async function logout(removeFromSaved = false, username?: string) {
  await signOut(auth);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('loginTime');
    if (removeFromSaved && username) {
      try {
        const KEY = 'dm_saved_accounts';
        const accounts = JSON.parse(localStorage.getItem(KEY) || '[]');
        const filtered = accounts.filter((a: any) => a.username.toLowerCase() !== username.toLowerCase());
        localStorage.setItem(KEY, JSON.stringify(filtered));
      } catch {}
    }
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

export async function updateProfile(uid: string, data: { nome?: string; foto?: string; contato?: string }) {
  const snapshot = await get(ref(db, `users/${uid}`));
  const current = snapshot.val();
  const updates: Record<string, any> = {};
  if (data.nome) updates.nome = data.nome;
  if (data.foto !== undefined) updates.foto = data.foto;
  if (data.contato !== undefined) updates.contato = data.contato;
  await set(ref(db, `users/${uid}`), { ...current, ...updates });

  if (data.nome) {
    const vendasSnap = await get(query(ref(db, 'vendas'), orderByChild('vendedorId'), equalTo(uid)));
    if (vendasSnap.exists()) {
      const batch: Record<string, string> = {};
      Object.keys(vendasSnap.val()).forEach(key => { batch[`vendas/${key}/vendedorNome`] = data.nome!; });
      await update(ref(db), batch);
    }
  }
}

export async function updatePassword(newPassword: string) {
  const { updatePassword: firebaseUpdatePassword } = await import('firebase/auth');
  if (!auth.currentUser) throw new Error('Usuário não autenticado');
  await firebaseUpdatePassword(auth.currentUser, newPassword);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
