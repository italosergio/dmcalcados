import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Plus, Trash2, Undo2, Receipt, UserCircle, Fuel, UtensilsCrossed, BedDouble, ImageIcon, ImageOff, X, Wrench, HelpCircle, Calendar, LayoutGrid, List, FileText, Pencil, MoreVertical, type LucideIcon } from 'lucide-react';
import { auth } from '~/services/firebase';
import { ImageLightbox } from '~/components/common/ImageLightbox';
import { Card } from '~/components/common/Card';
import { useDespesas, useUsers } from '~/hooks/useRealtime';
import { getTiposDespesa } from '~/services/despesas.service';
import { getIconeForTipo, DespesaForm } from '~/components/despesas/DespesaForm';
import { formatCurrency, formatDate } from '~/utils/format';
import type { Despesa } from '~/models';

type Periodo = 'hoje' | '7dias' | '30dias' | '60dias' | 'mes' | 'ano' | 'tudo';
const inputCls = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

export default function DespesasPage() {
  const { despesas, loading: despesasLoading } = useDespesas();
  const { users } = useUsers();
  const userNomeMap = new Map(users.map(u => [u.uid || u.id, u.nome]));
  const resolveUser = (id: string, fallback: string) => userNomeMap.get(id) || fallback;
  const [HC, setHC] = useState<any>(null);
  const [HCReact, setHCReact] = useState<any>(null);
  useEffect(() => {
    import('highcharts').then(m => setHC(m.default));
    import('highcharts-react-official').then(m => setHCReact(() => m.default));
  }, []);
  const [tiposMeta, setTiposMeta] = useState<{ nome: string; icone?: string }[]>([]);
  const [tiposLoading, setTiposLoading] = useState(true);
  const loading = despesasLoading || tiposLoading;
  const [periodo, setPeriodo] = useState<Periodo>('30dias');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);
  const [filtroCaixa, setFiltroCaixa] = useState<'' | 'caixa_interno' | 'caixa_externo'>('');
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [imagemAberta, setImagemAberta] = useState<string | null>(null);
  const [despesaSelecionada, setDespesaSelecionada] = useState<Despesa | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [criandoDespesa, setCriandoDespesa] = useState(false);
  const [novaDespesaData, setNovaDespesaData] = useState<string | undefined>();
  const [editando, setEditando] = useState(false);
  const [editValor, setEditValor] = useState('');
  const [editData, setEditData] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFonte, setEditFonte] = useState<string>('caixa_interno');
  const [editValorInterno, setEditValorInterno] = useState('');
  const [editValorExterno, setEditValorExterno] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editTipoOutro, setEditTipoOutro] = useState('');
  const [editImagem, setEditImagem] = useState<File | null>(null);
  const [editImagemPreview, setEditImagemPreview] = useState<string | null>(null);
  const [editRateioIds, setEditRateioIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [tiposDespesa, setTiposDespesa] = useState<{ key: string; nome: string }[]>([]);
  const novaDespesaBtnRef = useRef<HTMLButtonElement>(null);
  const despesaModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getTiposDespesa().then(t => setTiposDespesa(t)); }, []);

  useEffect(() => {
    if (!criandoDespesa) return;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      despesaModalRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([class*="X"])')?.focus();
    }, 50);
    return () => { document.body.style.overflow = ''; clearTimeout(t); };
  }, [criandoDespesa]);
  const fecharCriandoDespesa = useCallback(() => {
    setCriandoDespesa(false);
    setNovaDespesaData(undefined);
    setTimeout(() => novaDespesaBtnRef.current?.focus(), 50);
  }, []);
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('despesas-view') as 'cards' | 'tabela') || 'cards';
    return 'cards';
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Ler período da URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const p = params.get('periodo');
    if (p && ['hoje', '7dias', '30dias', '60dias', 'mes', 'ano', 'tudo'].includes(p)) {
      setPeriodo(p as Periodo);
    }
    const novaData = params.get('novaData');
    if (novaData) { setNovaDespesaData(novaData); setCriandoDespesa(true); }
  }, [location.search]);

  const changeViewMode = (mode: 'cards' | 'tabela') => {
    setViewMode(mode);
    localStorage.setItem('despesas-view', mode);
  };

  useEffect(() => {
    getTiposDespesa().then(t => {
      setTiposMeta(t.map(x => ({ nome: x.nome, icone: x.icone })));
    }).finally(() => setTiposLoading(false));
    import('~/services/auth.service').then(m => {
      const uid = auth.currentUser?.uid;
      if (uid) m.getUserData(uid).then(u => { if (u) setCurrentUserNome(u.nome); });
    });
  }, []);

  const [currentUserNome, setCurrentUserNome] = useState('');

  // Limpar loading quando dados atualizam
  useEffect(() => {
    setActionLoading({});
  }, [despesas]);

  // Sincronizar modal com dados realtime
  useEffect(() => {
    if (!despesaSelecionada) return;
    const atualizada = despesas.find(d => d.id === despesaSelecionada.id);
    if (atualizada) setDespesaSelecionada(atualizada);
  }, [despesas]);

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const handleDelete = useCallback((id: string) => {
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers.current[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      setActionLoading(prev => ({ ...prev, [id]: true }));
      import('~/services/despesas.service').then(m => m.deleteDespesa(id));
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers.current[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  }, [deleteClicks, currentUserNome]);

  const deleteLabel = (id: string) => {
    const clicks = deleteClicks[id] || 0;
    if (clicks === 0) return 'Apagar';
    if (clicks === 1) return 'Tem certeza?';
    return 'Confirmar!';
  };

  const handleRestore = useCallback((id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    import('~/services/despesas.service').then(m => m.restoreDespesa(id));
  }, []);

  // Filtro
  const filtered = despesas.filter(d => {
    // Período
    if (periodo !== 'tudo' && !filtroDataInicio && !filtroDataFim) {
      const agora = new Date();
      const inicio = new Date();
      if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0);
      else if (periodo === '7dias') inicio.setDate(agora.getDate() - 7);
      else if (periodo === '30dias') inicio.setDate(agora.getDate() - 30);
      else if (periodo === '60dias') inicio.setDate(agora.getDate() - 60);
      else if (periodo === 'mes') { inicio.setDate(1); inicio.setHours(0, 0, 0, 0); }
      else if (periodo === 'ano') inicio.setFullYear(agora.getFullYear(), 0, 1);
      if (new Date(d.data) < inicio) return false;
    }
    if (filtroDataInicio && new Date(d.data) < new Date(filtroDataInicio + 'T00:00:00')) return false;
    if (filtroDataFim && new Date(d.data) > new Date(filtroDataFim + 'T23:59:59')) return false;
    if (filtroTipos.length > 0 && !filtroTipos.includes(d.tipo)) return false;
    if (filtroCaixa) {
      const fp = (d as any).fontePagamento;
      if (filtroCaixa === 'caixa_interno' && fp === 'caixa_externo') return false;
      if (filtroCaixa === 'caixa_externo' && fp !== 'caixa_externo') return false;
    }
    return true;
  });

  const totalDespesas = filtered.filter((d: any) => !d.deletedAt).reduce((sum, d) => sum + d.valor, 0);
  const activeFiltered = filtered.filter((d: any) => !d.deletedAt);
  const ALIMENTACAO_TIPOS = ['Alimentação', 'Café da Manhã', 'Almoço', 'Janta', 'Lanche'];
  const totalCombustivel = activeFiltered.filter(d => d.tipo === 'Combustível').reduce((s, d) => s + d.valor, 0);
  const totalAlimentacao = activeFiltered.filter(d => ALIMENTACAO_TIPOS.includes(d.tipo)).reduce((s, d) => s + d.valor, 0);
  const totalHospedagem = activeFiltered.filter(d => d.tipo === 'Hospedagem' || d.tipo === 'Hotel').reduce((s, d) => s + d.valor, 0);
  const totalManutencao = activeFiltered.filter(d => d.tipo === 'Manutenção').reduce((s, d) => s + d.valor, 0);

  // Tipos para filtro: usa apenas os tipos cadastrados (ativos)
  const tiposCadastrados = tiposMeta.map(t => t.nome);
  const tiposUnicos = tiposCadastrados.length > 0
    ? tiposCadastrados.sort()
    : Array.from(new Set(despesas.map(d => d.tipo).filter(Boolean))).sort();

  const toggleTipo = (t: string) => {
    setFiltroTipos(prev => prev.includes(t) ? prev.filter(v => v !== t) : [...prev, t]);
  };

  const getTipoIcone = (tipo: string) => {
    const meta = tiposMeta.find(t => t.nome === tipo);
    const Ic = getIconeForTipo(tipo, meta?.icone);
    return Ic ? <Ic size={12} /> : null;
  };

  const periodoLabel = filtroDataInicio && filtroDataFim
    ? `de ${new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
    : filtroDataInicio
      ? `a partir de ${new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : filtroDataFim
        ? `até ${new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
        : { hoje: 'hoje', '7dias': 'últimos 7 dias', '30dias': 'últimos 30 dias', '60dias': 'últimos 60 dias', mes: 'do mês', ano: 'do ano', tudo: '' }[periodo];

  // Agrupar despesas por dia
  const despesasPorDia = (() => {
    const map: Record<string, Despesa[]> = {};
    activeFiltered.forEach(d => {
      const dia = new Date(d.data).toISOString().slice(0, 10);
      if (!map[dia]) map[dia] = [];
      map[dia].push(d);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).map(([dia, desps]) => {
      const total = desps.reduce((s, d) => s + d.valor, 0);
      const interno = desps.reduce((s, d) => {
        const fp = (d as any).fontePagamento;
        if (fp === 'misto') return s + ((d as any).valorInterno || 0);
        if (fp === 'caixa_externo') return s;
        return s + d.valor;
      }, 0);
      const externo = total - interno;
      // Agrupar por tipo para mini barras
      const porTipo: Record<string, number> = {};
      desps.forEach(d => { porTipo[d.tipo] = (porTipo[d.tipo] || 0) + d.valor; });
      const tipos = Object.entries(porTipo).sort(([, a], [, b]) => b - a);
      return { dia, despesas: desps, total, interno, externo, tipos };
    });
  })();

  return (
    <div className={viewMode === 'tabela' ? 'flex flex-col h-[calc(100vh-4rem)] overflow-hidden' : ''}>
      {/* Header: Botão + Cards */}
      <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3">
        <div className="flex items-center justify-between sm:contents">
          <button ref={novaDespesaBtnRef} onClick={() => setCriandoDespesa(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-95">
            <Plus size={18} /> Nova Despesa
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:contents">
          <Card onClick={() => setFiltroTipos([])} className={`col-span-2 sm:col-span-1 bg-gradient-to-r from-red-900/20 to-rose-900/20 border-red-800 !py-2 !px-2.5 sm:!px-3 sm:flex-1 sm:min-w-0 cursor-pointer transition-opacity ${filtroTipos.length > 0 ? 'opacity-50' : ''}`}>
            <p className="text-[10px] text-content-secondary font-medium leading-tight truncate">Total {periodoLabel}</p>
            <p className="text-xs sm:text-base font-bold text-red-400 leading-tight">{formatCurrency(totalDespesas)}</p>
            <p className="text-[10px] text-content-muted leading-tight">{filtered.length} despesa(s)</p>
          </Card>
          {totalCombustivel > 0 && (
            <Card onClick={() => setFiltroTipos(prev => prev.includes('Combustível') ? [] : ['Combustível'])}
              className={`cursor-pointer bg-gradient-to-r from-orange-900/20 to-amber-900/20 border-orange-800 !py-2 !px-2.5 sm:!px-3 transition-opacity ${filtroTipos.length > 0 && !filtroTipos.includes('Combustível') ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1 mb-0.5"><Fuel size={10} className="text-orange-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Combustível</p></div>
              <p className="text-xs sm:text-base font-bold text-orange-400 leading-tight">{formatCurrency(totalCombustivel)}</p>
            </Card>
          )}
          {totalAlimentacao > 0 && (
            <Card onClick={() => setFiltroTipos(prev => prev.some(t => ALIMENTACAO_TIPOS.includes(t)) ? [] : [...ALIMENTACAO_TIPOS])}
              className={`cursor-pointer bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border-yellow-800 !py-2 !px-2.5 sm:!px-3 transition-opacity ${filtroTipos.length > 0 && !filtroTipos.some(t => ALIMENTACAO_TIPOS.includes(t)) ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1 mb-0.5"><UtensilsCrossed size={10} className="text-yellow-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Alimentação</p></div>
              <p className="text-xs sm:text-base font-bold text-yellow-400 leading-tight">{formatCurrency(totalAlimentacao)}</p>
            </Card>
          )}
          {totalHospedagem > 0 && (
            <Card onClick={() => setFiltroTipos(prev => prev.includes('Hospedagem') || prev.includes('Hotel') ? [] : ['Hospedagem', 'Hotel'])}
              className={`cursor-pointer bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-purple-800 !py-2 !px-2.5 sm:!px-3 transition-opacity ${filtroTipos.length > 0 && !filtroTipos.includes('Hospedagem') && !filtroTipos.includes('Hotel') ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1 mb-0.5"><BedDouble size={10} className="text-purple-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Hospedagem</p></div>
              <p className="text-xs sm:text-base font-bold text-purple-400 leading-tight">{formatCurrency(totalHospedagem)}</p>
            </Card>
          )}
          {totalManutencao > 0 && (
            <Card onClick={() => setFiltroTipos(prev => prev.includes('Manutenção') ? [] : ['Manutenção'])}
              className={`cursor-pointer bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border-cyan-800 !py-2 !px-2.5 sm:!px-3 transition-opacity ${filtroTipos.length > 0 && !filtroTipos.includes('Manutenção') ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1 mb-0.5"><Wrench size={10} className="text-cyan-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Manutenção</p></div>
              <p className="text-xs sm:text-base font-bold text-cyan-400 leading-tight">{formatCurrency(totalManutencao)}</p>
            </Card>
          )}
          {/* Cards dinâmicos para outros tipos */}
          {(() => {
            const tiposFixos = new Set([...ALIMENTACAO_TIPOS, 'Combustível', 'Hospedagem', 'Hotel', 'Manutenção']);
            const outros = new Map<string, number>();
            activeFiltered.forEach(d => {
              if (!tiposFixos.has(d.tipo)) outros.set(d.tipo, (outros.get(d.tipo) || 0) + d.valor);
            });
            return [...outros.entries()].filter(([, v]) => v > 0).map(([tipo, total]) => (
              <Card key={tipo} onClick={() => setFiltroTipos(prev => prev.includes(tipo) ? [] : [tipo])}
                className={`cursor-pointer bg-gradient-to-r from-slate-900/20 to-gray-900/20 border-border-subtle !py-2 !px-2.5 sm:!px-3 transition-opacity ${filtroTipos.length > 0 && !filtroTipos.includes(tipo) ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-1 mb-0.5">
                  {getTipoIcone(tipo)}
                  <p className="text-[10px] text-content-secondary font-medium leading-tight truncate">{tipo}</p>
                </div>
                <p className="text-xs sm:text-base font-bold text-content leading-tight">{formatCurrency(total)}</p>
              </Card>
            ));
          })()}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {([
            { value: 'hoje', label: 'Hoje' },
            { value: '7dias', label: '7 dias' },
            { value: '30dias', label: '30 dias' },
            { value: '60dias', label: '60 dias' },
            { value: 'mes', label: 'Mês' },
            { value: 'ano', label: 'Ano' },
            { value: 'tudo', label: 'Tudo' },
          ] as { value: Periodo; label: string }[]).map(opt => (
            <button key={opt.value} onClick={() => { setPeriodo(opt.value); setFiltroDataInicio(''); setFiltroDataFim(''); }}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition whitespace-nowrap ${
                periodo === opt.value && !filtroDataInicio && !filtroDataFim
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-elevated text-content-secondary hover:bg-border-medium'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <input type="date" value={filtroDataInicio} onChange={(e) => { setFiltroDataInicio(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
            className={`rounded-md border bg-elevated px-1.5 py-1 text-[10px] focus:outline-none focus:border-border-medium w-[6.5rem] transition-colors ${filtroDataInicio ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
          <span className="text-[10px] text-content-muted">até</span>
          <input type="date" value={filtroDataFim} onChange={(e) => { setFiltroDataFim(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
            className={`rounded-md border bg-elevated px-1.5 py-1 text-[10px] focus:outline-none focus:border-border-medium w-[6.5rem] transition-colors ${filtroDataFim ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        </div>

        {tiposUnicos.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tiposUnicos.map(t => (
                <button key={t} onClick={() => toggleTipo(t)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium border transition flex items-center gap-1 whitespace-nowrap ${
                    filtroTipos.includes(t) ? 'bg-red-600/10 text-red-400 border-red-600/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'
                  }`}>
                  {getTipoIcone(t)}
                  {t}
                </button>
              ))}
              {filtroTipos.length > 0 && (
                <button onClick={() => setFiltroTipos([])} className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition whitespace-nowrap">
                  <Trash2 size={10} /> Limpar
                </button>
              )}
            </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setFiltroCaixa(filtroCaixa === 'caixa_interno' ? '' : 'caixa_interno')}
            className={`rounded-md px-2 py-1 text-[10px] font-medium border transition whitespace-nowrap ${filtroCaixa === 'caixa_interno' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'}`}>
            💵 Interno
          </button>
          <button onClick={() => setFiltroCaixa(filtroCaixa === 'caixa_externo' ? '' : 'caixa_externo')}
            className={`rounded-md px-2 py-1 text-[10px] font-medium border transition whitespace-nowrap ${filtroCaixa === 'caixa_externo' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'}`}>
            🏦 Externo
          </button>
        </div>
        <div className="ml-auto flex items-center bg-elevated rounded-lg p-0.5">
          <button onClick={() => changeViewMode('cards')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}
            aria-label="Visualizar como cards">
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => changeViewMode('tabela')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'tabela' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}
            aria-label="Visualizar como tabela">
            <List size={16} />
          </button>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && filtroTipos.length === 0 && !filtroDataInicio && !filtroDataFim && despesas.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Receipt size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhuma despesa registrada</p>
          <p className="mb-6 text-sm text-content-muted">Comece registrando sua primeira despesa</p>
          <button onClick={() => setCriandoDespesa(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-95">
            <Plus size={20} /> Registrar Primeira Despesa
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && filtroTipos.length === 0 && !filtroDataInicio && !filtroDataFim && despesas.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <Receipt size={40} className="mx-auto mb-3 text-content-muted opacity-40" />
          <p className="mb-2 text-sm sm:text-base font-medium">Nenhuma despesa registrada {periodo === 'hoje' ? 'hoje' : periodo === '7dias' ? 'nos últimos 7 dias' : periodo === '30dias' ? 'nos últimos 30 dias' : periodo === '60dias' ? 'nos últimos 60 dias' : periodo === 'mes' ? 'neste mês' : 'no ano'}</p>
          <button onClick={() => setPeriodo('tudo')}
            className="rounded-lg border border-border-subtle bg-elevated px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
            Ver todas as despesas
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && (filtroTipos.length > 0 || filtroDataInicio || filtroDataFim || filtroCaixa) && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <p className="mb-2 text-sm sm:text-base">Nenhuma despesa encontrada com os filtros</p>
          <button onClick={() => { setFiltroTipos([]); setFiltroCaixa(''); setFiltroDataInicio(''); setFiltroDataFim(''); setPeriodo('tudo'); }}
            className="rounded-lg border border-border-subtle bg-elevated px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
            Limpar Filtros
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {despesasPorDia.map(({ dia, despesas: desps, total, interno, externo, tipos }) => {
            const label = new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
            const TIPO_CORES: Record<string, string> = {
              'Combustível': '#f59e0b', 'Alimentação': '#fb923c', 'Café da Manhã': '#fdba74', 'Almoço': '#f97316', 'Janta': '#ea580c', 'Lanche': '#fed7aa',
              'Hospedagem': '#8b5cf6', 'Hotel': '#a78bfa', 'Manutenção': '#3b82f6', 'Pedágio': '#6366f1', 'Estacionamento': '#818cf8',
            };
            const corTipo = (t: string) => TIPO_CORES[t] || '#ef4444';
            const chartOpts = HC ? {
              chart: { type: 'bar', height: tipos.length * 24 + 20, backgroundColor: 'transparent', margin: [0, 0, 0, 0], spacing: [2, 4, 2, 4] },
              title: { text: undefined },
              xAxis: { categories: tipos.map(([t]) => t), labels: { style: { fontSize: '8px', color: '#a0a0a8' } }, lineWidth: 0, tickLength: 0 },
              yAxis: { visible: false },
              legend: { enabled: false },
              credits: { enabled: false },
              tooltip: { style: { fontSize: '10px' }, formatter: function(this: any) { return `${this.point.category}: ${formatCurrency(this.y)}`; } },
              plotOptions: { bar: { borderWidth: 0, borderRadius: 2, dataLabels: { enabled: true, align: 'left' as const, x: 4, style: { fontSize: '7px', color: '#f0f0f2', textOutline: 'none' }, overflow: 'allow' as const, crop: false, formatter: function(this: any) { return formatCurrency(this.y); } } } },
              series: [{ data: tipos.map(([t, v]) => ({ y: v, color: corTipo(t) })), colorByPoint: true }],
            } as any : null;
            return (
              <div key={dia} onClick={() => setDiaSelecionado(dia)}
                className="rounded-xl border border-border-subtle bg-surface p-3 cursor-pointer transition-colors hover:border-border-medium aspect-square flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold">{label}</p>
                  <p className="text-[9px] text-content-muted">{desps.length}</p>
                </div>
                <p className="text-base font-bold text-red-400">{formatCurrency(total)}</p>
                <div className="flex items-center gap-2 mb-1">
                  {interno > 0 && <span className="text-[8px] text-green-400">💵 {formatCurrency(interno)}</span>}
                  {externo > 0 && <span className="text-[8px] text-blue-400">🏦 {formatCurrency(externo)}</span>}
                </div>
                <div className="flex-1 min-h-0">
                  {HC && HCReact && chartOpts && <HCReact highcharts={HC} options={chartOpts} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && viewMode === 'tabela' && (
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-elevated/95 backdrop-blur-sm">
                <tr className="border-b border-border-subtle">
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Tipo</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Usuário</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Descrição</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Valor</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(despesa => (
                  <tr key={despesa.id} onClick={() => setDespesaSelecionada(despesa)} className={`cursor-pointer transition-colors ${ (despesa as any).deletedAt ? 'bg-red-950/20 opacity-70 hover:opacity-90' : 'hover:bg-surface-hover' }`}>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs">{getTipoIcone(despesa.tipo)} {despesa.tipo}</span>
                      {(despesa as any).fontePagamento && (
                        <span className={`ml-1 text-[9px] px-1 py-0.5 rounded inline-flex items-center gap-0.5 ${(despesa as any).fontePagamento === 'caixa_externo' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                          {(despesa as any).fontePagamento === 'caixa_externo' ? '🏦' : '💵'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-content-secondary truncate max-w-[120px] hidden sm:table-cell">{resolveUser(despesa.usuarioId, despesa.usuarioNome)}</td>
                    <td className="px-3 py-2 text-[11px] text-content-muted truncate max-w-[160px] hidden sm:table-cell">{despesa.descricao || '—'}</td>
                    <td className={`px-3 py-2 text-xs font-semibold text-right whitespace-nowrap ${ (despesa as any).deletedAt ? 'text-red-400 line-through' : 'text-red-400' }`}>{formatCurrency(despesa.valor)}</td>
                    <td className="px-3 py-2 text-[11px] text-content-muted text-right whitespace-nowrap">{formatDate(new Date(despesa.data))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {imagemAberta && <ImageLightbox src={imagemAberta} onClose={() => setImagemAberta(null)} />}

      {/* Modal dia */}
      {diaSelecionado && (() => {
        const desps = activeFiltered.filter(d => new Date(d.data).toISOString().slice(0, 10) === diaSelecionado);
        const totalDia = desps.reduce((s, d) => s + d.valor, 0);
        const internoDia = desps.reduce((s, d) => { const fp = (d as any).fontePagamento; if (fp === 'misto') return s + ((d as any).valorInterno || 0); if (fp === 'caixa_externo') return s; return s + d.valor; }, 0);
        const externoDia = totalDia - internoDia;
        const label = new Date(diaSelecionado + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => setDiaSelecionado(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <div>
                  <p className="text-sm font-semibold capitalize">{label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-400">{formatCurrency(totalDia)}</span>
                    {internoDia > 0 && <span className="text-[9px] text-green-400">💵 {formatCurrency(internoDia)}</span>}
                    {externoDia > 0 && <span className="text-[9px] text-blue-400">🏦 {formatCurrency(externoDia)}</span>}
                  </div>
                </div>
                <button onClick={() => setDiaSelecionado(null)} className="text-content-muted hover:text-content"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-2">
                {desps.map(d => (
                  <div key={d.id} onClick={() => { setDiaSelecionado(null); setDespesaSelecionada(d); }}
                    className="rounded-lg bg-elevated p-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-border-medium transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          {getTipoIcone(d.tipo)} {d.tipo}
                        </span>
                        {(() => {
                          const fp = (d as any).fontePagamento;
                          if (fp === 'caixa_externo') return <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">🏦</span>;
                          if (fp === 'misto') return <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400">💵🏦</span>;
                          return null;
                        })()}
                      </div>
                      <p className="text-[10px] text-content-muted">{resolveUser(d.usuarioId, d.usuarioNome)}</p>
                      {d.descricao && <p className="text-[10px] text-content-secondary mt-0.5 truncate">{d.descricao}</p>}
                    </div>
                    <span className="text-sm font-bold text-red-400 shrink-0">{formatCurrency(d.valor)}</span>
                  </div>
                ))}
                <button onClick={() => { setDiaSelecionado(null); setNovaDespesaData(diaSelecionado); setCriandoDespesa(true); }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle py-2.5 text-xs text-content-muted hover:bg-elevated transition">
                  <Plus size={14} /> Adicionar despesa
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {despesaSelecionada && (() => {
        const d = despesaSelecionada;
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => { setDespesaSelecionada(null); setMenuOpen(false); }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
                <span className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                  {getTipoIcone(d.tipo)}
                  {d.tipo}
                </span>
                <div className="flex items-center gap-1">
                  {!(d as any).deletedAt && (
                    <div className="relative">
                      <button onClick={() => setMenuOpen(!menuOpen)} className="text-content-muted hover:text-content p-1 rounded-lg hover:bg-elevated transition-colors"><MoreVertical size={18} /></button>
                      {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border-subtle bg-elevated shadow-xl z-10 py-1">
                          <button onClick={() => {
                            setMenuOpen(false); setEditando(true);
                            setEditValor(String(d.valor));
                            setEditData(new Date(d.data).toISOString().slice(0, 10));
                            setEditDescricao(d.descricao || '');
                            setEditFonte((d as any).fontePagamento || 'caixa_interno');
                            setEditValorInterno(String((d as any).valorInterno || ''));
                            setEditValorExterno(String((d as any).valorExterno || ''));
                            setEditTipo(d.tipo);
                            setEditImagem(null);
                            setEditImagemPreview((d as any).imagensUrls?.[0] || (d as any).imagemUrl || null);
                            setEditRateioIds((d.rateio || []).map((r: any) => r.usuarioId));
                          }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-content hover:bg-surface-hover transition-colors">
                            <Pencil size={13} /> Editar despesa
                          </button>
                          <button onClick={() => { setMenuOpen(false); handleDelete(d.id); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                              (deleteClicks[d.id] || 0) === 0 ? 'text-red-500 hover:bg-surface-hover'
                              : (deleteClicks[d.id] || 0) === 1 ? 'text-red-400 bg-red-500/10' : 'text-red-300 bg-red-600/20'
                            }`}>
                            <Trash2 size={13} /> {actionLoading[d.id] ? 'Aguarde...' : deleteLabel(d.id)}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => { setDespesaSelecionada(null); setMenuOpen(false); }} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-2xl font-bold text-red-400">{formatCurrency(d.valor)}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Data</span></div>
                    <p className="text-xs font-semibold">{formatDate(new Date(d.data))}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><UserCircle size={12} /><span className="text-[10px]">Registrado por</span></div>
                    <p className="text-xs font-semibold">{resolveUser(d.usuarioId, d.usuarioNome)}</p>
                    {d.rateio && d.rateio.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[10px] text-content-muted">Inclui também: <span className="text-blue-400">{d.rateio.map(r => resolveUser(r.usuarioId, r.usuarioNome)).join(', ')}</span></p>
                      </div>
                    )}
                  </div>
                </div>
                {d.descricao && (
                  <div className="rounded-lg bg-elevated p-2.5">
                    <p className="text-[10px] text-content-muted mb-0.5">Descrição</p>
                    <p className="text-xs">{d.descricao}</p>
                  </div>
                )}
                {((d as any).imagensUrls?.length > 0 || (d as any).imagemUrl) && (
                  <div>
                    <p className="text-[10px] text-content-muted mb-1.5">Comprovante{(d as any).imagensUrls?.length > 1 ? 's' : ''}</p>
                    <div className="flex gap-2 flex-wrap">
                      {((d as any).imagensUrls || [(d as any).imagemUrl]).filter(Boolean).map((url: string, i: number) => (
                        <img key={i} src={url} alt={`Comprovante ${i + 1}`} className="rounded-lg border border-border-subtle max-h-48 object-contain cursor-pointer hover:opacity-80 transition"
                          onClick={() => { setDespesaSelecionada(null); setImagemAberta(url); }} />
                      ))}
                    </div>
                  </div>
                )}
                {(d as any).semImagemJustificativa && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5">
                    <div className="flex items-center gap-1.5 text-red-400 mb-0.5"><ImageOff size={12} /><span className="text-[10px] font-medium">Sem comprovante</span></div>
                    <p className="text-xs text-red-300">{(d as any).semImagemJustificativa}</p>
                  </div>
                )}
                <p className="text-[10px] text-content-muted text-center">Registrado em {new Date(d.createdAt).toLocaleString('pt-BR')}</p>

                {(d as any).deletedAt && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center">
                    <p className="text-xs text-red-400 font-medium">Despesa apagada</p>
                    {(d as any).deletedByNome && (
                      <p className="text-[10px] text-red-400/70 mt-0.5">por {(d as any).deletedByNome} em {new Date((d as any).deletedAt).toLocaleString('pt-BR')}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRestore(d.id)}
                      disabled={actionLoading[d.id]}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                    >
                      <Undo2 size={13} />
                      {actionLoading[d.id] ? 'Aguarde...' : 'Desfazer exclusão'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {criandoDespesa && (
        <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={fecharCriandoDespesa}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div ref={despesaModalRef} className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
              <span className="text-sm font-semibold">Nova Despesa</span>
              <button onClick={fecharCriandoDespesa} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5">
              <DespesaForm onClose={fecharCriandoDespesa} dataInicial={novaDespesaData} />
            </div>
          </div>
        </div>
      )}

      {/* Modal editar despesa */}
      {editando && despesaSelecionada && (
        <div className="fixed inset-0 lg:left-64 z-[110] flex items-center justify-center p-4" onClick={() => setEditando(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
              <span className="text-sm font-semibold">Editar Despesa</span>
              <button onClick={() => setEditando(false)} className="text-content-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-content-muted mb-1 block">Tipo</label>
                <select value={editTipo} onChange={e => setEditTipo(e.target.value)} className={inputCls}>
                  {!tiposDespesa.some(t => t.nome === editTipo) && editTipo && editTipo !== '__outro__' && <option value={editTipo}>{editTipo}</option>}
                  {tiposDespesa.map(t => <option key={t.key} value={t.nome}>{t.nome}</option>)}
                  <option value="__outro__">Outro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-content-muted mb-1 block">Valor</label>
                  <input type="number" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-content-muted mb-1 block">Data</label>
                  <input type="date" value={editData} onChange={e => setEditData(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Descrição {editTipo === '__outro__' ? '(obrigatória)' : ''}</label>
                <input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} className={`${inputCls} ${editTipo === '__outro__' && !editDescricao.trim() ? 'border-red-500/50' : ''}`} placeholder={editTipo === '__outro__' ? 'Descreva a despesa...' : 'Opcional'} />
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1.5 block">Pago com</label>
                <div className="flex gap-2">
                  {([['caixa_interno', 'Interno'], ['caixa_externo', 'Externo'], ['misto', 'Misto']] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setEditFonte(v)}
                      className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${editFonte === v ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {editFonte === 'misto' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[9px] text-content-muted">Caixa interno</label>
                      <input type="number" step="0.01" min="0" value={editValorInterno} className={inputCls} placeholder="0,00"
                        onChange={e => { setEditValorInterno(e.target.value); setEditValorExterno(String(Math.max(0, (parseFloat(editValor) || 0) - (parseFloat(e.target.value) || 0)).toFixed(2))); }} />
                    </div>
                    <div>
                      <label className="text-[9px] text-content-muted">Caixa externo</label>
                      <input type="number" step="0.01" min="0" value={editValorExterno} className={inputCls} placeholder="0,00"
                        onChange={e => { setEditValorExterno(e.target.value); setEditValorInterno(String(Math.max(0, (parseFloat(editValor) || 0) - (parseFloat(e.target.value) || 0)).toFixed(2))); }} />
                    </div>
                  </div>
                )}
              </div>
              {/* Pessoas incluídas */}
              <div>
                <label className="text-xs text-content-muted mb-1 block">Pessoas incluídas</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editRateioIds.map(uid => {
                    const u = users.find(x => (x.uid || x.id) === uid);
                    return (
                      <span key={uid} className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-lg">
                        {u?.nome || uid}
                        <button type="button" onClick={() => setEditRateioIds(prev => prev.filter(x => x !== uid))} className="hover:text-red-400"><X size={12} /></button>
                      </span>
                    );
                  })}
                </div>
                <select value="" onChange={e => { if (e.target.value && !editRateioIds.includes(e.target.value)) setEditRateioIds([...editRateioIds, e.target.value]); }} className={inputCls}>
                  <option value="">Adicionar pessoa...</option>
                  {users.filter(u => !u.deletedAt && (u.uid || u.id) !== despesaSelecionada.usuarioId && !editRateioIds.includes(u.uid || u.id)).map(u => (
                    <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Comprovante</label>
                {editImagemPreview && (
                  <div className="relative mb-2">
                    <img src={editImagemPreview} alt="Comprovante" className="rounded-lg border border-border-subtle max-h-32 object-contain w-full" />
                  </div>
                )}
                <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle bg-elevated py-2 text-xs text-content-muted cursor-pointer hover:bg-border-medium transition-colors">
                  <ImageIcon size={14} /> {editImagemPreview ? 'Trocar imagem' : 'Adicionar comprovante'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setEditImagem(file);
                    const reader = new FileReader();
                    reader.onload = ev => setEditImagemPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setEditando(false)}
                  className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-xs font-medium text-content-secondary hover:bg-border-medium transition">Cancelar</button>
                <button disabled={editSaving || (editTipo === '__outro__' && !editDescricao.trim())} onClick={async () => {
                  setEditSaving(true);
                  try {
                    const { updateDespesa } = await import('~/services/despesas.service');
                    let imagemUrl = (despesaSelecionada as any).imagensUrls?.[0] || (despesaSelecionada as any).imagemUrl;
                    if (editImagem) {
                      const { uploadImage } = await import('~/services/cloudinary.service');
                      imagemUrl = await uploadImage(editImagem, 'despesas');
                    }
                    await updateDespesa(despesaSelecionada.id, {
                      tipo: editTipo === '__outro__' ? 'Outro' : editTipo,
                      valor: parseFloat(editValor) || despesaSelecionada.valor,
                      data: new Date(editData + 'T12:00:00') as any,
                      descricao: editDescricao.trim() || null,
                      fontePagamento: editFonte || 'caixa_interno',
                      ...(editFonte === 'misto' ? { valorInterno: parseFloat(editValorInterno) || 0, valorExterno: parseFloat(editValorExterno) || 0 } : { valorInterno: null, valorExterno: null }),
                      ...(imagemUrl ? { imagemUrl, imagensUrls: [imagemUrl] } : {}),
                      rateio: editRateioIds.length > 0
                        ? editRateioIds.map(uid => { const u = users.find(x => (x.uid || x.id) === uid); return { usuarioId: uid, usuarioNome: u?.nome || uid, valor: parseFloat(((parseFloat(editValor) || 0) / (editRateioIds.length + 1)).toFixed(2)) }; })
                        : null,
                    } as any);
                  } finally {
                    setEditSaving(false);
                    setEditando(false);
                    setDespesaSelecionada(null);
                  }
                }}
                  className="rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-30 transition">
                  {editSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
