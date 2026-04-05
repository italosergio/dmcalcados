import { useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartCard } from './ChartCard';
import { LegendaSeletor } from './ChartFilters';
import { chartTheme, filtrarPorPeriodo, filtrarPorCondicao, baseAxis, baseYAxis, baseTooltip, getModelos, MODEL_COLORS } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';

interface Props {
  vendas: Venda[];
  resolveNome: (id: string, fallback: string) => string;
}

export function VendasPorVendedor({ vendas, resolveNome }: Props) {
  const [selectedModelos, setSelectedModelos] = useState<string[]>([]);

  return (
    <ChartCard showCondicao defaultPeriodo="30dias">
      {({ periodo, customInicio, customFim, condicoes }) => {
        const filtered = filtrarPorCondicao(filtrarPorPeriodo(vendas, periodo, customInicio, customFim), condicoes);
        const modelos = getModelos(filtered);

        const vendedores = useMemo(() => {
          const map: Record<string, { total: number; porModelo: Record<string, number> }> = {};
          filtered.forEach(v => {
            const n = resolveNome(v.vendedorId, v.vendedorNome || 'Sem vendedor');
            if (!map[n]) map[n] = { total: 0, porModelo: {} };
            map[n].total += v.valorTotal;
            v.produtos.forEach(p => { map[n].porModelo[p.modelo] = (map[n].porModelo[p.modelo] || 0) + p.valorTotal; });
          });
          return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
        }, [filtered]);

        const cats = vendedores.map(([n]) => n);

        const series: Highcharts.SeriesOptionsType[] = [
          { type: 'bar', name: 'Total', data: vendedores.map(([, d]) => d.total), color: '#10b981' },
        ];

        selectedModelos.forEach((modelo, i) => {
          series.push({
            type: 'bar', name: modelo,
            data: vendedores.map(([, d]) => d.porModelo[modelo] || 0),
            color: MODEL_COLORS[i % MODEL_COLORS.length],
          });
        });

        const options: Highcharts.Options = {
          chart: { type: 'bar', height: Math.max(220, cats.length * 40 + 60), backgroundColor: chartTheme.backgroundColor },
          title: { text: 'Por Vendedor', style: { fontSize: '12px', color: chartTheme.textColor } },
          xAxis: baseAxis(cats) as Highcharts.XAxisOptions,
          yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
          legend: { enabled: selectedModelos.length > 0, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
          plotOptions: { bar: { dataLabels: { enabled: true, formatter: function () { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
          series,
        };

        return (
          <>
            <HighchartsReact highcharts={Highcharts} options={options} />
            <LegendaSeletor items={modelos} selected={selectedModelos} setSelected={setSelectedModelos} label="Modelos" />
          </>
        );
      }}
    </ChartCard>
  );
}
