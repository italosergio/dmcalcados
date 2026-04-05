import { useState, useMemo, useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartCard } from './ChartCard';
import { LegendaSeletor } from './ChartFilters';
import { chartTheme, filtrarPorPeriodo, getCategories, bucketKey, baseAxis, baseYAxis, baseTooltip, MODEL_COLORS } from './chartUtils';
import type { Despesa } from '~/models';
import type { PeriodoGrafico } from './ChartFilters';

export function DespesasTimeline({ despesas, globalPeriodo, globalCustomInicio, globalCustomFim }: { despesas: Despesa[]; globalPeriodo?: PeriodoGrafico; globalCustomInicio?: string; globalCustomFim?: string }) {
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const initialized = useRef(false);

  const allTipos = useMemo(() => {
    const set = new Set<string>();
    despesas.forEach(d => set.add(d.tipo || 'Outros'));
    return Array.from(set).sort();
  }, [despesas]);

  useEffect(() => {
    if (!initialized.current && allTipos.length > 0) {
      setSelectedTipos(allTipos);
      initialized.current = true;
    }
  }, [allTipos]);

  return (
    <ChartCard showCondicao={false} defaultPeriodo="30dias" globalPeriodo={globalPeriodo} globalCustomInicio={globalCustomInicio} globalCustomFim={globalCustomFim}>
      {({ periodo, customInicio, customFim }) => {
        const filtered = filtrarPorPeriodo(despesas, periodo, customInicio, customFim);
        const { cats, isMonthly } = getCategories(periodo, customInicio, customFim);

        const tipos = useMemo(() => {
          const set = new Set<string>();
          filtered.forEach(d => set.add(d.tipo || 'Outros'));
          return Array.from(set).sort();
        }, [filtered]);

        const totalData = useMemo(() => {
          const map: Record<string, number> = {};
          cats.forEach(c => map[c] = 0);
          filtered.forEach(d => { const k = bucketKey(new Date(d.data), isMonthly); if (map[k] !== undefined) map[k] += d.valor; });
          return cats.map(c => map[c] || 0);
        }, [filtered, cats, isMonthly]);

        const tipoSeries = useMemo(() => {
          return selectedTipos.filter(t => tipos.includes(t)).map((tipo, i) => {
            const map: Record<string, number> = {};
            cats.forEach(c => map[c] = 0);
            filtered.filter(d => (d.tipo || 'Outros') === tipo).forEach(d => {
              const k = bucketKey(new Date(d.data), isMonthly);
              if (map[k] !== undefined) map[k] += d.valor;
            });
            return {
              type: 'line' as const, name: tipo, data: cats.map(c => map[c] || 0),
              color: MODEL_COLORS[i % MODEL_COLORS.length], lineWidth: 1.5, marker: { radius: 2 },
            };
          });
        }, [filtered, cats, isMonthly, selectedTipos, tipos]);

        const options: Highcharts.Options = {
          chart: { type: 'area', height: 260, backgroundColor: chartTheme.backgroundColor },
          title: { text: 'Despesas', style: { fontSize: '12px', color: chartTheme.textColor } },
          xAxis: { ...baseAxis(cats), labels: { step: Math.max(1, Math.floor(cats.length / 10)), rotation: cats.length > 10 ? -45 : 0, style: { fontSize: '9px', color: chartTheme.textColor } } },
          yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
          legend: { enabled: tipoSeries.length > 0, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
          series: [
            { type: 'area', name: 'Total', data: totalData, color: '#ef4444', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(239,68,68,0.3)'], [1, 'rgba(239,68,68,0)']] } },
            ...tipoSeries,
          ],
        };

        return (
          <>
            <HighchartsReact highcharts={Highcharts} options={options} />
            <LegendaSeletor items={tipos} selected={selectedTipos} setSelected={setSelectedTipos} label="Tipos" />
          </>
        );
      }}
    </ChartCard>
  );
}
