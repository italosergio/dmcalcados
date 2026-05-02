import { useState, useMemo, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card } from '~/components/common/Card';
import { ChartFilters, LegendaSeletor, type PeriodoGrafico } from './ChartFilters';
import { chartTheme, filtrarPorPeriodo, baseAxis, baseYAxis, baseTooltip, MODEL_COLORS } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Despesa } from '~/models';

interface Props {
  despesas: Despesa[];
  resolveNome: (id: string, fallback: string) => string;
  globalPeriodo?: PeriodoGrafico;
  globalCustomInicio?: string;
  globalCustomFim?: string;
}

export function DespesasPorUsuario({ despesas, resolveNome, globalPeriodo, globalCustomInicio, globalCustomFim }: Props) {
  const [periodo, setPeriodo] = useState<PeriodoGrafico>('30dias');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');

  useEffect(() => {
    if (globalPeriodo !== undefined) {
      setPeriodo(globalPeriodo);
      setCustomInicio(globalCustomInicio || '');
      setCustomFim(globalCustomFim || '');
    }
  }, [globalPeriodo, globalCustomInicio, globalCustomFim]);
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);

  const filtered = useMemo(() => filtrarPorPeriodo(despesas, periodo, customInicio, customFim), [despesas, periodo, customInicio, customFim]);

  const tipos = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach(d => set.add(d.tipo || 'Outros'));
    return Array.from(set).sort();
  }, [filtered]);

  const userData = useMemo(() => {
    const map: Record<string, { total: number; porTipo: Record<string, number> }> = {};
    filtered.forEach(d => {
      const n = resolveNome(d.usuarioId, d.usuarioNome || 'Sem usuário');
      if (!map[n]) map[n] = { total: 0, porTipo: {} };
      map[n].total += d.valor;
      const t = d.tipo || 'Outros';
      map[n].porTipo[t] = (map[n].porTipo[t] || 0) + d.valor;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const cats = userData.map(([n]) => n);

  const series: Highcharts.SeriesOptionsType[] = [
    { type: 'bar', name: 'Total', data: userData.map(([, d]) => d.total), color: '#ef4444' },
  ];

  selectedTipos.forEach((tipo, i) => {
    series.push({
      type: 'bar', name: tipo,
      data: userData.map(([, d]) => d.porTipo[tipo] || 0),
      color: MODEL_COLORS[i % MODEL_COLORS.length],
    });
  });

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: Math.max(150, cats.length * 35 + 40), backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Despesas por Usuário', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(cats) as Highcharts.XAxisOptions,
    yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
    legend: { enabled: selectedTipos.length > 0, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function () { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
    series,
  };

  return (
    <Card>
      <ChartFilters periodo={periodo} setPeriodo={setPeriodo} customInicio={customInicio} setCustomInicio={setCustomInicio} customFim={customFim} setCustomFim={setCustomFim} />
      <div className="max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border-medium">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <LegendaSeletor items={tipos} selected={selectedTipos} setSelected={setSelectedTipos} label="Tipos" defaultAllVisible={false} />
    </Card>
  );
}
