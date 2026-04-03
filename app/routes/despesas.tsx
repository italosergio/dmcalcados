import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Receipt, UserCircle, Fuel, UtensilsCrossed, BedDouble, ImageIcon, X, Wrench, HelpCircle, Calendar, type LucideIcon } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { getDespesas, getTiposDespesa } from '~/services/despesas.service';
import { getIconeForTipo } from '~/components/despesas/DespesaForm';
import { formatCurrency, formatDate } from '~/utils/format';
import type { Despesa } from '~/models';

type Periodo = 'hoje' | '7dias' | '30dias' | 'ano' | 'tudo';

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [tiposMeta, setTiposMeta] = useState<{ nome: string; icone?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [imagemAberta, setImagemAberta] = useState<string | null>(null);
  const [despesaSelecionada, setDespesaSelecionada] = useState<Despesa | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getDespesas(), getTiposDespesa()]).then(([d, t]) => {
      setDespesas(d);
      setTiposMeta(t.map(x => ({ nome: x.nome, icone: x.icone })));
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback((id: string) => {
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers.current[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      import('~/services/despesas.service').then(m => m.deleteDespesa(id)).then(() => {
        setDespesas(prev => prev.filter(d => d.id !== id));
      });
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers.current[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const deleteLabel = (id: string) => {
    const clicks = deleteClicks[id] || 0;
    if (clicks === 0) return 'Apagar';
    if (clicks === 1) return 'Tem certeza?';
    return 'Confirmar!';
  };

  // Filtro
  const filtered = despesas.filter(d => {
    // Período
    if (periodo !== 'tudo' && !filtroDataInicio && !filtroDataFim) {
      const agora = new Date();
      const inicio = new Date();
      if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0);
      else if (periodo === '7dias') inicio.setDate(agora.getDate() - 7);
      else if (periodo === '30dias') inicio.setDate(agora.getDate() - 30);
      else if (periodo === 'ano') inicio.setFullYear(agora.getFullYear(), 0, 1);
      if (new Date(d.data) < inicio) return false;
    }
    if (filtroDataInicio && new Date(d.data) < new Date(filtroDataInicio + 'T00:00:00')) return false;
    if (filtroDataFim && new Date(d.data) > new Date(filtroDataFim + 'T23:59:59')) return false;
    if (filtroTipos.length > 0 && !filtroTipos.includes(d.tipo)) return false;
    return true;
  });

  const totalDespesas = filtered.reduce((sum, d) => sum + d.valor, 0);
  const totalCombustivel = filtered.filter(d => d.tipo === 'Combustível').reduce((s, d) => s + d.valor, 0);
  const totalAlimentacao = filtered.filter(d => d.tipo === 'Alimentação').reduce((s, d) => s + d.valor, 0);
  const totalHospedagem = filtered.filter(d => d.tipo === 'Hospedagem').reduce((s, d) => s + d.valor, 0);
  const totalManutencao = filtered.filter(d => d.tipo === 'Manutenção').reduce((s, d) => s + d.valor, 0);

  // Tipos únicos para filtro
  const tiposUnicos = Array.from(new Set(despesas.map(d => d.tipo).filter(Boolean))).sort();

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
        : { hoje: 'hoje', '7dias': 'últimos 7 dias', '30dias': 'últimos 30 dias', ano: 'do ano', tudo: '' }[periodo];

  return (
    <div>
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
            <p className="text-base sm:text-2xl font-bold text-red-400 leading-tight">{formatCurrency(totalDespesas)}</p>
            <p className="text-[10px] text-content-muted leading-tight">{filtered.length} despesa(s)</p>
          </Card>
          {totalCombustivel > 0 && (
            <Card className="bg-gradient-to-r from-orange-900/20 to-amber-900/20 border-orange-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><Fuel size={10} className="text-orange-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Combustível</p></div>
              <p className="text-base sm:text-2xl font-bold text-orange-400 leading-tight">{formatCurrency(totalCombustivel)}</p>
            </Card>
          )}
          {totalAlimentacao > 0 && (
            <Card className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border-yellow-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><UtensilsCrossed size={10} className="text-yellow-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Alimentação</p></div>
              <p className="text-base sm:text-2xl font-bold text-yellow-400 leading-tight">{formatCurrency(totalAlimentacao)}</p>
            </Card>
          )}
          {totalHospedagem > 0 && (
            <Card className="bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-purple-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><BedDouble size={10} className="text-purple-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Hospedagem</p></div>
              <p className="text-base sm:text-2xl font-bold text-purple-400 leading-tight">{formatCurrency(totalHospedagem)}</p>
            </Card>
          )}
          {totalManutencao > 0 && (
            <Card className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border-cyan-800 !py-2 !px-2.5 sm:!px-3">
              <div className="flex items-center gap-1 mb-0.5"><Wrench size={10} className="text-cyan-400" /><p className="text-[10px] text-content-secondary font-medium leading-tight">Manutenção</p></div>
              <p className="text-base sm:text-2xl font-bold text-cyan-400 leading-tight">{formatCurrency(totalManutencao)}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([
          { value: 'hoje', label: 'Hoje' },
          { value: '7dias', label: '7 dias' },
          { value: '30dias', label: '30 dias' },
          { value: 'ano', label: 'Ano' },
          { value: 'tudo', label: 'Tudo' },
        ] as { value: Periodo; label: string }[]).map(opt => (
          <button key={opt.value} onClick={() => { setPeriodo(opt.value); setFiltroDataInicio(''); setFiltroDataFim(''); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              periodo === opt.value && !filtroDataInicio && !filtroDataFim
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-elevated text-content-secondary hover:bg-border-medium'
            }`}>
            {opt.label}
          </button>
        ))}
        <span className="hidden lg:inline text-content-muted/30">│</span>
        <input type="date" value={filtroDataInicio} onChange={(e) => { setFiltroDataInicio(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
          className={`rounded-lg border bg-elevated px-2 py-1.5 text-xs focus:outline-none focus:border-border-medium w-[7.5rem] transition-colors ${filtroDataInicio ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        <span className="text-[10px] text-content-muted">até</span>
        <input type="date" value={filtroDataFim} onChange={(e) => { setFiltroDataFim(e.target.value); if (e.target.value) setPeriodo('tudo'); }}
          className={`rounded-lg border bg-elevated px-2 py-1.5 text-xs focus:outline-none focus:border-border-medium w-[7.5rem] transition-colors ${filtroDataFim ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />

        {tiposUnicos.length > 0 && (
          <>
            <span className="hidden lg:inline text-content-muted/30">│</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {tiposUnicos.map(t => (
                <button key={t} onClick={() => toggleTipo(t)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition flex items-center gap-1 ${
                    filtroTipos.includes(t) ? 'bg-red-600/10 text-red-400 border-red-600/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'
                  }`}>
                  {getTipoIcone(t)}
                  {t}
                </button>
              ))}
              {filtroTipos.length > 0 && (
                <button onClick={() => setFiltroTipos([])} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition">
                  <Trash2 size={11} /> Limpar
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && filtroTipos.length === 0 && !filtroDataInicio && !filtroDataFim && (
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

      {!loading && filtered.length === 0 && (filtroTipos.length > 0 || filtroDataInicio || filtroDataFim) && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <p className="mb-2 text-sm sm:text-base">Nenhuma despesa encontrada com os filtros</p>
          <button onClick={() => { setFiltroTipos([]); setFiltroDataInicio(''); setFiltroDataFim(''); setPeriodo('tudo'); }}
            className="rounded-lg border border-border-subtle bg-elevated px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
            Limpar Filtros
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(despesa => (
            <div key={despesa.id} className="rounded-xl border border-border-subtle bg-surface p-3 sm:p-4 cursor-pointer hover:border-border-medium transition-colors" onClick={() => setDespesaSelecionada(despesa)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      {getTipoIcone(despesa.tipo)}
                      {despesa.tipo}
                    </span>
                    {(despesa as any).imagemUrl && (
                      <button type="button" onClick={() => setImagemAberta((despesa as any).imagemUrl)}
                        className="text-content-muted hover:text-blue-400 transition-colors">
                        <ImageIcon size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-red-400">{formatCurrency(despesa.valor)}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-content-muted">
                    <UserCircle size={14} />
                    <span className="truncate">{despesa.usuarioNome}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-content-muted whitespace-nowrap">{formatDate(new Date(despesa.data))}</p>
                  <p className="text-[10px] text-content-muted/60 whitespace-nowrap">reg. {new Date(despesa.createdAt).toLocaleDateString('pt-BR')}</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(despesa.id); }}
                    className={`mt-2 flex items-center gap-1.5 ml-auto rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      (deleteClicks[despesa.id] || 0) === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : (deleteClicks[despesa.id] || 0) === 1 ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-600/30 text-red-300 hover:bg-red-600/40'
                    }`}>
                    <Trash2 size={16} /> {deleteLabel(despesa.id)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {imagemAberta && (
        <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => setImagemAberta(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative max-w-lg max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setImagemAberta(null)}
              className="absolute -top-2 -right-2 z-10 rounded-full bg-surface border border-border-subtle p-1 text-content-muted hover:text-content shadow-lg transition-colors">
              <X size={16} />
            </button>
            <img src={imagemAberta} alt="Comprovante" className="rounded-xl max-h-[80vh] object-contain" />
          </div>
        </div>
      )}

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
                    <p className="text-xs font-semibold">{d.usuarioNome}</p>
                  </div>
                </div>
                {(d as any).imagemUrl && (
                  <div>
                    <p className="text-[10px] text-content-muted mb-1.5">Comprovante</p>
                    <img src={(d as any).imagemUrl} alt="Comprovante" className="rounded-lg border border-border-subtle max-h-48 object-contain cursor-pointer hover:opacity-80 transition"
                      onClick={() => { setDespesaSelecionada(null); setImagemAberta((d as any).imagemUrl); }} />
                  </div>
                )}
                <p className="text-[10px] text-content-muted text-center">Registrado em {new Date(d.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
