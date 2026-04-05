import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '~/models';
import { isVendedor, getUserRoles } from '~/models';
import { onAuthChange, getUserData, login, logout } from '~/services/auth.service';
import { ref, onValue } from 'firebase/database';
import { auth as firebaseAuth, db } from '~/services/firebase';
import { saveAccount, getAccountCredential, hasStoredCredential } from '~/utils/accounts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  switching: boolean;
  waitForAuth: () => Promise<User | null>;
  switchAccount: (username: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, switching: false,
  waitForAuth: () => Promise.resolve(null),
  switchAccount: () => Promise.resolve(false),
  refreshUser: () => Promise.resolve(),
});

const isServer = typeof window === 'undefined';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!isServer);
  const [switching, setSwitching] = useState(false);

  const waitForAuth = () => new Promise<User | null>((resolve) => {
    const unsub = onAuthChange(async (firebaseUser) => {
      unsub();
      if (firebaseUser) {
        const userData = await getUserData(firebaseUser.uid);
        resolve(userData);
      } else {
        resolve(null);
      }
    });
  });

  const switchAccount = useCallback(async (username: string): Promise<boolean> => {
    if (!hasStoredCredential(username)) return false;
    const cred = getAccountCredential(username);
    if (!cred) return false;

    setSwitching(true);
    try {
      await logout();
      await login(username, cred);
      // O onAuthChange listener vai atualizar o user automaticamente
      // Mas precisamos esperar ele resolver pra confirmar
      const userData = await waitForAuth();
      if (userData) {
        saveAccount({ username, nome: userData.nome, foto: userData.foto, role: getUserRoles(userData)[0], roles: getUserRoles(userData), password: cred });
        localStorage.setItem('loginTime', Date.now().toString());
        setUser(userData);
      }
      setSwitching(false);
      return true;
    } catch {
      setSwitching(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (switching) return; // Não interferir durante switch
      if (firebaseUser) {
        const userData = await getUserData(firebaseUser.uid);
        if (userData) {
          const loginTime = localStorage.getItem('loginTime');
          const now = Date.now();
          const maxMs = isVendedor(userData.role) || getUserRoles(userData).some(r => isVendedor(r))
            ? 1 * 24 * 60 * 60 * 1000
            : getUserRoles(userData).some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor')
              ? 7 * 24 * 60 * 60 * 1000
              : 1 * 60 * 60 * 1000;
          if (loginTime && now - parseInt(loginTime) > maxMs) {
            await import('~/services/auth.service').then(m => m.logout());
            localStorage.removeItem('loginTime');
            setUser(null);
            setLoading(false);
            return;
          }
          if (!loginTime) localStorage.setItem('loginTime', now.toString());
          saveAccount({ username: userData.username, nome: userData.nome, foto: userData.foto, role: getUserRoles(userData)[0], roles: getUserRoles(userData) });

          // Bloquear inativo
          if (userData.status === 'inativo') {
            await import('~/services/auth.service').then(m => m.logout());
            setUser(null);
            setLoading(false);
            return;
          }

          setUser(userData);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('loginTime');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [switching]);

  const refreshUser = useCallback(async () => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) return;
    const userData = await getUserData(uid);
    if (userData) setUser(userData);
  }, []);

  // Listener realtime no nó do user para atualizar nome/foto/role
  useEffect(() => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid || !user) return;
    const unsub = onValue(ref(db, `users/${uid}`), (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      setUser(prev => prev ? { ...prev, ...data, id: uid, uid } as User : prev);
    });
    return () => unsub();
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading, switching, waitForAuth, switchAccount, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
