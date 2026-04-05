import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Plus, Trash2, Undo2, Receipt, UserCircle, Fuel, UtensilsCrossed, BedDouble, ImageIcon, ImageOff, X, Wrench, HelpCircle, Calendar, LayoutGrid, List, FileText, type LucideIcon } from 'lucide-react';
import { auth } from '~/services/firebase';
import { ImageLightbox } from '~/components/common/ImageLightbox';
import { Card } from '~/components/common/Card';
import { useDespesas, useUsers } from '~/hooks/useRealtime';
import { getTiposDespesa } from '~/services/despesas.service';
import { getIconeForTipo } from '~/components/despesas/DespesaForm';
import { formatCurrency, formatDate } from '~/utils/format';
import type { Despesa } from '~/models';

type Periodo = 'hoje' | '7dias' | '30dias' | 'mes' | 'ano' | 'tudo';

export default function DespesasPage() {
  const { despesas, loading: despesasLoading } = useDespesas();
  const { users } = useUsers();
  const userNomeMap = new Map(users.map(u => [u.uid || u.id, u.nome]));
  const resolveUser = (id: string, fallback: string) => userNomeMap.get(id) || fallback;
  const [tiposMeta, setTiposMeta] = useState<{ nome: string; icone?: string }[]>([]);
  const [tiposLoading, setTiposLoading] = useState(true);
  const loading = despesasLoading || tiposLoading;
  const [periodo, setPeriodo] = useState<Periodo>('30dias');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [imagemAberta, setImagemAberta] = useState<string | null>(null);
  const [despesaSelecionada, setDespesaSelecionada] = useState<Despesa | null>(null);
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
    if (p && ['hoje', '7dias', '30dias', 'mes', 'ano', 'tudo'].includes(p)) {
      setPeriodo(p as Periodo);
    }
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
      else if (periodo === 'mes') { inicio.setDate(1); inicio.setHours(0, 0, 0, 0); }
      else if (periodo === 'ano') inicio.setFullYear(agora.getFullYear(), 0, 1);
      if (new Date(d.data) < inicio) return false;
    }
    if (filtroDataInicio && new Date(d.data) < new Date(filtroDataInicio + 'T00:00:00')) return false;
    if (filtroDataFim && new Date(d.data) > new Date(filtroDataFim + 'T23:59:59')) return false;
    if (filtroTipos.length > 0 && !filtroTipos.includes(d.tipo)) return false;
    return true;
  });

  const totalDespesas = filtered.filter((d: any) => !d.deletedAt).reduce((sum, d) => sum + d.valor, 0);
  const activeFiltered = filtered.filter((d: any) => !d.deletedAt);
  const totalCombustivel = activeFiltered.filter(d => d.tipo === 'Combustível').reduce((s, d) => s + d.valor, 0);
  const totalAlimentacao = activeFiltered.filter(d => d.tipo === 'Alimentação').reduce((s, d) => s + d.valor, 0);
  const totalHospedagem = activeFiltered.filter(d => d.tipo === 'Hospedagem').reduce((s, d) => s + d.valor, 0);
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
        : { hoje: 'hoje', '7dias': 'últimos 7 dias', '30dias': 'últimos 30 dias', mes: 'do mês', ano: 'do ano', tudo: '' }[periodo];

  return (
    <div className={viewMode === 'tabela' ? 'flex flex-col h-[calc(100vh-4rem)] overflow-hidden' : ''}>
      {/* Header: Botão + Cards */}
      <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3">
        <div className="flex items-center justify-between sm:contents">
          <button onClick={() => navigate('/despesas/nova')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-95">
            <Plus size={18} /> Nova Despesa
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:contents">
          <Card className="col-span-2 sm:col-span-1 bg-gradient-to-r from-red-900/20 to-rose-900/20 border-red-800 !py-2 !px-2.5 sm:!px-3 sm:flex-1 sm:min-w-0">
            <p className="text-[10px] text-content-secondary font-medium leading-tight truncate">Total {periodoLabel}</p>
            <p className="text-xs sm:text-base font-bold text-red-400 leading-tight">{formatCurrency(totalDespesas)}</p>
            <p className="text-[10px] text-content-muted leading-tight">{filtered.length} despesa(s)</p>
          </Card>
          {totalCombustivel > 0 && (
            <Card className="bg-gradient-to-r from-orange-900/20 to-amber-900/20 border-orange-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><Fuel size={10} className="text-orange-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Combustível</p></div>
              <p className="text-xs sm:text-base font-bold text-orange-400 leading-tight">{formatCurrency(totalCombustivel)}</p>
            </Card>
          )}
          {totalAlimentacao > 0 && (
            <Card className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border-yellow-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><UtensilsCrossed size={10} className="text-yellow-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Alimentação</p></div>
              <p className="text-xs sm:text-base font-bold text-yellow-400 leading-tight">{formatCurrency(totalAlimentacao)}</p>
            </Card>
          )}
          {totalHospedagem > 0 && (
            <Card className="bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-purple-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><BedDouble size={10} className="text-purple-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Hospedagem</p></div>
              <p className="text-xs sm:text-base font-bold text-purple-400 leading-tight">{formatCurrency(totalHospedagem)}</p>
            </Card>
          )}
          {totalManutencao > 0 && (
            <Card className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border-cyan-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><Wrench size={10} className="text-cyan-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Manutenção</p></div>
              <p className="text-xs sm:text-base font-bold text-cyan-400 leading-tight">{formatCurrency(totalManutencao)}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap lg:flex-nowrap items-center gap-2">
        {([
          { value: 'hoje', label: 'Hoje' },
          { value: '7dias', label: '7 dias' },
          { value: '30dias', label: '30 dias' },
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
        <span className="hidden lg:inline text-content-muted/30">│</span>
        <input type="date" value={filtroDataInicio} onChange={(e) => { setFiltroDataInicio(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
          className={`rounded-md border bg-elevated px-1.5 py-1 text-[10px] focus:outline-none focus:border-border-medium w-[6.5rem] transition-colors ${filtroDataInicio ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        <span className="text-[10px] text-content-muted">até</span>
        <input type="date" value={filtroDataFim} onChange={(e) => { setFiltroDataFim(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
          className={`rounded-md border bg-elevated px-1.5 py-1 text-[10px] focus:outline-none focus:border-border-medium w-[6.5rem] transition-colors ${filtroDataFim ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />

        {tiposUnicos.length > 0 && (
          <>
            <span className="hidden lg:inline text-content-muted/30">│</span>
            <div className="flex items-center gap-1 lg:gap-1 flex-wrap lg:flex-nowrap">
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
          </>
        )}
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
          <button onClick={() => navigate('/despesas/nova')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-95">
            <Plus size={20} /> Registrar Primeira Despesa
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && filtroTipos.length === 0 && !filtroDataInicio && !filtroDataFim && despesas.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <Receipt size={40} className="mx-auto mb-3 text-content-muted opacity-40" />
          <p className="mb-2 text-sm sm:text-base font-medium">Nenhuma despesa registrada {periodo === 'hoje' ? 'hoje' : periodo === '7dias' ? 'nos últimos 7 dias' : periodo === '30dias' ? 'nos últimos 30 dias' : periodo === 'mes' ? 'neste mês' : 'no ano'}</p>
          <button onClick={() => setPeriodo('tudo')}
            className="rounded-lg border border-border-subtle bg-elevated px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
            Ver todas as despesas
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && (filtroTipos.length > 0 || filtroDataInicio || filtroDataFim) && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <p className="mb-2 text-sm sm:text-base">Nenhuma despesa encontrada com os filtros</p>
          <button onClick={() => { setFiltroTipos([]); setFiltroDataInicio(''); setFiltroDataFim(''); setPeriodo('tudo'); }}
            className="rounded-lg border border-border-subtle bg-elevated px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
            Limpar Filtros
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div className="space-y-3">
          {filtered.map(despesa => (
            <div key={despesa.id} className={`rounded-xl border p-3 sm:p-4 cursor-pointer transition-colors ${ (despesa as any).deletedAt ? 'border-red-900/50 bg-red-950/20 opacity-70 hover:opacity-90' : 'border-border-subtle bg-surface hover:border-border-medium' }`} onClick={() => setDespesaSelecionada(despesa)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      {getTipoIcone(despesa.tipo)}
                      {despesa.tipo}
                    </span>
                    {((despesa as any).imagemUrl || (despesa as any).imagensUrls?.length) && (
                      <ImageIcon size={13} className="text-blue-400 shrink-0" />
                    )}
                    {!(despesa as any).imagemUrl && !(despesa as any).imagensUrls?.length && (despesa as any).semImagemJustificativa && (
                      <ImageOff size={13} className="text-red-400 shrink-0" />
                    )}
                    {despesa.descricao && (
                      <FileText size={13} className="text-content-muted/60 shrink-0" />
                    )}
                  </div>
                  {(despesa as any).deletedAt && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">Apagada</span>
                  )}
                  <p className={`text-lg sm:text-xl font-bold ${ (despesa as any).deletedAt ? 'text-red-400 line-through' : 'text-red-400' }`}>{formatCurrency(despesa.valor)}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-content-muted">
                    <UserCircle size={14} />
                    <span className="truncate">{resolveUser(despesa.usuarioId, despesa.usuarioNome)}</span>
                    {despesa.rateio && despesa.rateio.length > 0 && (
                      <span className="text-content-muted/60">· inclui {despesa.rateio.map(r => resolveUser(r.usuarioId, r.usuarioNome)).join(', ')}</span>
                    )}
                  </div>
                  {despesa.descricao && (
                    <p className="text-xs text-content-muted mt-0.5 truncate">{despesa.descricao}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-content-muted whitespace-nowrap">{formatDate(new Date(despesa.data))}</p>
                  <p className="text-[10px] text-content-muted/60 whitespace-nowrap">reg. {new Date(despesa.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
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

      {despesaSelecionada && (() => {
        const d = despesaSelecionada;
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => setDespesaSelecionada(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
                <span className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                  {getTipoIcone(d.tipo)}
                  {d.tipo}
                </span>
                <button onClick={() => setDespesaSelecionada(null)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
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

                {!(d as any).deletedAt && (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  disabled={actionLoading[d.id]}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                    actionLoading[d.id]
                      ? 'bg-elevated text-content-muted'
                      : (deleteClicks[d.id] || 0) === 0
                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        : (deleteClicks[d.id] || 0) === 1
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-red-600/30 text-red-300 hover:bg-red-600/40'
                  }`}
                >
                  <Trash2 size={14} />
                  {actionLoading[d.id] ? 'Aguarde...' : deleteLabel(d.id)}
                </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
