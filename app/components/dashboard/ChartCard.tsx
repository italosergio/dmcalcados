import { useState, type ReactNode } from 'react';
import { Card } from '~/components/common/Card';
import { ChartFilters, type PeriodoGrafico } from './ChartFilters';

interface ChartCardProps {
  children: (params: {
    periodo: PeriodoGrafico;
    customInicio: string;
    customFim: string;
    condicoes: string[];
  }) => ReactNode;
  showCondicao?: boolean;
  defaultPeriodo?: PeriodoGrafico;
}

export function ChartCard({ children, showCondicao = false, defaultPeriodo = '30dias' }: ChartCardProps) {
  const [periodo, setPeriodo] = useState<PeriodoGrafico>(defaultPeriodo);
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');
  const [condicoes, setCondicoes] = useState<string[]>([]);

  return (
    <Card>
      <ChartFilters
        periodo={periodo} setPeriodo={setPeriodo}
        customInicio={customInicio} setCustomInicio={setCustomInicio}
        customFim={customFim} setCustomFim={setCustomFim}
        condicoes={condicoes} setCondicoes={setCondicoes}
        showCondicao={showCondicao}
      />
      {children({ periodo, customInicio, customFim, condicoes })}
    </Card>
  );
}
