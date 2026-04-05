import type { PeriodoGrafico } from './ChartFilters';
import type { Venda, Despesa } from '~/models';
import { formatCurrency } from '~/utils/format';

export const chartTheme = { backgroundColor: '#232328', textColor: '#f0f0f2', gridColor: '#2e2e36' };

export const MODEL_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#e11d48',
  '#0ea5e9', '#22c55e', '#eab308', '#d946ef', '#64748b', '#fb923c',
];

export function filtrarPorPeriodo<T extends { data: Date }>(
  items: T[], periodo: PeriodoGrafico, customInicio: string, customFim: string
): T[] {
  if (periodo === 'custom') {
    let result = items;
    if (customInicio) result = result.filter(i => new Date(i.data) >= new Date(customInicio + 'T00:00:00'));
    if (customFim) result = result.filter(i => new Date(i.data) <= new Date(customFim + 'T23:59:59'));
    return result;
  }
  const agora = new Date();
  const inicio = new Date();
  switch (periodo) {
    case 'hoje': inicio.setHours(0, 0, 0, 0); break;
    case 'semana': { const d = agora.getDay(); inicio.setDate(agora.getDate() - (d === 0 ? 6 : d - 1)); inicio.setHours(0, 0, 0, 0); break; }
    case 'mes': inicio.setDate(1); inicio.setHours(0, 0, 0, 0); break;
    case '7dias': inicio.setDate(agora.getDate() - 7); break;
    case '30dias': inicio.setDate(agora.getDate() - 30); break;
    case 'ano': inicio.setFullYear(agora.getFullYear(), 0, 1); inicio.setHours(0, 0, 0, 0); break;
    case '365dias': inicio.setDate(agora.getDate() - 365); break;
  }
  return items.filter(i => new Date(i.data) >= inicio);
}

export function filtrarPorCondicao(vendas: Venda[], condicoes: string[]): Venda[] {
  if (condicoes.length === 0) return vendas;
  return vendas.filter(v => {
    const c = v.condicaoPagamento;
    return condicoes.some(f => {
      if (f === 'entrada') return c?.includes('_entrada');
      if (f === 'avista') return c === 'avista';
      return c === f || c === f + '_entrada';
    });
  });
}

export function getCategories(periodo: PeriodoGrafico, customInicio: string, customFim: string): { cats: string[]; isMonthly: boolean } {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  if (periodo === 'ano') {
    const mesAtual = new Date().getMonth();
    return { cats: meses.slice(0, mesAtual + 1), isMonthly: true };
  }

  if (periodo === '365dias') {
    const agora = new Date();
    const cats: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      cats.push(meses[d.getMonth()]);
    }
    return { cats, isMonthly: true };
  }

  if (periodo === 'custom' && customInicio && customFim) {
    const start = new Date(customInicio + 'T00:00:00');
    const end = new Date(customFim + 'T23:59:59');
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    if (diffDays > 90) return { cats: meses, isMonthly: true };
    const cats: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      cats.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return { cats, isMonthly: false };
  }

  let days: number;
  switch (periodo) {
    case 'hoje': days = 1; break;
    case 'semana': { const d = new Date().getDay(); days = d === 0 ? 7 : d; break; }
    case 'mes': days = new Date().getDate(); break;
    case '7dias': days = 7; break;
    case '30dias': days = 30; break;
    default: days = 30;
  }

  const cats: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    cats.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  }
  return { cats, isMonthly: false };
}

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function bucketKey(date: Date, isMonthly: boolean): string {
  if (isMonthly) return meses[date.getMonth()];
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function baseAxis(cats: string[]): Partial<Highcharts.XAxisOptions> {
  return {
    categories: cats,
    labels: { rotation: cats.length > 12 ? -45 : 0, style: { fontSize: '9px', color: chartTheme.textColor } },
    lineColor: chartTheme.gridColor, tickColor: chartTheme.gridColor,
  };
}

export const baseYAxis: Highcharts.YAxisOptions = {
  title: { text: null },
  labels: { formatter: function () { return 'R$ ' + (this.value as number).toFixed(0); }, style: { fontSize: '9px', color: chartTheme.textColor } },
  gridLineColor: chartTheme.gridColor,
};

export const baseTooltip: Highcharts.TooltipOptions = {
  formatter: function () { return '<b>' + this.x + '</b><br/>' + this.series.name + ': ' + formatCurrency(this.y as number); }
};

export function getModelos(vendas: Venda[]): string[] {
  const set = new Set<string>();
  vendas.forEach(v => v.produtos.forEach(p => set.add(p.modelo)));
  return Array.from(set).sort();
}

export function getDiaSemana(date: Date): string {
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
}
