import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartCard } from './ChartCard';
import { chartTheme, filtrarPorPeriodo, filtrarPorCondicao, baseAxis, baseYAxis, baseTooltip } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';
import type { PeriodoGrafico } from './ChartFilters';

interface Props {
  vendas: Venda[];
  resolveNome: (id: string, fallback: string) => string;
  globalPeriodo?: PeriodoGrafico;
  globalCustomInicio?: string;
  globalCustomFim?: string;
}

export function TicketMedioPorVendedor({ vendas, resolveNome, globalPeriodo, globalCustomInicio, globalCustomFim }: Props) {
  return (
    <ChartCard showCondicao defaultPeriodo="30dias" globalPeriodo={globalPeriodo} globalCustomInicio={globalCustomInicio} globalCustomFim={globalCustomFim}>
      {({ periodo, customInicio, customFim, condicoes }) => {
        const filtered = filtrarPorCondicao(filtrarPorPeriodo(vendas, periodo, customInicio, customFim), condicoes);

        const data = useMemo(() => {
          const map: Record<string, { total: number; count: number }> = {};
          filtered.forEach(v => {
            const n = resolveNome(v.vendedorId, v.vendedorNome || 'Sem vendedor');
            if (!map[n]) map[n] = { total: 0, count: 0 };
            map[n].total += v.valorTotal;
            map[n].count++;
          });
          return Object.entries(map)
            .map(([nome, d]) => ({ nome, ticket: d.total / d.count, count: d.count, total: d.total }))
            .sort((a, b) => b.ticket - a.ticket);
        }, [filtered]);

        const options: Highcharts.Options = {
          chart: { type: 'bar', height: Math.max(200, data.length * 40 + 60), backgroundColor: chartTheme.backgroundColor },
          title: { text: 'Ticket Médio por Vendedor', style: { fontSize: '12px', color: chartTheme.textColor } },
          xAxis: baseAxis(data.map(d => d.nome)) as Highcharts.XAxisOptions,
          yAxis: baseYAxis,
          tooltip: {
            formatter: function () {
              const d = data[this.point.index];
              return `<b>${d.nome}</b><br/>Ticket: ${formatCurrency(d.ticket)}<br/>${d.count} vendas · Total: ${formatCurrency(d.total)}`;
            }
          },
          credits: { enabled: false }, legend: { enabled: false },
          plotOptions: { bar: { dataLabels: { enabled: true, formatter: function () { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
          series: [{ type: 'bar', name: 'Ticket Médio', data: data.map(d => d.ticket), color: '#8b5cf6' }],
        };

        return <HighchartsReact highcharts={Highcharts} options={options} />;
      }}
    </ChartCard>
  );
}
