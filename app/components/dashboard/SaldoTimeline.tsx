import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartCard } from './ChartCard';
import { chartTheme, filtrarPorPeriodo, getCategories, bucketKey, baseAxis, baseYAxis, baseTooltip } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Venda, Despesa } from '~/models';
import type { PeriodoGrafico } from './ChartFilters';

export function SaldoTimeline({ vendas, despesas, globalPeriodo, globalCustomInicio, globalCustomFim }: { vendas: Venda[]; despesas: Despesa[]; globalPeriodo?: PeriodoGrafico; globalCustomInicio?: string; globalCustomFim?: string }) {
  return (
    <ChartCard defaultPeriodo="30dias" globalPeriodo={globalPeriodo} globalCustomInicio={globalCustomInicio} globalCustomFim={globalCustomFim}>
      {({ periodo, customInicio, customFim }) => {
        const vFilt = filtrarPorPeriodo(vendas, periodo, customInicio, customFim);
        const dFilt = filtrarPorPeriodo(despesas, periodo, customInicio, customFim);
        const { cats, isMonthly } = getCategories(periodo, customInicio, customFim);

        const data = useMemo(() => {
          const vMap: Record<string, number> = {};
          const dMap: Record<string, number> = {};
          cats.forEach(c => { vMap[c] = 0; dMap[c] = 0; });
          vFilt.forEach(v => { const k = bucketKey(new Date(v.data), isMonthly); if (vMap[k] !== undefined) vMap[k] += v.valorTotal; });
          dFilt.forEach(d => { const k = bucketKey(new Date(d.data), isMonthly); if (dMap[k] !== undefined) dMap[k] += d.valor; });
          return {
            vendas: cats.map(c => vMap[c] || 0),
            despesas: cats.map(c => dMap[c] || 0),
            saldo: cats.map(c => (vMap[c] || 0) - (dMap[c] || 0)),
          };
        }, [vFilt, dFilt, cats, isMonthly]);

        const options: Highcharts.Options = {
          chart: { type: 'line', height: 180, backgroundColor: chartTheme.backgroundColor },
          title: { text: 'Evolução do Saldo', style: { fontSize: '12px', color: chartTheme.textColor } },
          xAxis: { ...baseAxis(cats), labels: { step: Math.max(1, Math.floor(cats.length / 10)), rotation: cats.length > 10 ? -45 : 0, style: { fontSize: '9px', color: chartTheme.textColor } } },
          yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
          legend: { enabled: true, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
          series: [
            { type: 'line', name: 'Vendas', data: data.vendas, color: '#10b981', lineWidth: 1.5, marker: { radius: 2 } },
            { type: 'line', name: 'Despesas', data: data.despesas, color: '#ef4444', lineWidth: 1.5, marker: { radius: 2 } },
            { type: 'area', name: 'Saldo', data: data.saldo, color: '#3b82f6', lineWidth: 2, marker: { radius: 2 },
              fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(59,130,246,0.2)'], [1, 'rgba(59,130,246,0)']] },
              zones: [{ value: 0, color: '#ef4444', fillColor: { linearGradient: { x1: 0, y1: 1, x2: 0, y2: 0 }, stops: [[0, 'rgba(239,68,68,0)'], [1, 'rgba(239,68,68,0.2)']] } }, { color: '#3b82f6' }],
            },
          ],
        };

        return <HighchartsReact highcharts={Highcharts} options={options} />;
      }}
    </ChartCard>
  );
}
