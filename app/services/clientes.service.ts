import { ref, push, get, set, update } from 'firebase/database';
import { db, auth } from './firebase';
import type { Cliente } from '~/models';

export async function getClientes(): Promise<Cliente[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const userData = await get(ref(db, `users/${user.uid}`));
  const uData = userData.val();
  const roles: string[] = uData?.roles?.length ? uData.roles : [uData?.role];
  const isAdmin = roles.some(r => r === 'admin' || r === 'superadmin');

  const snapshot = await get(ref(db, 'clientes'));
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  const all: Cliente[] = Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .filter((c: any) => !c.deletedAt);

  if (isAdmin) return all;

  // Vendedor vê apenas clientes que são seus ou compartilhados com ele
  return all.filter((c: any) =>
    c.donoId === user.uid ||
    (c.compartilhadoCom && c.compartilhadoCom.includes(user.uid))
  );
}

export async function deleteCliente(clienteId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await update(ref(db, `clientes/${clienteId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user.uid
  });
}

export async function createCliente(data: Omit<Cliente, 'id' | 'createdAt'>): Promise<string> {
  const snapshot = await get(ref(db, 'clientes'));
  if (snapshot.exists()) {
    const nomeNovo = data.nome.trim().toLowerCase();
    const cpfNovo = data.cpfCnpj?.trim();
    const duplicado = Object.values(snapshot.val()).some(
      (c: any) => !c.deletedAt && (
        c.nome?.trim().toLowerCase() === nomeNovo ||
        (cpfNovo && c.cpfCnpj?.trim() === cpfNovo)
      )
    );
    if (duplicado) {
      const nomeDup = Object.values(snapshot.val()).some((c: any) => !c.deletedAt && c.nome?.trim().toLowerCase() === nomeNovo);
      throw new Error(nomeDup ? 'Já existe um cliente com esse nome' : 'Já existe um cliente com esse CPF/CNPJ');
    }
  }
  const newRef = push(ref(db, 'clientes'));
  await set(newRef, {
    ...data,
    createdAt: new Date().toISOString()
  });
  return newRef.key!;
}

export async function updateCliente(clienteId: string, data: Partial<Omit<Cliente, 'id' | 'createdAt'>>): Promise<void> {
  await update(ref(db, `clientes/${clienteId}`), data);
}

export async function compartilharCliente(clienteId: string, userIds: string[]): Promise<void> {
  await update(ref(db, `clientes/${clienteId}`), { compartilhadoCom: userIds });
}
