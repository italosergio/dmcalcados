import { useState, useMemo, useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartCard } from './ChartCard';
import { LegendaSeletor } from './ChartFilters';
import { chartTheme, filtrarPorPeriodo, filtrarPorCondicao, getCategories, bucketKey, baseAxis, baseYAxis, baseTooltip, getModelos, MODEL_COLORS } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';

export function VendasTimeline({ vendas }: { vendas: Venda[] }) {
  const [selectedModelos, setSelectedModelos] = useState<string[]>([]);
  const initialized = useRef(false);

  const allModelos = useMemo(() => getModelos(vendas), [vendas]);

  useEffect(() => {
    if (!initialized.current && allModelos.length > 0) {
      setSelectedModelos(allModelos);
      initialized.current = true;
    }
  }, [allModelos]);

  return (
    <ChartCard showCondicao defaultPeriodo="30dias">
      {({ periodo, customInicio, customFim, condicoes }) => {
        const filtered = filtrarPorCondicao(filtrarPorPeriodo(vendas, periodo, customInicio, customFim), condicoes);
        const { cats, isMonthly } = getCategories(periodo, customInicio, customFim);
        const modelos = getModelos(filtered);

        const totalData = useMemo(() => {
          const map: Record<string, number> = {};
          cats.forEach(c => map[c] = 0);
          filtered.forEach(v => { const k = bucketKey(new Date(v.data), isMonthly); if (map[k] !== undefined) map[k] += v.valorTotal; });
          return cats.map(c => map[c] || 0);
        }, [filtered, cats, isMonthly]);

        const modeloSeries = useMemo(() => {
          return selectedModelos.filter(m => modelos.includes(m)).map((modelo, i) => {
            const map: Record<string, number> = {};
            cats.forEach(c => map[c] = 0);
            filtered.forEach(v => v.produtos.filter(p => p.modelo === modelo).forEach(p => {
              const k = bucketKey(new Date(v.data), isMonthly);
              if (map[k] !== undefined) map[k] += p.valorTotal;
            }));
            return {
              type: 'line' as const, name: modelo, data: cats.map(c => map[c] || 0),
              color: MODEL_COLORS[i % MODEL_COLORS.length], lineWidth: 1.5,
              marker: { radius: 2 },
            };
          });
        }, [filtered, cats, isMonthly, selectedModelos, modelos]);

        const options: Highcharts.Options = {
          chart: { type: 'area', height: 260, backgroundColor: chartTheme.backgroundColor },
          title: { text: 'Vendas', style: { fontSize: '12px', color: chartTheme.textColor } },
          xAxis: { ...baseAxis(cats), labels: { step: Math.max(1, Math.floor(cats.length / 10)), rotation: cats.length > 10 ? -45 : 0, style: { fontSize: '9px', color: chartTheme.textColor } } },
          yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
          legend: { enabled: modeloSeries.length > 0, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
          series: [
            { type: 'area', name: 'Total', data: totalData, color: '#10b981', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(16,185,129,0.3)'], [1, 'rgba(16,185,129,0)']] } },
            ...modeloSeries,
          ],
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
