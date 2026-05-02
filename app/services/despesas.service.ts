import { ref, push, get, set, update, remove } from 'firebase/database';
import { db, auth } from './firebase';
import type { Despesa } from '~/models';

export async function getDespesas(): Promise<Despesa[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const userData = await get(ref(db, `users/${user.uid}`));
  const uData = userData.val();
  const roles: string[] = uData?.roles?.length ? uData.roles : [uData?.role];
  const isAdmin = roles.some(r => r === 'admin' || r === 'superadmin' || r === 'desenvolvedor');

  const [snapshot, usersSnap] = await Promise.all([
    get(ref(db, 'despesas')),
    get(ref(db, 'users')),
  ]);
  if (!snapshot.exists()) return [];

  const usersData = usersSnap.val() || {};
  const data = snapshot.val();
  const allDespesas = Object.keys(data).map(key => {
    const d = { id: key, ...data[key] };
    if (d.deletedBy && usersData[d.deletedBy]) {
      d.deletedByNome = usersData[d.deletedBy].nome || usersData[d.deletedBy].username;
    }
    return d;
  });

  const filtered = isAdmin
    ? allDespesas
    : allDespesas.filter(d =>
        d.usuarioId === user.uid ||
        (d.rateio && d.rateio.some((r: any) => r.usuarioId === user.uid))
      );
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteDespesa(despesaId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const userData = await get(ref(db, `users/${user.uid}`));
  const nome = userData.val()?.nome || '';

  await update(ref(db, `despesas/${despesaId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid,
    deletedByNome: nome,
  });
}

export async function restoreDespesa(despesaId: string): Promise<void> {
  const user = auth.currentUser;
  const userData = await get(ref(db, `users/${user!.uid}`));
  const nome = userData.val()?.nome || '';
  await update(ref(db, `despesas/${despesaId}`), {
    deletedAt: null,
    deletedBy: null,
    restoredAt: new Date().toISOString(),
    restoredBy: user!.uid,
    restoredByNome: nome,
  });
}

export async function updateDespesa(despesaId: string, data: any): Promise<void> {
  const user = auth.currentUser;
  const userData = await get(ref(db, `users/${user!.uid}`));
  const nome = userData.val()?.nome || '';
  const payload = { ...data };
  if (payload.data instanceof Date) payload.data = payload.data.toISOString();
  payload.updatedAt = new Date().toISOString();
  payload.updatedBy = user!.uid;
  payload.updatedByNome = nome;
  await update(ref(db, `despesas/${despesaId}`), payload);
}

export async function getTiposDespesa(): Promise<{ key: string; nome: string; icone?: string }[]> {
  const snapshot = await get(ref(db, 'despesas-tipos'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data).map(([key, val]) => {
    if (typeof val === 'string') return { key, nome: val };
    const v = val as { nome: string; icone?: string };
    return { key, nome: v.nome, icone: v.icone };
  });
}

export async function addTipoDespesa(tipo: string, icone?: string): Promise<void> {
  const existentes = await getTiposDespesa();
  if (existentes.some(t => t.nome === tipo)) return;
  await push(ref(db, 'despesas-tipos'), icone ? { nome: tipo, icone } : tipo);
}

export async function updateTipoDespesa(key: string, novoNome: string, icone?: string): Promise<void> {
  await set(ref(db, `despesas-tipos/${key}`), icone ? { nome: novoNome, icone } : novoNome);
}

export async function deleteTipoDespesa(key: string): Promise<void> {
  await remove(ref(db, `despesas-tipos/${key}`));
}

export async function createDespesa(data: Omit<Despesa, 'id' | 'createdAt'>): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    
    const despesaData: Record<string, any> = {
      tipo: data.tipo,
      valor: data.valor,
      data: data.data instanceof Date
        ? `${data.data.getFullYear()}-${String(data.data.getMonth() + 1).padStart(2, '0')}-${String(data.data.getDate()).padStart(2, '0')}T12:00:00.000Z`
        : data.data,
      usuarioId: data.usuarioId,
      usuarioNome: data.usuarioNome,
      createdAt: new Date().toISOString()
    };

    if (data.imagemUrl) despesaData.imagemUrl = data.imagemUrl;
    if (data.imagensUrls && data.imagensUrls.length > 0) despesaData.imagensUrls = data.imagensUrls;
    if (data.semImagemJustificativa) despesaData.semImagemJustificativa = data.semImagemJustificativa;
    if (data.descricao) despesaData.descricao = data.descricao;
    if (data.rateio && data.rateio.length > 0) despesaData.rateio = data.rateio;
    if ((data as any).fontePagamento) despesaData.fontePagamento = (data as any).fontePagamento;
    if ((data as any).cicloId) despesaData.cicloId = (data as any).cicloId;
    if ((data as any).valorInterno != null) despesaData.valorInterno = (data as any).valorInterno;
    if ((data as any).valorExterno != null) despesaData.valorExterno = (data as any).valorExterno;

    const newRef = push(ref(db, 'despesas'));
    await set(newRef, despesaData);
    return newRef.key!;
  } catch (error) {
    throw error;
  }
}
