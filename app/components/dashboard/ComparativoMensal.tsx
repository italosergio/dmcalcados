import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card } from '~/components/common/Card';
import { chartTheme, baseYAxis, baseTooltip } from './chartUtils';
import { formatCurrency } from '~/utils/format';
import type { Venda, Despesa } from '~/models';

interface Props {
  vendas: Venda[];
  despesas: Despesa[];
}

export function ComparativoMensal({ vendas, despesas }: Props) {
  const data = useMemo(() => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const vAtual = vendas.filter(v => { const d = new Date(v.data); return d.getMonth() === mesAtual && d.getFullYear() === anoAtual; });
    const vAnterior = vendas.filter(v => { const d = new Date(v.data); return d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior; });
    const dAtual = despesas.filter(d => { const dt = new Date(d.data); return dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual; });
    const dAnterior = despesas.filter(d => { const dt = new Date(d.data); return dt.getMonth() === mesAnterior && dt.getFullYear() === anoAnterior; });

    const totalVA = vAtual.reduce((s, v) => s + v.valorTotal, 0);
    const totalVAnt = vAnterior.reduce((s, v) => s + v.valorTotal, 0);
    const totalDA = dAtual.reduce((s, d) => s + d.valor, 0);
    const totalDAnt = dAnterior.reduce((s, d) => s + d.valor, 0);

    return {
      mesAtualLabel: meses[mesAtual],
      mesAnteriorLabel: meses[mesAnterior],
      vendas: [totalVAnt, totalVA],
      despesas: [totalDAnt, totalDA],
      saldo: [totalVAnt - totalDAnt, totalVA - totalDA],
    };
  }, [vendas, despesas]);

  const options: Highcharts.Options = {
    chart: { type: 'column', height: 180, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Comparativo Mensal', style: { fontSize: '12px', color: chartTheme.textColor } },
    xAxis: {
      categories: [data.mesAnteriorLabel, data.mesAtualLabel],
      labels: { style: { fontSize: '10px', color: chartTheme.textColor } },
      lineColor: chartTheme.gridColor, tickColor: chartTheme.gridColor,
    },
    yAxis: baseYAxis, tooltip: baseTooltip, credits: { enabled: false },
    legend: { enabled: true, itemStyle: { color: chartTheme.textColor, fontSize: '10px' } },
    plotOptions: { column: { dataLabels: { enabled: true, formatter: function () { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none', fontSize: '9px' } } } },
    series: [
      { type: 'column', name: 'Vendas', data: data.vendas, color: '#10b981' },
      { type: 'column', name: 'Despesas', data: data.despesas, color: '#ef4444' },
      { type: 'column', name: 'Saldo', data: data.saldo, color: '#3b82f6' },
    ],
  };

  return (
    <Card>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </Card>
  );
}
