import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '~/services/firebase';
import type { Venda, Despesa, Produto, Cliente, User } from '~/models';

function useRealtimeRef<T>(path: string, transform: (data: Record<string, any>, uid: string) => T[], deps: any[] = []): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const unsub = onValue(ref(db, path), (snap) => {
      if (!snap.exists()) { setData([]); setLoading(false); return; }
      setData(transform(snap.val(), uid));
      setLoading(false);
    });

    return () => unsub();
  }, [path, ...deps]);

  return { data, loading };
}

export function useVendas() {
  const [userRoles, setUserRoles] = useState<{ isAdmin: boolean; uid: string }>({ isAdmin: false, uid: '' });
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {};
      setUsersMap(data);
      const u = data[uid];
      const roles: string[] = u?.roles?.length ? u.roles : [u?.role];
      setUserRoles({ isAdmin: roles.some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor'), uid });
    });

    return () => unsub();
  }, []);

  const { data, loading } = useRealtimeRef<Venda>('vendas', (raw, uid) => {
    const all = Object.keys(raw).map(key => {
      const v = { id: key, ...raw[key] };
      if (v.deletedBy && usersMap[v.deletedBy]) {
        v.deletedByNome = usersMap[v.deletedBy].nome || usersMap[v.deletedBy].username;
      }
      return v;
    });
    const filtered = userRoles.isAdmin ? all : all.filter((v: any) => v.vendedorId === uid);
    return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [userRoles.isAdmin, usersMap]);

  return { vendas: data, loading };
}

export function useDespesas() {
  const [userRoles, setUserRoles] = useState<{ isAdmin: boolean; uid: string }>({ isAdmin: false, uid: '' });
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {};
      setUsersMap(data);
      const u = data[uid];
      const roles: string[] = u?.roles?.length ? u.roles : [u?.role];
      setUserRoles({ isAdmin: roles.some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor'), uid });
    });

    return () => unsub();
  }, []);

  const { data, loading } = useRealtimeRef<Despesa>('despesas', (raw, uid) => {
    const all = Object.keys(raw).map(key => {
      const d = { id: key, ...raw[key] };
      if (d.deletedBy && usersMap[d.deletedBy]) {
        d.deletedByNome = usersMap[d.deletedBy].nome || usersMap[d.deletedBy].username;
      }
      return d;
    });
    const filtered = userRoles.isAdmin
      ? all
      : all.filter(d => d.usuarioId === uid || (d.rateio && d.rateio.some((r: any) => r.usuarioId === uid)));
    return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [userRoles.isAdmin, usersMap]);

  return { despesas: data, loading };
}

export function useProdutos() {
  const { data, loading } = useRealtimeRef<Produto>('produtos', (raw) => {
    return Object.keys(raw).map(key => ({ id: key, ...raw[key] }));
  });

  return { produtos: data, loading };
}

export function useClientes() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onValue(ref(db, `users/${uid}`), (snap) => {
      const u = snap.val();
      const roles: string[] = u?.roles?.length ? u.roles : [u?.role];
      setIsAdmin(roles.some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor'));
    });
    return () => unsub();
  }, []);

  const { data, loading } = useRealtimeRef<Cliente>('clientes', (raw, uid) => {
    const all = Object.keys(raw)
      .map(key => ({ id: key, ...raw[key] }))
      .filter((c: any) => !c.deletedAt);
    if (isAdmin) return all;
    return all.filter((c: any) => c.donoId === uid || (c.compartilhadoCom && c.compartilhadoCom.includes(uid)));
  }, [isAdmin]);

  return { clientes: data, loading };
}

export function useCiclos() {
  const { data, loading } = useRealtimeRef<any>('ciclos', (raw) => {
    return Object.keys(raw)
      .map(key => {
        const c = raw[key];
        const prods = c.produtos
          ? (Array.isArray(c.produtos) ? c.produtos : Object.values(c.produtos)).map((p: any) => {
              if (p.pacotesInicial != null) return p;
              const pecasI = p.quantidadeInicial || 0;
              const pecasA = p.quantidadeAtual || 0;
              return { ...p, pacotesInicial: Math.floor(pecasI / 15), pecasInicial: pecasI, pacotesAtual: Math.floor(pecasA / 15), pecasAtual: pecasA };
            })
          : [];
        return { id: key, ...c, produtos: prods };
      })
      .filter(c => c.createdAt && c.vendedorId && !c.deletedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  return { ciclos: data, loading };
}

export function useEntradas() {
  const { data, loading } = useRealtimeRef<any>('entradas', (raw) => {
    return Object.keys(raw)
      .map(key => ({ id: key, ...raw[key] }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });
  return { entradas: data, loading };
}

export function useUsers() {
  const { data, loading } = useRealtimeRef<User>('users', (raw) => {
    return Object.keys(raw)
      .map(key => ({ id: key, ...raw[key] }))
      .filter(u => !u.deletedAt);
  });

  return { users: data, loading };
}
