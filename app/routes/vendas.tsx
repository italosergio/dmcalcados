import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { UserCircle, Trash2, Undo2, Plus, ShoppingBag, X, Calendar, CreditCard, MapPin, Phone, Package, User, LayoutGrid, List, ImageIcon } from 'lucide-react';
import { ImageLightbox } from '~/components/common/ImageLightbox';
import { Button } from '~/components/common/Button';
import { Card } from '~/components/common/Card';
import { Input } from '~/components/common/Input';
import { useVendas, useClientes } from '~/hooks/useRealtime';
import { auth } from '~/services/firebase';
import { formatCurrency } from '~/utils/format';
import type { Venda, Cliente, CondicaoPagamento } from '~/models';

const condicaoLabel: Record<string, string> = {
  avista: 'À Vista',
  '1x': '1x',
  '2x': '2x',
  '3x': '3x',
  '1x_entrada': '1x',
  '2x_entrada': '2x',
  '3x_entrada': '3x',
};

const condicaoCor: Record<string, string> = {
  avista: 'bg-blue-600/10 text-blue-400',
  '1x': 'bg-orange-600/10 text-orange-400',
  '2x': 'bg-orange-600/10 text-orange-400',
  '3x': 'bg-orange-600/10 text-orange-400',
  '1x_entrada': 'bg-orange-600/10 text-orange-400',
  '2x_entrada': 'bg-orange-600/10 text-orange-400',
  '3x_entrada': 'bg-orange-600/10 text-orange-400',
};

