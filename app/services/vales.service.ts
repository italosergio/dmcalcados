import { ref, push, get, update, set } from 'firebase/database';
import { db, auth } from './firebase';
import type { ValeCard, ValeRegistro } from '~/models';

export async function getValeCards(): Promise<ValeCard[]> {
  const snap = await get(ref(db, 'vales'));
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.keys(data).map(key => {
    const v = data[key];
    const registros = v.registros || {};
    const total = Object.values(registros).reduce((s: number, r: any) => s + (r.valor || 0), 0);
    return { id: key, ...v, registros, total };
  });
}

export async function createValeCard(funcionarioId: string, funcionarioNome: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');
  const cardRef = push(ref(db, 'vales'));
  await set(cardRef, {
    funcionarioId, funcionarioNome,
    quitado: false,
    createdAt: new Date().toISOString(),
  });
  return cardRef.key!;
}

export async function addValeRegistro(cardId: string, registro: Omit<ValeRegistro, 'createdAt'>): Promise<void> {
  const user = auth.currentUser;
  const userData = await get(ref(db, `users/${user!.uid}`));
  const nome = userData.val()?.nome || '';
  const regRef = push(ref(db, `vales/${cardId}/registros`));
  await set(regRef, { ...registro, createdAt: new Date().toISOString(), registradoPor: user!.uid, registradoPorNome: nome });
  // Recalcular total
  const snap = await get(ref(db, `vales/${cardId}/registros`));
  const regs = snap.val() || {};
  const total = Object.values(regs).reduce((s: number, r: any) => s + (r.valor || 0), 0);
  await update(ref(db, `vales/${cardId}`), { total, updatedAt: new Date().toISOString() });
}

export async function quitarValeCard(cardId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');
  const userData = await get(ref(db, `users/${user.uid}`));
  const nome = userData.val()?.nome || '';
  await update(ref(db, `vales/${cardId}`), {
    quitado: true,
    quitadoEm: new Date().toISOString(),
    quitadoPor: user.uid,
    quitadoPorNome: nome,
  });
}

export async function removeValeRegistro(cardId: string, registroId: string): Promise<void> {
  const user = auth.currentUser;
  const userData = await get(ref(db, `users/${user!.uid}`));
  const nome = userData.val()?.nome || '';
  await import('firebase/database').then(m => m.remove(ref(db, `vales/${cardId}/registros/${registroId}`)));
  const snap = await get(ref(db, `vales/${cardId}/registros`));
  const regs = snap.val() || {};
  const total = Object.values(regs).reduce((s: number, r: any) => s + (r.valor || 0), 0);
  await update(ref(db, `vales/${cardId}`), { total, updatedAt: new Date().toISOString(), updatedBy: user!.uid, updatedByNome: nome });
}

export async function updateValeRegistro(cardId: string, registroId: string, data: Partial<ValeRegistro>): Promise<void> {
  const user = auth.currentUser;
  const userData = await get(ref(db, `users/${user!.uid}`));
  const nome = userData.val()?.nome || '';
  await update(ref(db, `vales/${cardId}/registros/${registroId}`), { ...data, updatedAt: new Date().toISOString(), updatedBy: user!.uid, updatedByNome: nome });
  const snap = await get(ref(db, `vales/${cardId}/registros`));
  const regs = snap.val() || {};
  const total = Object.values(regs).reduce((s: number, r: any) => s + (r.valor || 0), 0);
  await update(ref(db, `vales/${cardId}`), { total });
}
