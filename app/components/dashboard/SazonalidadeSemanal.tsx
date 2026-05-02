import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartCard } from './ChartCard';
import { chartTheme, filtrarPorPeriodo, filtrarPorCondicao, baseAxis, baseYAxis, baseTooltip } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';
import type { PeriodoGrafico } from './ChartFilters';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function SazonalidadeSemanal({ vendas, globalPeriodo, globalCustomInicio, globalCustomFim }: { vendas: Venda[]; globalPeriodo?: PeriodoGrafico; globalCustomInicio?: string; globalCustomFim?: string }) {
  return (
    <ChartCard showCondicao defaultPeriodo="30dias" globalPeriodo={globalPeriodo} globalCustomInicio={globalCustomInicio} globalCustomFim={globalCustomFim}>
      {({ periodo, customInicio, customFim, condicoes }) => {
        const filtered = filtrarPorCondicao(filtrarPorPeriodo(vendas, periodo, customInicio, customFim), condicoes);

        const data = useMemo(() => {
          const map: Record<number, { total: number; count: number }> = {};
          for (let i = 0; i < 7; i++) map[i] = { total: 0, count: 0 };
          filtered.forEach(v => {
            const d = new Date(v.data).getDay();
            const idx = d === 0 ? 6 : d - 1; // seg=0 ... dom=6
            map[idx].total += v.valorTotal;
            map[idx].count++;
          });
          return DIAS.map((_, i) => map[i]);
        }, [filtered]);

        const options: Highcharts.Options = {
          chart: { type: 'column', height: 180, backgroundColor: chartTheme.backgroundColor },
          title: { text: 'Vendas por Dia da Semana', style: { fontSize: '12px', color: chartTheme.textColor } },
          xAxis: baseAxis(DIAS) as Highcharts.XAxisOptions,
          yAxis: baseYAxis,
          tooltip: {
            formatter: function () {
              const d = data[this.point.index];
              return `<b>${DIAS[this.point.index]}</b><br/>Total: ${formatCurrency(d.total)}<br/>${d.count} vendas · Média: ${d.count > 0 ? formatCurrency(d.total / d.count) : 'R$ 0'}`;
            }
          },
          credits: { enabled: false }, legend: { enabled: false },
          plotOptions: { column: { dataLabels: { enabled: true, formatter: function () { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
          series: [{ type: 'column', name: 'Vendas', data: data.map(d => d.total), color: '#10b981' }],
        };

        return <HighchartsReact highcharts={Highcharts} options={options} />;
      }}
    </ChartCard>
  );
}
