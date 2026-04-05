import type { Venda } from '~/models';
import type { PagamentoParcela } from '~/services/pagamentos.service';

import { CheckCircle, AlertTriangle, XOctagon, TrendingDown, Minus, Diamond, Crown } from 'lucide-react';

// --- Status de pagamento do cliente ---
export type ClientePayStatus = 'avista' | 'em_dia' | 'atrasado' | 'critico';

export function getClientePayStatus(
  clienteId: string,
  vendas: Venda[],
  pagamentos: Record<string, Record<string, PagamentoParcela>>
): ClientePayStatus | null {
  const cv = vendas.filter(v => v.clienteId === clienteId && !v.deletedAt);
  if (cv.length === 0) return null;

  // Se valor à vista > valor a prazo → Paga à vista
  const totalAvista = cv.filter(v => v.condicaoPagamento === 'avista').reduce((s, v) => s + v.valorTotal, 0);
  const totalPrazo = cv.filter(v => v.condicaoPagamento !== 'avista').reduce((s, v) => s + v.valorTotal, 0);
  if (totalAvista > totalPrazo) return 'avista';

  const hoje = new Date().setHours(0, 0, 0, 0);
  let pioresAtraso = 0;

  for (const v of cv) {
    if (v.condicaoPagamento === 'avista' || !v.datasParcelas?.length) continue;
    for (let i = 0; i < v.datasParcelas.length; i++) {
      if (pagamentos[v.id]?.[i]?.pago) continue;
      const diff = Math.floor((hoje - new Date(v.datasParcelas[i] + 'T00:00:00').getTime()) / 86400000);
      if (diff > pioresAtraso) pioresAtraso = diff;
    }
  }

  if (pioresAtraso > 60) return 'critico';
  if (pioresAtraso > 0) return 'atrasado';
  return 'em_dia';
}

export const PAY_STATUS_CONFIG: Record<ClientePayStatus, { label: string; color: string; bg: string; icon: any }> = {
  avista:   { label: 'Paga à vista', color: 'text-amber-400',  bg: 'bg-amber-500/15',  icon: Crown },
  em_dia:   { label: 'Bom pagador',  color: 'text-green-400',  bg: 'bg-green-500/15',  icon: CheckCircle },
  atrasado: { label: 'Atrasado',     color: 'text-yellow-400', bg: 'bg-yellow-500/15', icon: AlertTriangle },
  critico:  { label: 'Crítico',      color: 'text-red-400',    bg: 'bg-red-500/15',    icon: XOctagon },
};

// --- Ticket do cliente ---
export type TicketLevel = 'baixo' | 'medio' | 'alto';

export function getTicketLevel(clienteId: string, vendas: Venda[]): TicketLevel | null {
  const cv = vendas.filter(v => v.clienteId === clienteId && !v.deletedAt);
  if (cv.length === 0) return null;
  const ticket = cv.reduce((s, v) => s + v.valorTotal, 0) / cv.length;
  if (ticket >= 1000) return 'alto';
  if (ticket >= 300) return 'medio';
  return 'baixo';
}

export const TICKET_CONFIG: Record<TicketLevel, { label: string; color: string; bg: string; icon: any }> = {
  baixo: { label: 'Ticket baixo', color: 'text-orange-400', bg: 'bg-orange-500/15', icon: TrendingDown },
  medio: { label: 'Ticket médio', color: 'text-blue-400',   bg: 'bg-blue-500/15',   icon: Minus },
  alto:  { label: 'Ticket alto',  color: 'text-purple-400', bg: 'bg-purple-500/15',  icon: Diamond },
};
