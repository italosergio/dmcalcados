import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export type PeriodoGrafico = 'hoje' | 'semana' | 'mes' | '7dias' | '30dias' | '60dias' | 'ano' | '365dias' | 'custom';

export const PERIODO_OPTIONS: { value: PeriodoGrafico; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
  { value: '7dias', label: '7d' },
  { value: '30dias', label: '30d' },
  { value: '60dias', label: '60d' },
  { value: '365dias', label: '365d' },
  { value: 'custom', label: 'Período' },
];

export const CONDICAO_OPTIONS = [
  { value: 'avista', label: 'À Vista' },
  { value: 'entrada', label: 'Entrada' },
  { value: '1x', label: '1x' },
  { value: '2x', label: '2x' },
  { value: '3x', label: '3x' },
];

interface ChartFiltersProps {
  periodo: PeriodoGrafico;
  setPeriodo: (p: PeriodoGrafico) => void;
  customInicio?: string;
  setCustomInicio?: (v: string) => void;
  customFim?: string;
  setCustomFim?: (v: string) => void;
  condicoes?: string[];
  setCondicoes?: (c: string[]) => void;
  showCondicao?: boolean;
}

export function ChartFilters({
  periodo, setPeriodo,
  customInicio = '', setCustomInicio,
  customFim = '', setCustomFim,
  condicoes = [], setCondicoes,
  showCondicao = false,
}: ChartFiltersProps) {
  const [showCustom, setShowCustom] = useState(periodo === 'custom');

  const toggleCondicao = (val: string) => {
    if (!setCondicoes) return;
    setCondicoes(condicoes.includes(val) ? condicoes.filter(v => v !== val) : [...condicoes, val]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3">
      {showCondicao && setCondicoes && (
        <>
          <div className="flex items-center gap-1">
            {CONDICAO_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => toggleCondicao(opt.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium border transition ${
                  condicoes.includes(opt.value)
                    ? 'bg-blue-600/15 text-blue-400 border-blue-600/30'
                    : 'bg-transparent text-content-muted border-transparent hover:text-content-secondary'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-content-muted/20 text-[10px]">│</span>
        </>
      )}
      <div className="flex items-center gap-1 ml-auto">
        {PERIODO_OPTIONS.filter(o => o.value !== 'custom').map(opt => (
          <button key={opt.value} onClick={() => { setPeriodo(opt.value); setShowCustom(false); }}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
              periodo === opt.value ? 'bg-green-600/20 text-green-400' : 'text-content-muted hover:text-content-secondary'
            }`}>
            {opt.label}
          </button>
        ))}
        <button onClick={() => { setShowCustom(!showCustom); if (!showCustom) setPeriodo('custom'); }}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition flex items-center gap-0.5 ${
            periodo === 'custom' ? 'bg-green-600/20 text-green-400' : 'text-content-muted hover:text-content-secondary'
          }`}>
          <Calendar size={10} /> Período
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-1.5 w-full mt-1">
          <div className="ml-auto flex items-center gap-1">
            <input type="date" value={customInicio} onChange={e => { setCustomInicio?.(e.target.value); setPeriodo('custom'); }}
              className="rounded border border-border-subtle bg-elevated px-1.5 py-0.5 text-[10px] text-content focus:outline-none focus:border-green-600/30 w-[7rem]" />
            <span className="text-[9px] text-content-muted">até</span>
            <input type="date" value={customFim} onChange={e => { setCustomFim?.(e.target.value); setPeriodo('custom'); }}
              className="rounded border border-border-subtle bg-elevated px-1.5 py-0.5 text-[10px] text-content focus:outline-none focus:border-green-600/30 w-[7rem]" />
          </div>
        </div>
      )}
    </div>
  );
}

interface LegendaSeletorProps {
  items: string[];
  selected: string[];
  setSelected: (s: string[]) => void;
  label?: string;
  defaultAllVisible?: boolean;
}

export function LegendaSeletor({ items, selected, setSelected, label = 'Modelos', defaultAllVisible = true }: LegendaSeletorProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 8);

  const toggle = (item: string) => {
    setSelected(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };

  if (items.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-content-muted">{label}</span>
        <div className="flex gap-1">
          <button onClick={() => setSelected(items)} className="text-[9px] text-content-muted hover:text-content-secondary">todos</button>
          <button onClick={() => setSelected([])} className="text-[9px] text-content-muted hover:text-content-secondary">nenhum</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {visibleItems.map(item => (
          <button key={item} onClick={() => toggle(item)}
            className={`rounded px-1.5 py-0.5 text-[10px] transition ${
              selected.includes(item) ? 'bg-blue-600/15 text-blue-400 border border-blue-600/30' : 'text-content-muted border border-transparent hover:text-content-secondary'
            }`}>
            {item}
          </button>
        ))}
        {items.length > 8 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[9px] text-content-muted hover:text-content-secondary flex items-center gap-0.5">
            {expanded ? <><ChevronUp size={10} /> menos</> : <><ChevronDown size={10} /> +{items.length - 8}</>}
          </button>
        )}
      </div>
    </div>
  );
}
