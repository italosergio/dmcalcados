import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '~/models';
import { isVendedor, getUserRoles } from '~/models';
import { onAuthChange, getUserData } from '~/services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  waitForAuth: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, waitForAuth: () => Promise.resolve(null) });

const isServer = typeof window === 'undefined';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!isServer);

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

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUserData(firebaseUser.uid);
        if (userData) {
          const loginTime = localStorage.getItem('loginTime');
          const now = Date.now();
          const maxMs = isVendedor(userData.role) || getUserRoles(userData).some(r => isVendedor(r))
            ? 1 * 24 * 60 * 60 * 1000
            : getUserRoles(userData).some(r => r === 'admin' || r === 'superadmin')
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, waitForAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