function CondicaoTags({ condicao }: { condicao: string }) {
  const temEntrada = condicao?.includes('_entrada');
  return (
    <>
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${condicaoCor[condicao] || 'bg-gray-600/10 text-gray-400'}`}>
        {condicaoLabel[condicao] || condicao}
      </span>
      {temEntrada && (
        <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-600/10 text-blue-400">Entrada</span>
      )}
    </>
  );
}
export default function VendasPage() {
  const { vendas, loading: vendasLoading } = useVendas();
  const { clientes, loading: clientesLoading } = useClientes();
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [filteredVendas, setFilteredVendas] = useState<Venda[]>([]);
  const loading = vendasLoading || clientesLoading;
  const [searchVendedor, setSearchVendedor] = useState('');
  const [filtroCondicao, setFiltroCondicao] = useState<string[]>([]);
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState<'hoje' | '7dias' | '30dias' | 'ano' | 'tudo'>('30dias');
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [imagemAberta, setImagemAberta] = useState<string | null>(null);
  const [currentUserNome, setCurrentUserNome] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('vendas-view') as 'cards' | 'tabela') || 'cards';
    return 'cards';
  });

  const changeViewMode = (mode: 'cards' | 'tabela') => {
    setViewMode(mode);
    localStorage.setItem('vendas-view', mode);
  };
  const navigate = useNavigate();
  const location = useLocation();
  const handleDelete = useCallback((vendaId: string) => {
    const clicks = (deleteClicks[vendaId] || 0) + 1;
    clearTimeout(deleteTimers.current[vendaId]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[vendaId]; return n; });
      import('~/services/vendas.service').then(m => m.deleteVenda(vendaId));
    } else {
      setDeleteClicks(prev => ({ ...prev, [vendaId]: clicks }));
      deleteTimers.current[vendaId] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[vendaId]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const deleteLabel = (vendaId: string) => {
    const clicks = deleteClicks[vendaId] || 0;
    if (clicks === 0) return null;
    if (clicks === 1) return 'Tem certeza?';
    return 'Confirmar!';
  };

  const handleRestore = useCallback((vendaId: string) => {
    import('~/services/vendas.service').then(m => m.restoreVenda(vendaId));
  }, []);

  useEffect(() => {
    const state = location.state as { vendaId?: string } | null;
    if (state?.vendaId && vendas.length > 0) {
      const found = vendas.find(venda => venda.id === state.vendaId);
      if (found) {
        setVendaSelecionada(found);
        setPeriodoFiltro('tudo');
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [vendas]);

  useEffect(() => {
    import('~/services/auth.service').then(m => {
      const uid = auth.currentUser?.uid;
      if (uid) m.getUserData(uid).then(u => { if (u) setCurrentUserNome(u.nome); });
    });
  }, []);

  useEffect(() => {
    let result = vendas;

    // Filtro de período
    if (periodoFiltro !== 'tudo') {
      const agora = new Date();
      const inicio = new Date();
      if (periodoFiltro === 'hoje') inicio.setHours(0, 0, 0, 0);
      else if (periodoFiltro === '7dias') inicio.setDate(agora.getDate() - 7);
      else if (periodoFiltro === '30dias') inicio.setDate(agora.getDate() - 30);
      else if (periodoFiltro === 'ano') inicio.setFullYear(agora.getFullYear(), 0, 1);
      result = result.filter(v => new Date(v.data) >= inicio);
    }

    if (filtroDataInicio) {
      result = result.filter(v => new Date(v.data) >= new Date(filtroDataInicio + 'T00:00:00'));
    }
    if (filtroDataFim) {
      result = result.filter(v => new Date(v.data) <= new Date(filtroDataFim + 'T23:59:59'));
    }
    if (searchVendedor.trim()) {
      result = result.filter(v => v.vendedorNome?.toLowerCase().includes(searchVendedor.toLowerCase()));
    }
    if (filtroCondicao.length > 0) {
      result = result.filter(v => {
        const c = v.condicaoPagamento;
        return filtroCondicao.some(f => {
          if (f === 'entrada') return c?.includes('_entrada');
          if (f === 'avista') return c === 'avista';
          return c === f || c === f + '_entrada';
        });
      });
    }
    setFilteredVendas(result);
  }, [searchVendedor, filtroCondicao, periodoFiltro, filtroDataInicio, filtroDataFim, vendas]);

  // Calcula quanto de cada venda entra em cada card, baseado nos filtros ativos
  const f = filtroCondicao;
  const hasAvista = f.includes('avista');
  const hasEntrada = f.includes('entrada');
  const parcelasFiltro = f.filter(x => ['1x','2x','3x'].includes(x));
  const hasParcela = parcelasFiltro.length > 0;
  const noFilter = f.length === 0;

  const { totalVendas, totalAvista, totalEntrada, totalPrazo } = filteredVendas.filter((v: any) => !v.deletedAt).reduce((acc, v) => {
    const c = v.condicaoPagamento;
    const temEntrada = c?.includes('_entrada');
    const parcelaVenda = c?.replace('_entrada', '') || '';
    const ehAvista = c === 'avista';
    const ehPrazoSemEntrada = ['1x','2x','3x'].includes(c);
    const ehPrazoComEntrada = temEntrada;

    if (noFilter) {
      return {
        totalVendas: acc.totalVendas + v.valorTotal,
        totalAvista: acc.totalAvista + (ehAvista ? v.valorTotal : 0),
        totalEntrada: acc.totalEntrada + (temEntrada ? (v.valorAvista || 0) : 0),
        totalPrazo: acc.totalPrazo + (v.valorPrazo || 0),
      };
    }

    let somaTotal = 0;
    let somaAvista = 0;
    let somaEntrada = 0;
    let somaPrazo = 0;

    // Parte à vista pura (venda avista)
    if (hasAvista && ehAvista) {
      somaAvista += v.valorTotal;
      somaTotal += v.valorTotal;
    }

    // Parte entrada (valorAvista de vendas com entrada)
    if (hasEntrada && ehPrazoComEntrada) {
      somaEntrada += (v.valorAvista || 0);
      somaTotal += (v.valorAvista || 0);
    }

    // Parte prazo
    if (hasParcela) {
      const parcelaMatch = parcelasFiltro.includes(parcelaVenda);
      if (parcelaMatch) {
        if (ehPrazoSemEntrada) {
          // prazo puro: conta tudo
          somaPrazo += v.valorTotal;
          somaTotal += v.valorTotal;
        } else if (ehPrazoComEntrada) {
          // prazo com entrada: conta só a parte prazo
          somaPrazo += (v.valorPrazo || 0);
          // só soma no total se entrada não já foi contada
          if (!hasEntrada) {
            // não marcou entrada, então só o prazo
            somaTotal += (v.valorPrazo || 0);
          } else {
            // entrada já somou valorAvista, agora soma valorPrazo
            somaTotal += (v.valorPrazo || 0);
          }
        }
      }
    }

    return {
      totalVendas: acc.totalVendas + somaTotal,
      totalAvista: acc.totalAvista + somaAvista,
      totalEntrada: acc.totalEntrada + somaEntrada,
      totalPrazo: acc.totalPrazo + somaPrazo,
    };
  }, { totalVendas: 0, totalAvista: 0, totalEntrada: 0, totalPrazo: 0 });
  const vendedoresUnicos = Array.from(new Set(vendas.map(v => v.vendedorNome).filter(Boolean))).sort();

  const toggleFiltroCondicao = (val: string) => {
    setFiltroCondicao(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  return (
    <div className={viewMode === 'tabela' ? 'flex flex-col h-[calc(100vh-4rem)] overflow-hidden' : ''}>
      {/* Header: Nova Venda + Cards de Total + Toggle View */}
      {(() => {
        const showAvista = noFilter || hasAvista;
        const showEntrada = noFilter || hasEntrada;
        const showPrazo = noFilter || hasParcela;
        const prazoLabel = noFilter || !hasParcela ? 'À Prazo' : `À Prazo ${parcelasFiltro.join(' + ')}`;
        const totalAvistaEntrada = totalAvista + totalEntrada;
        const avistaEntradaLabel = showAvista && showEntrada ? 'À Vista + Entrada' : showAvista ? 'À Vista' : 'Entrada';
        const showAvistaEntrada = showAvista || showEntrada;
        const periodoLabel = filtroDataInicio && filtroDataFim
          ? `de ${new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
          : filtroDataInicio
            ? `a partir de ${new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}`
            : filtroDataFim
              ? `até ${new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
              : { hoje: 'hoje', '7dias': 'últimos 7 dias', '30dias': 'últimos 30 dias', ano: 'do ano', tudo: '' }[periodoFiltro];
        return (
          <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3">
            {/* Mobile: só o botão */}
            <div className="flex items-center sm:contents">
              <button
                onClick={() => navigate('/vendas/nova')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95"
              >
                <Plus size={18} /> Nova Venda
              </button>
            </div>
            {/* Cards de total */}
            <div className="grid grid-cols-3 gap-2 sm:contents">
              <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-800 !py-2 !px-2.5 sm:!px-3 sm:flex-1 sm:min-w-0">
                <p className="text-[10px] text-content-secondary font-medium leading-tight truncate">Total {periodoLabel}</p>
                <p className="text-base sm:text-2xl font-bold text-green-400 leading-tight">{formatCurrency(totalVendas)}</p>
                <p className="text-[10px] text-content-muted leading-tight">{filteredVendas.length} venda(s)</p>
              </Card>
              {showAvistaEntrada && (
                <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800 !py-2 !px-2.5 sm:!px-3">
                  <p className="text-[10px] text-content-secondary font-medium leading-tight truncate">{avistaEntradaLabel}</p>
                  <p className="text-base sm:text-2xl font-bold text-blue-400 leading-tight">{formatCurrency(totalAvistaEntrada)}</p>
                </Card>
              )}
              {showPrazo && (
                <Card className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border-yellow-800 !py-2 !px-2.5 sm:!px-3">
                  <p className="text-[10px] text-content-secondary font-medium leading-tight truncate">{prazoLabel}</p>
                  <p className="text-base sm:text-2xl font-bold text-yellow-400 leading-tight">{formatCurrency(totalPrazo)}</p>
                </Card>
              )}
            </div>
          </div>
        );
      })()}

      {/* Filtros: Período + Datas + Condição */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([
          { value: 'hoje', label: 'Hoje' },
          { value: '7dias', label: '7 dias' },
          { value: '30dias', label: '30 dias' },
          { value: 'ano', label: 'Ano' },
          { value: 'tudo', label: 'Tudo' },
        ] as { value: typeof periodoFiltro; label: string }[]).map(opt => (
          <button
            key={opt.value}
            onClick={() => { setPeriodoFiltro(opt.value); setFiltroDataInicio(''); setFiltroDataFim(''); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              periodoFiltro === opt.value && !filtroDataInicio && !filtroDataFim
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-elevated text-content-secondary hover:bg-border-medium'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="hidden lg:inline text-content-muted/30">│</span>
        <input type="date" value={filtroDataInicio} onChange={(e) => { setFiltroDataInicio(e.target.value); if (e.target.value) setPeriodoFiltro('tudo'); }}
          className={`rounded-lg border bg-elevated px-2 py-1.5 text-xs focus:outline-none focus:border-border-medium w-[7.5rem] transition-colors ${filtroDataInicio ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />
        <span className="text-[10px] text-content-muted">até</span>
        <input type="date" value={filtroDataFim} onChange={(e) => { setFiltroDataFim(e.target.value); if (e.target.value) setPeriodoFiltro('tudo'); }}
          className={`rounded-lg border bg-elevated px-2 py-1.5 text-xs focus:outline-none focus:border-border-medium w-[7.5rem] transition-colors ${filtroDataFim ? 'border-green-600/30 text-content' : 'border-border-subtle text-content-muted'}`} />

        <span className="hidden lg:inline text-content-muted/30">│</span>

        <div className="flex items-center gap-1.5">
          {[
            { value: 'avista', label: 'À Vista', cor: 'bg-blue-600/10 text-blue-400 border-blue-600/30' },
            { value: 'entrada', label: 'Entrada', cor: 'bg-blue-600/10 text-blue-400 border-blue-600/30' },
            { value: '1x', label: '1x', cor: 'bg-orange-600/10 text-orange-400 border-orange-600/30' },
            { value: '2x', label: '2x', cor: 'bg-orange-600/10 text-orange-400 border-orange-600/30' },
            { value: '3x', label: '3x', cor: 'bg-orange-600/10 text-orange-400 border-orange-600/30' },
          ].map(opt => (
            <button key={opt.value} onClick={() => toggleFiltroCondicao(opt.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${
                filtroCondicao.includes(opt.value) ? opt.cor : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'
              }`}>
              {opt.label}
            </button>
          ))}
          {filtroCondicao.length > 0 && (
            <button onClick={() => setFiltroCondicao([])} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition">
              <Trash2 size={11} /> Limpar
            </button>
          )}
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
      
      {!loading && filteredVendas.length === 0 && filtroCondicao.length === 0 && !filtroDataInicio && !filtroDataFim && vendas.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <ShoppingBag size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhuma venda registrada</p>
          <p className="mb-6 text-sm text-content-muted">Comece registrando sua primeira venda</p>
          <button
            onClick={() => navigate('/vendas/nova')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95"
          >
            <Plus size={20} />
            Registrar Primeira Venda
          </button>
        </div>
      )}

      {!loading && filteredVendas.length === 0 && vendas.length > 0 && filtroCondicao.length === 0 && !filtroDataInicio && !filtroDataFim && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <ShoppingBag size={40} className="mx-auto mb-3 text-content-muted opacity-40" />
          <p className="mb-2 text-sm sm:text-base font-medium">Nenhuma venda registrada {periodoFiltro === 'hoje' ? 'hoje' : periodoFiltro === '7dias' ? 'nos últimos 7 dias' : periodoFiltro === '30dias' ? 'nos últimos 30 dias' : 'no ano'}</p>
          <button onClick={() => setPeriodoFiltro('tudo')}
            className="rounded-lg border border-border-subtle bg-elevated px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
            Ver todas as vendas
          </button>
        </div>
      )}

      {!loading && filteredVendas.length === 0 && (filtroCondicao.length > 0 || filtroDataInicio || filtroDataFim) && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 text-center">
          <p className="mb-2 text-sm sm:text-base">Nenhuma venda encontrada com os filtros:</p>
          <div className="mb-4 flex flex-wrap justify-center gap-1.5">
            {periodoFiltro !== 'tudo' && !filtroDataInicio && !filtroDataFim && (
              <span className="text-xs bg-elevated px-2.5 py-1 rounded-lg">{{ hoje: 'Hoje', '7dias': '7 dias', '30dias': '30 dias', ano: 'Ano' }[periodoFiltro]}</span>
            )}
            {filtroDataInicio && <span className="text-xs bg-elevated px-2.5 py-1 rounded-lg">De: {new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
            {filtroDataFim && <span className="text-xs bg-elevated px-2.5 py-1 rounded-lg">Até: {new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
            {filtroCondicao.map(fc => (
              <span key={fc} className="text-xs bg-elevated px-2.5 py-1 rounded-lg">
                {{ avista: 'À Vista', entrada: 'Entrada', '1x': '1x', '2x': '2x', '3x': '3x' }[fc] || fc}
              </span>
            ))}
          </div>
          <Button onClick={() => { setFiltroCondicao([]); setFiltroDataInicio(''); setFiltroDataFim(''); }} variant="secondary" className="w-full sm:w-auto">
            Limpar Filtros
          </Button>
        </div>
      )}

      {!loading && filteredVendas.length > 0 && viewMode === 'cards' && (
        <div className="space-y-3 sm:space-y-4">
          {filteredVendas.map(venda => (
            <div key={venda.id} className={`rounded-xl border p-3 sm:p-4 cursor-pointer transition-colors ${ (venda as any).deletedAt ? 'border-red-900/50 bg-red-950/20 opacity-70 hover:opacity-90' : 'border-border-subtle bg-surface hover:border-border-medium' }`} onClick={() => setVendaSelecionada(venda)}>
              <div className="mb-2 flex items-start sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {venda.pedidoNumero && (
                      <span className="text-xs bg-elevated px-2 py-0.5 rounded-md font-mono">#{venda.pedidoNumero}</span>
                    )}
                    <CondicaoTags condicao={venda.condicaoPagamento} />
                    {(venda as any).imagemUrl && (
                      <ImageIcon size={13} className="text-blue-400 shrink-0" />
                    )}
                  </div>
                  {(venda as any).deletedAt && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">Apagada</span>
                  )}
                  <p className={`text-lg sm:text-xl font-bold ${ (venda as any).deletedAt ? 'text-red-400 line-through' : 'text-green-400' }`}>{formatCurrency(venda.valorTotal)}</p>
                  <p className="text-sm font-medium text-content-secondary truncate flex items-center gap-1"><User size={14} className="shrink-0" />{venda.clienteNome}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-content-muted">
                    <UserCircle size={14} />
                    <span className="truncate">{venda.vendedorNome}</span>
                    {(venda as any).registradoPorNome && (
                      <span className="text-content-muted/60">&middot; reg. por {(venda as any).registradoPorNome}</span>
                    )}
                  </div>
                  {(venda as any).descricao && (
                    <p className="text-xs text-content-muted mt-0.5 truncate italic">"{(venda as any).descricao}"</p>
                  )}
                  {(venda.condicaoPagamento === '1x_entrada' || venda.condicaoPagamento === '2x_entrada' || venda.condicaoPagamento === '3x_entrada') && (
                    <p className="text-xs text-content-muted mt-1">
                      Entrada: {formatCurrency(venda.valorAvista || 0)} · Prazo: {formatCurrency(venda.valorPrazo || 0)} ({venda.parcelas}x)
                    </p>
                  )}
                  {(venda.condicaoPagamento === '2x' || venda.condicaoPagamento === '3x') && (
                    <p className="text-xs text-content-muted mt-1">
                      {venda.parcelas}x de {formatCurrency(venda.valorTotal / venda.parcelas)}
                    </p>
                  )}
                  {venda.datasParcelas && venda.datasParcelas.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {venda.datasParcelas.map((d, i) => (
                        <span key={i} className="text-xs bg-elevated px-2 py-0.5 rounded">
                          {i + 1}ª {new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-content-muted whitespace-nowrap">{new Date(venda.data).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[10px] text-content-muted/60 whitespace-nowrap">reg. {new Date(venda.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-content-secondary space-y-1">
                {venda.produtos.map((p, i) => (
                  <p key={i} className="truncate">
                    {p.tipo === 'pacote'
                      ? `${p.quantidade} pct ${p.modelo} ${p.referencia ? `(${p.referencia})` : ''} - ${formatCurrency(p.valorUnitario)}/un · pct ${formatCurrency(p.valorUnitario * 15)} - ${formatCurrency(p.valorTotal)}`
                      : `${p.quantidade} un ${p.modelo} ${p.referencia ? `(${p.referencia})` : ''} - ${formatCurrency(p.valorTotal)}`
                    }
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredVendas.length > 0 && viewMode === 'tabela' && (
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col min-h-0 flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-elevated/50">
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Data</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Cliente</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Vendedor</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Tipo</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Valor</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <tbody className="divide-y divide-border-subtle">
                {filteredVendas.map(venda => (
                  <tr key={venda.id} onClick={() => setVendaSelecionada(venda)} className={`cursor-pointer transition-colors ${ (venda as any).deletedAt ? 'bg-red-950/20 opacity-70 hover:opacity-90' : 'hover:bg-surface-hover' }`}>
                    <td className="px-3 py-2.5 text-xs text-content-muted whitespace-nowrap">{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2.5 text-sm truncate max-w-[140px] sm:max-w-none">{venda.clienteNome}</td>
                    <td className="px-3 py-2.5 text-sm text-content-secondary truncate max-w-[120px] hidden sm:table-cell">{venda.vendedorNome}</td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell"><CondicaoTags condicao={venda.condicaoPagamento} /></td>
                    <td className={`px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap ${ (venda as any).deletedAt ? 'text-red-400 line-through' : 'text-green-400' }`}>{formatCurrency(venda.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Modal detalhe */}
      {imagemAberta && <ImageLightbox src={imagemAberta} onClose={() => setImagemAberta(null)} />}

      {vendaSelecionada && (() => {
        const v = vendaSelecionada;
        const c = clientes.find(cl => cl.id === v.clienteId);
        const condicao = v.condicaoPagamento;
        const temEntrada = condicao?.includes('_entrada');
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => setVendaSelecionada(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  {v.pedidoNumero && <span className="text-xs bg-elevated px-2.5 py-1 rounded-md font-mono font-semibold">#{v.pedidoNumero}</span>}
                  <CondicaoTags condicao={condicao} />
                </div>
                <button onClick={() => setVendaSelecionada(null)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-2xl font-bold text-green-400">{formatCurrency(v.valorTotal)}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Data da venda</span></div>
                    <p className="text-xs font-semibold">{new Date(v.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><UserCircle size={12} /><span className="text-[10px]">Vendedor</span></div>
                    <p className="text-xs font-semibold">{v.vendedorNome}</p>
                    {(v as any).registradoPorNome && (
                      <p className="text-[10px] text-content-muted mt-0.5">Registrado por {(v as any).registradoPorNome}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-elevated p-2.5">
                  <p className="text-[10px] text-content-muted mb-1">Cliente</p>
                  <p className="text-xs font-semibold">{v.clienteNome}</p>
                  {c && (
                    <div className="mt-1 space-y-0.5 text-[10px] text-content-secondary">
                      {c.cpfCnpj && <p>{c.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ'}: {c.cpfCnpj}</p>}
                      {(c.endereco || c.cidade) && (
                        <p className="flex items-center gap-1.5"><MapPin size={12} className="text-content-muted shrink-0" />{[c.endereco, c.cidade, c.estado].filter(Boolean).join(' · ')}</p>
                      )}
                      {(c.contatos?.length ? c.contatos : c.contato ? [c.contato] : []).map((ct, i) => (
                        <p key={i} className="flex items-center gap-1.5"><Phone size={12} className="text-content-muted shrink-0" />{ct}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-content-muted mb-1.5"><Package size={12} /><span className="text-[10px] font-medium">Produtos</span></div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {v.produtos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{p.modelo}</p>
                          <div className="flex items-center gap-2 text-[10px] text-content-muted">
                            {p.referencia && <span>REF: {p.referencia}</span>}
                            {p.tipo === 'pacote'
                              ? <span>{formatCurrency(p.valorUnitario)}/un · pct {formatCurrency(p.valorUnitario * 15)} × {p.quantidade}</span>
                              : <span>{p.quantidade} un × {formatCurrency(p.valorUnitario)}</span>
                            }
                            {p.valorSugerido > 0 && p.valorSugerido !== p.valorUnitario && (
                              <span className="text-yellow-500">sug: {formatCurrency(p.valorSugerido)}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-green-400 whitespace-nowrap">{formatCurrency(p.valorTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-elevated p-2.5">
                  <div className="flex items-center gap-1.5 text-content-muted mb-1.5"><CreditCard size={12} /><span className="text-[10px] font-medium">Pagamento</span></div>
                  {condicao === 'avista' && (
                    <p className="text-xs">Total à vista: <span className="font-bold text-green-400">{formatCurrency(v.valorTotal)}</span></p>
                  )}
                  {condicao !== 'avista' && (
                    <div className="space-y-1 text-xs">
                      {temEntrada && (v.valorAvista || 0) > 0 && (
                        <div className="flex justify-between"><span className="text-content-secondary">Entrada</span><span className="font-semibold text-blue-400">{formatCurrency(v.valorAvista)}</span></div>
                      )}
                      {(v.valorPrazo || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-content-secondary">À prazo {v.parcelas > 0 && `(${v.parcelas}x de ${formatCurrency(v.valorPrazo / v.parcelas)})`}</span>
                          <span className="font-semibold text-yellow-400">{formatCurrency(v.valorPrazo)}</span>
                        </div>
                      )}
                      {!temEntrada && v.parcelas > 0 && (
                      <p className="text-xs text-content-secondary">{v.parcelas}x de <span className="font-semibold text-yellow-400">{formatCurrency(v.valorTotal / v.parcelas)}</span></p>
                      )}
                    </div>
                  )}
                  {v.datasParcelas && v.datasParcelas.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {v.datasParcelas.map((d, i) => (
                        <span key={i} className="text-[10px] bg-surface px-2 py-0.5 rounded-md">{i + 1}ª — {new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      ))}
                    </div>
                  )}
                </div>

                {v.descricao && (
                  <div className="rounded-lg bg-elevated p-2.5">
                    <p className="text-[10px] text-content-muted mb-0.5">Observação</p>
                    <p className="text-xs italic">"{v.descricao}"</p>
                  </div>
                )}
                {v.imagemUrl && (
                  <div>
                    <p className="text-[10px] text-content-muted mb-1.5">Foto / Comprovante</p>
                    <img src={v.imagemUrl} alt="Comprovante" className="rounded-lg border border-border-subtle max-h-48 object-contain w-full cursor-pointer hover:opacity-80 transition" onClick={() => setImagemAberta(v.imagemUrl!)} />
                  </div>
                )}
                <p className="text-[10px] text-content-muted text-center">Registrado em {new Date(v.createdAt).toLocaleString('pt-BR')}</p>

                {(v as any).deletedAt && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center">
                    <p className="text-xs text-red-400 font-medium">Venda apagada</p>
                    {(v as any).deletedByNome && (
                      <p className="text-[10px] text-red-400/70 mt-0.5">por {(v as any).deletedByNome} em {new Date((v as any).deletedAt).toLocaleString('pt-BR')}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRestore(v.id)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <Undo2 size={13} />
                      Desfazer exclusão
                    </button>
                  </div>
                )}

                {!(v as any).deletedAt && (
                <button
                  type="button"
                  onClick={() => handleDelete(v.id)}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    (deleteClicks[v.id] || 0) === 0
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : (deleteClicks[v.id] || 0) === 1
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-red-600/30 text-red-300 hover:bg-red-600/40'
                  }`}
                >
                  <Trash2 size={14} />
                  {deleteLabel(v.id) || 'Apagar'}
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
