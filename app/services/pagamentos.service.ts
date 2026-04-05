import { ref, get, set, onValue, type Unsubscribe } from 'firebase/database';
import { db } from './firebase';

export interface PagamentoParcela {
  pago: boolean;
  dataPagamento?: string;
}

export async function marcarParcela(vendaId: string, index: number, pago: boolean): Promise<void> {
  await set(ref(db, `pagamentos/${vendaId}/${index}`), {
    pago,
    ...(pago ? { dataPagamento: new Date().toISOString().split('T')[0] } : {}),
  });
}

export function onPagamentos(callback: (data: Record<string, Record<string, PagamentoParcela>>) => void): Unsubscribe {
  return onValue(ref(db, 'pagamentos'), (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}
