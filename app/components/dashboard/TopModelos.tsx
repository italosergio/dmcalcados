import { useState, useMemo, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card } from '~/components/common/Card';
import { ChartFilters, LegendaSeletor, type PeriodoGrafico } from './ChartFilters';
import { chartTheme, filtrarPorPeriodo, filtrarPorCondicao, baseAxis, baseYAxis, baseTooltip, MODEL_COLORS } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';

interface Props {
  vendas: Venda[];
  resolveNome: (id: string, fallback: string) => string;
  vendedores: string[];
  globalPeriodo?: PeriodoGrafico;
  globalCustomInicio?: string;
  globalCustomFim?: string;
}

export function TopModelos({ vendas, resolveNome, vendedores, globalPeriodo, globalCustomInicio, globalCustomFim }: Props) {
  const [periodo, setPeriodo] = useState<PeriodoGrafico>('30dias');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');
  const [condicoes, setCondicoes] = useState<string[]>([]);
  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);

  useEffect(() => {
    if (globalPeriodo !== undefined) {
      setPeriodo(globalPeriodo);
      setCustomInicio(globalCustomInicio || '');
      setCustomFim(globalCustomFim || '');
    }
  }, [globalPeriodo, globalCustomInicio, globalCustomFim]);

  const filtered = useMemo(() =>
    filtrarPorCondicao(filtrarPorPeriodo(vendas, periodo, customInicio, customFim), condicoes),
    [vendas, periodo, customInicio, customFim, condicoes]
  );

  const modeloData = useMemo(() => {
    const map: Record<string, { total: number; porVendedor: Record<string, number>; pacotes: number; pares: number }> = {};
    filtered.forEach(v => {
      const vn = resolveNome(v.vendedorId, v.vendedorNome || 'Sem vendedor');
      v.produtos.forEach(p => {
        if (!map[p.modelo]) map[p.modelo] = { total: 0, porVendedor: {}, pacotes: 0, pares: 0 };
        map[p.modelo].total += p.valorTotal;
        map[p.modelo].porVendedor[vn] = (map[p.modelo].porVendedor[vn] || 0) + p.valorTotal;
        if (p.tipo === 'pacote') { map[p.modelo].pacotes += p.quantidade; map[p.modelo].pares += p.quantidade * 15; }
        else { map[p.modelo].pares += p.quantidade; map[p.modelo].pacotes += p.quantidade / 15; }
      });
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 15);
  }, [filtered]);

  const cats = modeloData.map(([n]) => n);

  const series: Highcharts.SeriesOptionsType[] = [
    { type: 'bar', name: 'Total', data: modeloData.map(([, d]) => d.total), color: '#3b82f6' },
  ];

  selectedVendedores.forEach((vend, i) => {
    series.push({
      type: 'bar', name: vend,
      data: modeloData.map(([, d]) => d.porVendedor[vend] || 0),
      color: MODEL_COLORS[i % MODEL_COLORS.length],
    });
  });

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: Math.max(220, cats.length * 30 + 60), backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Top Modelos', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: baseAxis(cats) as Highcharts.XAxisOptions,
    yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
    legend: { enabled: selectedVendedores.length > 0, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function () { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
    series,
  };

  return (
    <Card>
      <ChartFilters periodo={periodo} setPeriodo={setPeriodo} customInicio={customInicio} setCustomInicio={setCustomInicio} customFim={customFim} setCustomFim={setCustomFim} condicoes={condicoes} setCondicoes={setCondicoes} showCondicao />
      <HighchartsReact highcharts={Highcharts} options={options} />
      {/* Tabela ranking */}
      {modeloData.length > 0 && (
        <div className="mt-3 rounded-xl border border-border-subtle overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-elevated/50">
                <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">#</th>
                <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Modelo</th>
                <th className="px-2.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted">Pacotes</th>
                <th className="px-2.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted">Pares</th>
                <th className="px-2.5 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {modeloData.map(([modelo, d], i) => (
                <tr key={modelo}>
                  <td className="px-2.5 py-1.5 text-xs text-content-muted">{i + 1}º</td>
                  <td className="px-2.5 py-1.5 text-xs font-medium truncate max-w-[120px]">{modelo}</td>
                  <td className="px-2.5 py-1.5 text-xs text-center text-content-muted">{d.pacotes ? (d.pacotes % 1 === 0 ? d.pacotes : d.pacotes.toFixed(1)) : '—'}</td>
                  <td className="px-2.5 py-1.5 text-xs text-center text-blue-400">{d.pares}</td>
                  <td className="px-2.5 py-1.5 text-xs font-semibold text-green-400 text-right whitespace-nowrap">{formatCurrency(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LegendaSeletor items={vendedores} selected={selectedVendedores} setSelected={setSelectedVendedores} label="Vendedores" defaultAllVisible={false} />
    </Card>
  );
}
