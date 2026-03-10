import { useEffect, useState } from 'react';
import { Card } from '~/components/common/Card';
import { getVendas } from '~/services/vendas.service';
import { getDespesas } from '~/services/despesas.service';
import { formatCurrency } from '~/utils/format';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAuth } from '~/contexts/AuthContext';
import { useTheme } from '~/contexts/ThemeContext';
import type { Venda } from '~/models';

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isAdmin = user?.role === 'admin';
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [quantidadeVendas, setQuantidadeVendas] = useState(0);
  const [quantidadeDespesas, setQuantidadeDespesas] = useState(0);
  const [vendasMes, setVendasMes] = useState<Venda[]>([]);
  const [vendasAno, setVendasAno] = useState<Venda[]>([]);
  const [despesasMes, setDespesasMes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getVendas(), getDespesas()])
      .then(([vendas, despesas]) => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

        let vendasFiltradas = vendas;
        if (!isAdmin && user) {
          vendasFiltradas = vendas.filter(v => v.vendedorId === user.uid || v.vendedorId === user.id);
        }

        const vendasRecentes = vendasFiltradas.filter(v => new Date(v.data) >= thirtyDaysAgo);
        const despesasRecentes = despesas.filter(d => new Date(d.data) >= thirtyDaysAgo);
        const vendasDoAno = vendasFiltradas.filter(v => new Date(v.data) >= oneYearAgo);

        const somaVendas = vendasRecentes.reduce((sum, v) => sum + v.valorTotal, 0);
        const somaDespesas = despesasRecentes.reduce((sum, d) => sum + d.valor, 0);

        setTotalVendas(somaVendas);
        setTotalDespesas(somaDespesas);
        setQuantidadeVendas(vendasRecentes.length);
        setQuantidadeDespesas(despesasRecentes.length);
        setVendasMes(vendasRecentes);
        setVendasAno(vendasDoAno);
        setDespesasMes(despesasRecentes);
      })
      .catch(err => console.error('Erro dashboard:', err))
      .finally(() => setLoading(false));
  }, [isAdmin, user]);

  // Preparar dados para gráfico de 30 dias
  const chartData30Days = () => {
    const vendas: { [key: string]: number } = {};
    const despesas: { [key: string]: number } = {};
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      vendas[key] = 0;
      despesas[key] = 0;
    }

    vendasMes.forEach(v => {
      const date = new Date(v.data);
      const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (vendas[key] !== undefined) vendas[key] += v.valorTotal;
    });

    despesasMes.forEach(d => {
      const date = new Date(d.data);
      const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (despesas[key] !== undefined) despesas[key] += d.valor;
    });

    return {
      categories: Object.keys(vendas),
      vendas: Object.values(vendas),
      despesas: Object.values(despesas)
    };
  };

  // Preparar dados para gráfico anual
  const chartDataYear = () => {
    const vendas: { [key: string]: number } = {};
    const despesas: { [key: string]: number } = {};
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    meses.forEach(mes => {
      vendas[mes] = 0;
      despesas[mes] = 0;
    });

    vendasAno.forEach(v => {
      const date = new Date(v.data);
      const mes = meses[date.getMonth()];
      vendas[mes] += v.valorTotal;
    });

    despesasMes.forEach(d => {
      const date = new Date(d.data);
      const mes = meses[date.getMonth()];
      despesas[mes] += d.valor;
    });

    return {
      categories: Object.keys(vendas),
      vendas: Object.values(vendas),
      despesas: Object.values(despesas)
    };
  };

  const chart30DaysData = chartData30Days();
  const chartYearData = chartDataYear();

  const chartDataByVendedor = () => {
    const vendas: { [key: string]: number } = {};
    const despesas: { [key: string]: number } = {};
    
    vendasMes.forEach(v => {
      const vendedor = v.vendedorNome || 'Sem vendedor';
      vendas[vendedor] = (vendas[vendedor] || 0) + v.valorTotal;
    });

    despesasMes.forEach(d => {
      const usuario = d.usuarioNome || 'Sem usuário';
      despesas[usuario] = (despesas[usuario] || 0) + d.valor;
    });

    const todosNomes = Array.from(new Set([...Object.keys(vendas), ...Object.keys(despesas)]));
    
    return {
      categories: todosNomes,
      vendas: todosNomes.map(nome => vendas[nome] || 0),
      despesas: todosNomes.map(nome => despesas[nome] || 0)
    };
  };

  const chartDataByCliente = () => {
    const data: { [key: string]: number } = {};
    
    vendasMes.forEach(v => {
      const cliente = v.clienteNome || 'Sem cliente';
      data[cliente] = (data[cliente] || 0) + v.valorTotal;
    });

    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    return {
      categories: sorted.map(([nome]) => nome),
      values: sorted.map(([, valor]) => valor)
    };
  };

  const chartVendedorData = isAdmin ? chartDataByVendedor() : { categories: [], vendas: [], despesas: [] };
  const chartClienteData = chartDataByCliente();

  const chartTheme = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    textColor: isDark ? '#e5e7eb' : '#374151',
    gridColor: isDark ? '#374151' : '#e5e7eb'
  };

  const options30Days: Highcharts.Options = {
    chart: { type: 'area', height: 300, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Vendas e Despesas - Últimos 30 Dias', style: { fontSize: '14px', color: chartTheme.textColor } },
    xAxis: { 
      categories: chart30DaysData.categories, 
      labels: { rotation: -45, style: { fontSize: '10px', color: chartTheme.textColor } },
      lineColor: chartTheme.gridColor,
      tickColor: chartTheme.gridColor
    },
    yAxis: { 
      title: { text: 'Valor (R$)', style: { color: chartTheme.textColor } }, 
      labels: { formatter: function() { return 'R$ ' + (this.value as number).toFixed(0); }, style: { color: chartTheme.textColor } },
      gridLineColor: chartTheme.gridColor
    },
    series: [
      { type: 'area', name: 'Vendas', data: chart30DaysData.vendas, color: '#10b981', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(16, 185, 129, 0.3)'], [1, 'rgba(16, 185, 129, 0)']] } },
      { type: 'area', name: 'Despesas', data: chart30DaysData.despesas, color: '#ef4444', fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(239, 68, 68, 0.3)'], [1, 'rgba(239, 68, 68, 0)']] } }
    ],
    credits: { enabled: false },
    legend: { enabled: true, itemStyle: { color: chartTheme.textColor } },
    tooltip: { formatter: function() { return '<b>' + this.x + '</b><br/>' + this.series.name + ': ' + formatCurrency(this.y as number); } }
  };

  const optionsYear: Highcharts.Options = {
    chart: { type: 'column', height: 300, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Vendas e Despesas - Últimos 12 Meses', style: { fontSize: '14px', color: chartTheme.textColor } },
    xAxis: { 
      categories: chartYearData.categories,
      labels: { style: { color: chartTheme.textColor } },
      lineColor: chartTheme.gridColor,
      tickColor: chartTheme.gridColor
    },
    yAxis: { 
      title: { text: 'Valor (R$)', style: { color: chartTheme.textColor } }, 
      labels: { formatter: function() { return 'R$ ' + (this.value as number).toFixed(0); }, style: { color: chartTheme.textColor } },
      gridLineColor: chartTheme.gridColor
    },
    series: [
      { type: 'column', name: 'Vendas', data: chartYearData.vendas, color: '#10b981' },
      { type: 'column', name: 'Despesas', data: chartYearData.despesas, color: '#ef4444' }
    ],
    credits: { enabled: false },
    legend: { enabled: true, itemStyle: { color: chartTheme.textColor } },
    tooltip: { formatter: function() { return '<b>' + this.x + '</b><br/>' + this.series.name + ': ' + formatCurrency(this.y as number); } }
  };

  const optionsVendedor: Highcharts.Options = {
    chart: { type: 'bar', height: 300, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Vendas e Despesas por Usuário - Últimos 30 Dias', style: { fontSize: '14px', color: chartTheme.textColor } },
    xAxis: { 
      categories: chartVendedorData.categories, 
      title: { text: null },
      labels: { style: { color: chartTheme.textColor } },
      lineColor: chartTheme.gridColor,
      tickColor: chartTheme.gridColor
    },
    yAxis: { 
      title: { text: 'Valor (R$)', style: { color: chartTheme.textColor } }, 
      labels: { formatter: function() { return 'R$ ' + (this.value as number).toFixed(0); }, style: { color: chartTheme.textColor } },
      gridLineColor: chartTheme.gridColor
    },
    series: [
      { type: 'bar', name: 'Vendas', data: chartVendedorData.vendas, color: '#10b981' },
      { type: 'bar', name: 'Despesas', data: chartVendedorData.despesas, color: '#ef4444' }
    ],
    credits: { enabled: false },
    legend: { enabled: true, itemStyle: { color: chartTheme.textColor } },
    tooltip: { formatter: function() { return '<b>' + this.x + '</b><br/>' + this.series.name + ': ' + formatCurrency(this.y as number); } },
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function() { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none' } } } }
  };

  const optionsCliente: Highcharts.Options = {
    chart: { type: 'bar', height: 350, backgroundColor: chartTheme.backgroundColor },
    title: { text: 'Top 10 Clientes - Últimos 30 Dias', style: { fontSize: '14px', color: chartTheme.textColor } },
    xAxis: { 
      categories: chartClienteData.categories, 
      title: { text: null },
      labels: { style: { color: chartTheme.textColor } },
      lineColor: chartTheme.gridColor,
      tickColor: chartTheme.gridColor
    },
    yAxis: { 
      title: { text: 'Valor (R$)', style: { color: chartTheme.textColor } }, 
      labels: { formatter: function() { return 'R$ ' + (this.value as number).toFixed(0); }, style: { color: chartTheme.textColor } },
      gridLineColor: chartTheme.gridColor
    },
    series: [{ type: 'bar', name: 'Compras', data: chartClienteData.values, color: '#f59e0b' }],
    credits: { enabled: false },
    legend: { enabled: false },
    tooltip: { formatter: function() { return '<b>' + this.x + '</b><br/>Total: ' + formatCurrency(this.y as number); } },
    plotOptions: { bar: { dataLabels: { enabled: true, formatter: function() { return formatCurrency(this.y as number); }, style: { color: chartTheme.textColor, textOutline: 'none' } } } }
  };

  const saldo = totalVendas - totalDespesas;

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Últimos 30 dias</p>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      ) : (
        <>
          {/* Cards Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {/* Card Vendas */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag size={16} className="text-green-600 dark:text-green-400" />
                    <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Vendas</h3>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {formatCurrency(totalVendas)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {quantidadeVendas} {quantidadeVendas === 1 ? 'venda' : 'vendas'}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-full">
                  <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            {/* Card Despesas */}
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt size={16} className="text-red-600 dark:text-red-400" />
                    <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Despesas</h3>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {formatCurrency(totalDespesas)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {quantidadeDespesas} {quantidadeDespesas === 1 ? 'despesa' : 'despesas'}
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 rounded-full">
                  <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            {/* Card Saldo */}
            <Card className={`sm:col-span-2 lg:col-span-1 ${
              saldo >= 0 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={16} className={saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} />
                    <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Saldo</h3>
                  </div>
                  <p className={`text-2xl sm:text-3xl font-bold mb-1 ${
                    saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {formatCurrency(saldo)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {saldo >= 0 ? 'Lucro no período' : 'Prejuízo no período'}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-full ${
                  saldo >= 0 
                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                    : 'bg-orange-100 dark:bg-orange-900/30'
                }`}>
                  <DollarSign size={20} className={saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} />
                </div>
              </div>
            </Card>
          </div>

          {/* Resumo Rápido */}
          <Card>
            <h3 className="text-sm sm:text-base font-semibold mb-3">Resumo do Período</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Ticket Médio</p>
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  {quantidadeVendas > 0 ? formatCurrency(totalVendas / quantidadeVendas) : formatCurrency(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Margem</p>
                <p className={`text-base sm:text-lg font-bold ${
                  saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {totalVendas > 0 ? `${((saldo / totalVendas) * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </Card>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <HighchartsReact highcharts={Highcharts} options={options30Days} />
            </Card>
            <Card>
              <HighchartsReact highcharts={Highcharts} options={optionsYear} />
            </Card>
          </div>

          {/* Gráfico por Vendedor (apenas admin) */}
          {isAdmin && chartVendedorData.categories.length > 0 && (
            <Card className="mt-4">
              <HighchartsReact highcharts={Highcharts} options={optionsVendedor} />
            </Card>
          )}

          {/* Gráfico Top Clientes */}
          {chartClienteData.categories.length > 0 && (
            <Card className="mt-4">
              <HighchartsReact highcharts={Highcharts} options={optionsCliente} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
