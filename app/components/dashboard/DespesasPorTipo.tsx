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
  vendedores: string[];
  globalPeriodo?: PeriodoGrafico;
  globalCustomInicio?: string;
  globalCustomFim?: string;
}

export function DespesasPorTipo({ despesas, resolveNome, vendedores, globalPeriodo, globalCustomInicio, globalCustomFim }: Props) {
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
  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);

  const filtered = useMemo(() => filtrarPorPeriodo(despesas, periodo, customInicio, customFim), [despesas, periodo, customInicio, customFim]);

  const tipoData = useMemo(() => {
    const map: Record<string, { total: number; porVendedor: Record<string, number> }> = {};
    filtered.forEach(d => {
      const t = d.tipo || 'Outros';
      if (!map[t]) map[t] = { total: 0, porVendedor: {} };
      map[t].total += d.valor;
      const n = resolveNome(d.usuarioId, d.usuarioNome || 'Sem usuário');
      map[t].porVendedor[n] = (map[t].porVendedor[n] || 0) + d.valor;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const cats = tipoData.map(([n]) => n);

  const series: Highcharts.SeriesOptionsType[] = [
    { type: 'bar', name: 'Total', data: tipoData.map(([, d]) => d.total), color: '#ef4444' },
  ];

  selectedVendedores.forEach((vend, i) => {
    series.push({
      type: 'bar', name: vend,
      data: tipoData.map(([, d]) => d.porVendedor[vend] || 0),
      color: MODEL_COLORS[i % MODEL_COLORS.length],
    });
  });

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: Math.max(150, cats.length * 35 + 40), backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Despesas por Tipo', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(cats) as Highcharts.XAxisOptions,
    yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
    legend: { enabled: selectedVendedores.length > 0, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function () { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
    series,
  };

  return (
    <Card>
      <ChartFilters periodo={periodo} setPeriodo={setPeriodo} customInicio={customInicio} setCustomInicio={setCustomInicio} customFim={customFim} setCustomFim={setCustomFim} />
      <div className="max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border-medium">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <LegendaSeletor items={vendedores} selected={selectedVendedores} setSelected={setSelectedVendedores} label="Vendedores" defaultAllVisible={false} />
    </Card>
  );
}
