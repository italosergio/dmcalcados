import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartCard } from './ChartCard';
import { chartTheme, filtrarPorPeriodo, getCategories, bucketKey, baseAxis, baseYAxis } from './chartUtils';
import type { Venda } from '~/models';

export function CondicaoPagamentoTimeline({ vendas }: { vendas: Venda[] }) {
  return (
    <ChartCard defaultPeriodo="30dias">
      {({ periodo, customInicio, customFim }) => {
        const filtered = filtrarPorPeriodo(vendas, periodo, customInicio, customFim);
        const { cats, isMonthly } = getCategories(periodo, customInicio, customFim);

        const data = useMemo(() => {
          const avista: Record<string, number> = {};
          const prazo: Record<string, number> = {};
          cats.forEach(c => { avista[c] = 0; prazo[c] = 0; });
          filtered.forEach(v => {
            const k = bucketKey(new Date(v.data), isMonthly);
            if (avista[k] === undefined) return;
            if (v.condicaoPagamento === 'avista') avista[k] += v.valorTotal;
            else prazo[k] += v.valorTotal;
          });
          return {
            avista: cats.map(c => avista[c] || 0),
            prazo: cats.map(c => prazo[c] || 0),
          };
        }, [filtered, cats, isMonthly]);

        const totalAvista = data.avista.reduce((s, v) => s + v, 0);
        const totalPrazo = data.prazo.reduce((s, v) => s + v, 0);
        const total = totalAvista + totalPrazo;
        const pctAvista = total > 0 ? ((totalAvista / total) * 100).toFixed(1) : '0';
        const pctPrazo = total > 0 ? ((totalPrazo / total) * 100).toFixed(1) : '0';

        const options: Highcharts.Options = {
          chart: { type: 'area', height: 240, backgroundColor: chartTheme.backgroundColor },
          title: { text: `À Vista vs Prazo (${pctAvista}% / ${pctPrazo}%)`, style: { fontSize: '12px', color: chartTheme.textColor } },
          xAxis: { ...baseAxis(cats), labels: { step: Math.max(1, Math.floor(cats.length / 10)), rotation: cats.length > 10 ? -45 : 0, style: { fontSize: '9px', color: chartTheme.textColor } } },
          yAxis: baseYAxis, credits: { enabled: false },
          legend: { enabled: true, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
          tooltip: { shared: true },
          plotOptions: { area: { stacking: 'normal' } },
          series: [
            { type: 'area', name: 'À Vista', data: data.avista, color: '#3b82f6', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(59,130,246,0.3)'], [1, 'rgba(59,130,246,0)']] } },
            { type: 'area', name: 'Prazo', data: data.prazo, color: '#f59e0b', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(245,158,11,0.3)'], [1, 'rgba(245,158,11,0)']] } },
          ],
        };

        return <HighchartsReact highcharts={Highcharts} options={options} />;
      }}
    </ChartCard>
  );
}
