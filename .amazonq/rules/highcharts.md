# Highcharts - Padrão do Projeto

## Imports
```tsx
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
```

## Tema (dark)
```tsx
const chartTheme = {
  backgroundColor: '#232328',
  textColor: '#f0f0f2',
  gridColor: '#2e2e36'
};
```

## Padrão de Options
- `chart.backgroundColor` → `chartTheme.backgroundColor`
- `xAxis.labels.style.color` / `lineColor` / `tickColor` → usar `chartTheme`
- `yAxis.gridLineColor` → `chartTheme.gridColor`
- `credits: { enabled: false }` → sempre desabilitado
- `legend.itemStyle.color` → `chartTheme.textColor`
- Tooltip com `formatter` usando `formatCurrency` quando valor monetário
- Cores padrão: verde `#10b981`, vermelho `#ef4444`, amarelo `#f59e0b`, azul `#3b82f6`

## Uso no JSX
```tsx
<HighchartsReact highcharts={Highcharts} options={chartOptions} />
```

## Tipos de gráfico usados
- `area` — vendas vs despesas ao longo do tempo
- `column` — comparação mensal
- `bar` — ranking (vendedores, clientes)
- `line` — evolução de saída por modelo

## SSR
O projeto usa SSR (`ssr: true`). Highcharts roda apenas no client. Não acessar `window` ou `localStorage` fora de `useEffect`.
