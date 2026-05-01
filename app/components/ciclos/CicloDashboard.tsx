import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { RefreshCw, Plus, X, Pencil, Banknote, Landmark, ImageIcon, ChevronDown } from 'lucide-react';
import { formatCurrency } from '~/utils/format';
import { findCicloParaUsuario } from '~/services/ciclos.service';
import { addCobranca, removeCobranca } from '~/services/cobrancas.service';
import { createDeposito, deleteDeposito, updateDeposito } from '~/services/depositos.service';
import { uploadImage } from '~/services/cloudinary.service';
import { useAuth } from '~/contexts/AuthContext';
import type { Ciclo, Venda, Despesa, Deposito, ValeCard, Cobranca } from '~/models';

const PECAS_POR_PACOTE = 15;

interface Props {
  ciclo: Ciclo;
  vendas: Venda[];
  despesas: Despesa[];
  depositos: Deposito[];
  valeCards?: ValeCard[];
}

export function CicloDashboard({ ciclo, vendas, despesas, depositos, valeCards = [] }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [Highcharts, setHighcharts] = useState<any>(null);
  const [HighchartsReact, setHighchartsReact] = useState<any>(null);
  const [ts, setTs] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [cobrancasModal, setCobrancasModal] = useState(false);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [cobForm, setCobForm] = useState(false);
  const [cobNome, setCobNome] = useState('');
  const [cobValor, setCobValor] = useState('');
  const [cobData, setCobData] = useState(new Date().toISOString().slice(0, 10));
  const [cobDesc, setCobDesc] = useState('');
  const [cobForma, setCobForma] = useState<'dinheiro' | 'pix'>('dinheiro');
  const [cobSaving, setCobSaving] = useState(false);
  const [caixaModal, setCaixaModal] = useState(false);
  const [despDiaOpen, setDespDiaOpen] = useState(false);
  const [depositosModal, setDepositosModal] = useState(false);
  const [depForm, setDepForm] = useState(false);
  const [depValor, setDepValor] = useState('');
  const [depData, setDepData] = useState(new Date().toISOString().slice(0, 10));
  const [depImagem, setDepImagem] = useState<File | null>(null);
  const [depImagemPreview, setDepImagemPreview] = useState<string | null>(null);
  const [depSemFoto, setDepSemFoto] = useState(false);
  const [depJustificativa, setDepJustificativa] = useState('');
  const [depSaving, setDepSaving] = useState(false);

  useEffect(() => {
    import('highcharts').then(m => setHighcharts(m.default));
    import('highcharts-react-official').then(m => setHighchartsReact(() => m.default));
  }, []);

  useEffect(() => {
    import('~/services/cobrancas.service').then(m => m.getCobrancas(ciclo.id)).then(setCobrancas);
  }, [ciclo.id, ts]);

  const participanteIds = useMemo(() => {
    const ids = new Set([ciclo.vendedorId]);
    (ciclo.participantes || []).forEach(p => ids.add(p.id));
    return ids;
  }, [ciclo]);

  // Filtrar dados do ciclo por cicloId ou por vendedor+período
  const vendasCiclo = useMemo(() => vendas.filter(v => {
    if ((v as any).deletedAt) return false;
    if ((v as any).cicloId === ciclo.id) return true;
    if (!participanteIds.has(v.vendedorId)) return false;
    const d = new Date(v.data).toISOString().slice(0, 10);
    if (ciclo.dataInicio && d < ciclo.dataInicio) return false;
    if (ciclo.dataFim && d > ciclo.dataFim) return false;
    return true;
  }), [vendas, ciclo, participanteIds, ts]);

  const despesasCiclo = useMemo(() => despesas.filter(d => {
    if ((d as any).deletedAt) return false;
    if ((d as any).cicloId === ciclo.id) return true;
    const uid = (d as any).usuarioId;
    if (!participanteIds.has(uid)) {
      const rateio = (d as any).rateio as any[] | undefined;
      if (!rateio?.some((r: any) => participanteIds.has(r.usuarioId))) return false;
    }
    const dt = new Date(d.data).toISOString().slice(0, 10);
    if (ciclo.dataInicio && dt < ciclo.dataInicio) return false;
    if (ciclo.dataFim && dt > ciclo.dataFim) return false;
    return true;
  }), [despesas, ciclo, participanteIds, ts]);

  const depositosCiclo = useMemo(() => depositos.filter(dep => {
    if (dep.deletedAt) return false;
    if ((dep as any).cicloId === ciclo.id) return true;
    if (!participanteIds.has(dep.depositanteId)) return false;
    const d = dep.data.slice(0, 10);
    if (ciclo.dataInicio && d < ciclo.dataInicio) return false;
    if (ciclo.dataFim && d > ciclo.dataFim) return false;
    return true;
  }), [depositos, ciclo, participanteIds, ts]);

  // Cálculos
  const totalVendas = vendasCiclo.reduce((s, v) => s + v.valorTotal, 0);
  const totalAvista = vendasCiclo.filter(v => v.condicaoPagamento === 'avista').reduce((s, v) => s + v.valorTotal, 0);
  const totalEntradas = vendasCiclo.filter(v => v.condicaoPagamento?.includes('_entrada')).reduce((s, v) => s + (v.valorAvista || 0), 0);
  const totalPrazo = vendasCiclo.reduce((s, v) => s + (v.valorPrazo || 0), 0);

  // Caixa interno = vendas à vista em dinheiro + entradas em dinheiro
  const caixaInterno = vendasCiclo.reduce((s, v) => {
    const ef = (v as any).entradaForma;
    if (v.condicaoPagamento === 'avista') {
      if (ef === 'dinheiro') return s + v.valorTotal;
      if (ef === 'misto') return s + ((v as any).valorDinheiro || 0);
    }
    if (v.condicaoPagamento?.includes('_entrada')) {
      if (ef === 'dinheiro') return s + (v.valorAvista || 0);
      if (ef === 'misto') return s + ((v as any).valorDinheiro || 0);
    }
    return s;
  }, 0);

  const despesasInterno = despesasCiclo.reduce((s, d) => {
    const fp = (d as any).fontePagamento;
    if (fp === 'misto') return s + ((d as any).valorInterno || 0);
    if (fp === 'caixa_externo') return s;
    return s + d.valor;
  }, 0);
  const despesasExterno = despesasCiclo.reduce((s, d) => {
    const fp = (d as any).fontePagamento;
    if (fp === 'misto') return s + ((d as any).valorExterno || 0);
    if (fp === 'caixa_externo') return s + d.valor;
    return s;
  }, 0);
  const totalDespesas = despesasCiclo.reduce((s, d) => s + d.valor, 0);
  const totalDepositos = depositosCiclo.reduce((s, d) => s + d.valor, 0);

  // Vales do ciclo
  const valesCiclo = useMemo(() => {
    return valeCards.filter(vc => {
      if (!participanteIds.has(vc.funcionarioId)) return false;
      const regs = Object.values(vc.registros || {}) as any[];
      return regs.some(r => {
        const d = r.data?.slice(0, 10);
        if (ciclo.dataInicio && d < ciclo.dataInicio) return false;
        if (ciclo.dataFim && d > ciclo.dataFim) return false;
        return true;
      });
    });
  }, [valeCards, ciclo, participanteIds, ts]);
  const totalVales = valesCiclo.reduce((s, vc) => s + vc.total, 0);
  const valesInterno = valesCiclo.reduce((s, vc) => s + Object.values(vc.registros || {}).filter((r: any) => r.fontePagamento !== 'caixa_externo').reduce((ss: number, r: any) => ss + (r.valor || 0), 0), 0);
  const valesExterno = totalVales - valesInterno;

  // Cobranças
  const totalCobrancas = cobrancas.reduce((s, c) => s + c.valor, 0);
  const cobrancasDinheiro = cobrancas.filter(c => c.forma === 'dinheiro').reduce((s, c) => s + c.valor, 0);
  const cobrancasPix = cobrancas.filter(c => c.forma === 'pix').reduce((s, c) => s + c.valor, 0);

  const saldoCaixaInterno = caixaInterno + cobrancasDinheiro - despesasInterno - totalDepositos - valesInterno;

  // Caixa interno do dia de hoje
  const despesasPorDiaComCaixa = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicio = ciclo.dataInicio || ciclo.createdAt.slice(0, 10);
    const fim = ciclo.dataFim || hoje;
    const d = new Date(inicio + 'T00:00:00');
    const end = new Date((fim < hoje ? fim : hoje) + 'T00:00:00');
    const result: { dia: string; despesas: Despesa[]; caixaInterno: number }[] = [];
    let saldo = 0;
    while (d <= end) {
      const day = d.toISOString().slice(0, 10);
      saldo += vendasCiclo.filter(v => new Date(v.data).toISOString().slice(0, 10) === day).reduce((s, v) => {
        const ef = (v as any).entradaForma;
        if (v.condicaoPagamento === 'avista') { if (ef === 'dinheiro') return s + v.valorTotal; if (ef === 'misto') return s + ((v as any).valorDinheiro || 0); }
        if (v.condicaoPagamento?.includes('_entrada')) { if (ef === 'dinheiro') return s + (v.valorAvista || 0); if (ef === 'misto') return s + ((v as any).valorDinheiro || 0); }
        return s;
      }, 0);
      saldo += cobrancas.filter(c => c.data === day && c.forma === 'dinheiro').reduce((s, c) => s + c.valor, 0);
      saldo -= depositosCiclo.filter(dep => new Date(dep.data).toISOString().slice(0, 10) === day).reduce((s, dep) => s + dep.valor, 0);
      saldo -= despesasCiclo.filter(dd => new Date(dd.data).toISOString().slice(0, 10) === day).reduce((s, dd) => {
        const fp = (dd as any).fontePagamento;
        if (fp === 'misto') return s + ((dd as any).valorInterno || 0);
        if (fp === 'caixa_externo') return s;
        return s + dd.valor;
      }, 0);
      saldo -= valesCiclo.reduce((s, vc) => s + Object.values(vc.registros || {}).filter((r: any) => r.data?.slice(0, 10) === day && r.fontePagamento !== 'caixa_externo').reduce((ss: number, r: any) => ss + (r.valor || 0), 0), 0);
      const despDia = despesasCiclo.filter(dd => new Date(dd.data).toISOString().slice(0, 10) === day);
      if (despDia.length > 0) result.push({ dia: day, despesas: despDia, caixaInterno: saldo });
      d.setDate(d.getDate() + 1);
    }
    return result.reverse();
  }, [vendasCiclo, despesasCiclo, depositosCiclo, valesCiclo, cobrancas, ciclo]);

  // Vendas por modelo
  const porModelo = useMemo(() => {
    const map: Record<string, { modelo: string; pecas: number; valor: number }> = {};
    vendasCiclo.forEach(v => v.produtos?.forEach(p => {
      const un = (p as any).tipo === 'unidade' ? p.quantidade : p.quantidade * PECAS_POR_PACOTE;
      if (!map[p.modelo]) map[p.modelo] = { modelo: p.modelo, pecas: 0, valor: 0 };
      map[p.modelo].pecas += un;
      map[p.modelo].valor += p.valorTotal;
    }));
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [vendasCiclo]);

  // Estoque do ciclo: pacotes iniciais vs vendidos (calculado das vendas reais)
  const estoqueCiclo = useMemo(() => {
    return ciclo.produtos.map(p => {
      const vendido = porModelo.find(m => m.modelo === p.modelo);
      const pecasVendidas = vendido?.pecas || 0;
      const pctVendidos = Math.floor(pecasVendidas / PECAS_POR_PACOTE);
      const avulsos = pecasVendidas % PECAS_POR_PACOTE;
      return { ...p, pecasVendidas, pctVendidos, avulsos, valorVendido: vendido?.valor || 0, pecasRestantes: p.pecasInicial - pecasVendidas };
    });
  }, [ciclo.produtos, porModelo]);

  const totalPctInicial = ciclo.produtos.reduce((s, p) => s + p.pacotesInicial, 0);
  const totalPecasVendidas = estoqueCiclo.reduce((s, p) => s + p.pecasVendidas, 0);
  const totalPctVendidos = Math.floor(totalPecasVendidas / PECAS_POR_PACOTE);
  const totalPecasRestantes = estoqueCiclo.reduce((s, p) => s + p.pecasRestantes, 0);

  // Gráfico vendas por dia
  const chartOptions = useMemo(() => {
    if (!Highcharts) return null;
    const inicio = ciclo.dataInicio || ciclo.createdAt.slice(0, 10);
    const fim = ciclo.dataFim || new Date().toISOString().slice(0, 10);
    const days: string[] = [];
    const d = new Date(inicio + 'T00:00:00');
    const end = new Date(fim + 'T00:00:00');
    while (d <= end) {
      days.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    const cats = days.map(d => { const p = d.split('-'); return `${p[2]}/${p[1]}`; });
    const vendasPorDia = days.map(day => vendasCiclo.filter(v => new Date(v.data).toISOString().slice(0, 10) === day).reduce((s, v) => s + v.valorTotal, 0));
    const despPorDia = days.map(day => despesasCiclo.filter(d => new Date(d.data).toISOString().slice(0, 10) === day).reduce((s, d) => s + d.valor, 0));

    return {
      chart: { type: 'column', height: 200, backgroundColor: '#232328' },
      title: { text: undefined },
      xAxis: { categories: cats, labels: { style: { fontSize: '8px', color: '#f0f0f2' }, rotation: -45, step: Math.max(1, Math.floor(cats.length / 10)) } },
      yAxis: { title: { text: '' }, gridLineColor: '#2e2e36', labels: { style: { color: '#f0f0f2' } } },
      credits: { enabled: false },
      legend: { itemStyle: { color: '#f0f0f2', fontSize: '9px' } },
      series: [
        { name: 'Vendas', data: vendasPorDia, color: '#10b981', borderWidth: 0 },
        { name: 'Despesas', data: despPorDia, color: '#ef4444', borderWidth: 0 },
      ],
    } as any;
  }, [Highcharts, vendasCiclo, despesasCiclo, ciclo]);

  return (
    <div className="space-y-3">
      {/* Gráfico vendas vs despesas por dia — TOPO */}
      {Highcharts && HighchartsReact && chartOptions && (
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-400">Demonstrativo</span>
        <button onClick={() => { setRefreshing(true); setTs(Date.now()); setTimeout(() => setRefreshing(false), 800); }} className="text-content-muted hover:text-content transition-colors">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Estoque do ciclo */}
      <div className="rounded-lg bg-elevated p-2.5">
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-[9px] text-content-muted font-medium">Estoque do ciclo</p>
          <p className="text-[10px] text-content-secondary">{totalPctVendidos}/{totalPctInicial} pct · Restam {totalPecasRestantes} pçs (~{Math.floor(totalPecasRestantes / PECAS_POR_PACOTE)}{totalPecasRestantes % PECAS_POR_PACOTE > 0 ? `+${totalPecasRestantes % PECAS_POR_PACOTE}` : ''} pct)</p>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {estoqueCiclo.map((p, i) => {
            const restPct = p.pacotesInicial - p.pctVendidos;
            const cor = restPct <= 0 ? 'text-content-muted' : restPct < 3 ? 'text-red-400' : restPct < 7 ? 'text-orange-400' : restPct < 10 ? 'text-yellow-400' : 'text-green-400';
            return (
            <div key={i} className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center text-xs ${cor}`}>
              <span className="truncate">{p.modelo}</span>
              <span className="whitespace-nowrap">{p.pctVendidos}/{p.pacotesInicial} pct{p.avulsos > 0 ? <span className="text-content-muted"> +{p.avulsos}</span> : ''}</span>
              <span className="whitespace-nowrap w-20 text-center">{restPct > 0 ? `${restPct} restante${restPct > 1 ? 's' : ''}` : 'esgotado'}</span>
              <span className="font-medium whitespace-nowrap w-24 text-right">{formatCurrency(p.valorVendido)}</span>
            </div>
            );
          })}
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-2">
        <div onClick={() => navigate(`/vendas?${ciclo.dataInicio ? `dataInicio=${ciclo.dataInicio}` : ''}${ciclo.dataFim ? `&dataFim=${ciclo.dataFim}` : ''}`)} className="rounded-lg bg-elevated p-2.5 cursor-pointer hover:bg-border-medium transition-colors">
          <p className="text-[9px] text-content-muted">Vendas</p>
          <p className="text-sm font-bold text-green-400">{formatCurrency(totalVendas)}</p>
          <p className="text-[9px] text-content-muted">{vendasCiclo.length} venda(s)</p>
        </div>
        <div onClick={() => navigate(`/despesas?${ciclo.dataInicio ? `dataInicio=${ciclo.dataInicio}` : ''}${ciclo.dataFim ? `&dataFim=${ciclo.dataFim}` : ''}`)} className="rounded-lg bg-elevated p-2.5 cursor-pointer hover:bg-border-medium transition-colors">
          <p className="text-[9px] text-content-muted">Despesas</p>
          <p className="text-sm font-bold text-red-400">{formatCurrency(totalDespesas)}</p>
          <p className="text-[9px] text-content-muted">Interno {formatCurrency(despesasInterno)} · Externo {formatCurrency(despesasExterno)}</p>
        </div>
        <div onClick={() => setCaixaModal(true)} className="rounded-lg bg-elevated p-2.5 cursor-pointer hover:bg-border-medium transition-colors">
          <p className="text-[9px] text-content-muted">Caixa interno</p>
          <p className={`text-sm font-bold ${saldoCaixaInterno >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCurrency(saldoCaixaInterno)}</p>
          <p className="text-[9px] text-content-muted">Entrada {formatCurrency(caixaInterno)} · Cob {formatCurrency(cobrancasDinheiro)} · Desp {formatCurrency(despesasInterno)} · Vale {formatCurrency(valesInterno)} · Dep {formatCurrency(totalDepositos)}</p>
        </div>
        <div onClick={() => navigate(`/despesas?${ciclo.dataInicio ? `dataInicio=${ciclo.dataInicio}` : ''}${ciclo.dataFim ? `&dataFim=${ciclo.dataFim}` : ''}&caixa=caixa_externo`)} className="rounded-lg bg-elevated p-2.5 cursor-pointer hover:bg-border-medium transition-colors">
          <p className="text-[9px] text-content-muted">Gastos caixa externo</p>
          <p className="text-sm font-bold text-yellow-400">{formatCurrency(despesasExterno + valesExterno)}</p>
          <p className="text-[9px] text-content-muted">Desp {formatCurrency(despesasExterno)} · Vale {formatCurrency(valesExterno)}</p>
        </div>
        <div onClick={() => setDepositosModal(true)} className="rounded-lg bg-elevated p-2.5 cursor-pointer hover:bg-border-medium transition-colors">
          <p className="text-[9px] text-content-muted">Depósitos <span className="text-blue-400">+</span></p>
          <p className="text-sm font-bold text-blue-400">{formatCurrency(totalDepositos)}</p>
          <p className="text-[9px] text-content-muted">{depositosCiclo.length} depósito(s)</p>
        </div>
        <div className="rounded-lg bg-elevated p-2.5">
          <p className="text-[9px] text-content-muted">Vales</p>
          <p className="text-sm font-bold text-orange-400">{formatCurrency(totalVales)}</p>
          <p className="text-[9px] text-content-muted">Int {formatCurrency(valesInterno)} · Ext {formatCurrency(valesExterno)}</p>
        </div>
        <div onClick={() => setCobrancasModal(true)} className="rounded-lg bg-elevated p-2.5 cursor-pointer hover:bg-border-medium transition-colors">
          <p className="text-[9px] text-content-muted">Cobranças <span className="text-blue-400">+</span></p>
          <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalCobrancas)}</p>
          <p className="text-[9px] text-content-muted">💵 {formatCurrency(cobrancasDinheiro)} · Pix {formatCurrency(cobrancasPix)}</p>
        </div>
        <div className="rounded-lg bg-elevated p-2.5">
          <p className="text-[9px] text-content-muted">Saldo</p>
          <p className={`text-sm font-bold ${totalVendas - totalDespesas >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totalVendas - totalDespesas)}</p>
          <p className="text-[9px] text-content-muted">Vendas - Despesas</p>
        </div>
      </div>

      {/* Pagamento breakdown + Top modelos */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-elevated p-2.5">
          <p className="text-[9px] text-content-muted font-medium mb-2">Pagamentos</p>
          <div className="space-y-1.5">
            {[
              { label: 'Dinheiro', valor: caixaInterno, cor: 'text-green-400', bg: 'bg-green-500' },
              { label: 'Pix', valor: Math.max(0, totalAvista - caixaInterno + totalEntradas), cor: 'text-emerald-400', bg: 'bg-emerald-500' },
              { label: 'Entradas', valor: totalEntradas, cor: 'text-blue-400', bg: 'bg-blue-500' },
              { label: 'À prazo', valor: totalPrazo, cor: 'text-yellow-400', bg: 'bg-yellow-500' },
              { label: 'Cx externo', valor: despesasExterno, cor: 'text-red-400', bg: 'bg-red-500' },
            ].filter(r => r.valor > 0).map(r => {
              const max = Math.max(caixaInterno, totalPrazo, totalEntradas, despesasExterno, 1);
              return (
                <div key={r.label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-content-secondary">{r.label}</span>
                    <span className={`${r.cor} font-semibold`}>{formatCurrency(r.valor)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-surface overflow-hidden">
                    <div className={`h-full rounded-full ${r.bg} opacity-50`} style={{ width: `${(r.valor / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {porModelo.length > 0 && (
          <div className="rounded-lg bg-elevated p-2.5">
            <p className="text-[9px] text-content-muted font-medium mb-2">Vendas por modelo</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(() => { const maxM = porModelo[0]?.valor || 1; return porModelo.slice(0, 8).map(m => {
                const pct = Math.floor(m.pecas / PECAS_POR_PACOTE);
                const avulsos = m.pecas % PECAS_POR_PACOTE;
                return (
                  <div key={m.modelo}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="truncate">{m.modelo} <span className="text-content-muted">{pct} pct{avulsos > 0 ? ` +${avulsos}` : ''}</span></span>
                      <span className="text-green-400 font-semibold shrink-0 ml-2">{formatCurrency(m.valor)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-surface overflow-hidden">
                      <div className="h-full rounded-full bg-green-500 opacity-50" style={{ width: `${(m.valor / maxM) * 100}%` }} />
                    </div>
                  </div>
                );
              }); })()}
            </div>
          </div>
        )}
      </div>

      {/* Despesas por dia — colapsável */}
      {despesasPorDiaComCaixa.length > 0 && (
        <div className="rounded-lg bg-elevated">
          <button onClick={() => setDespDiaOpen(!despDiaOpen)} className="w-full flex items-center justify-between p-2.5 text-left">
            <p className="text-[9px] text-content-muted font-medium">Despesas por dia ({despesasPorDiaComCaixa.length} dias)</p>
            <ChevronDown size={14} className={`text-content-muted transition-transform ${despDiaOpen ? 'rotate-180' : ''}`} />
          </button>
          {despDiaOpen && (
            <div className="px-2.5 pb-2.5 space-y-2 max-h-60 overflow-y-auto">
              {despesasPorDiaComCaixa.map(({ dia, despesas: desps, caixaInterno: cx }) => {
                const totalDia = desps.reduce((s, d) => s + d.valor, 0);
                const label = new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
                return (
                  <div key={dia} className="rounded-md bg-surface p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-red-400">{formatCurrency(totalDia)}</span>
                        <span className={`text-[9px] font-semibold ${cx >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Cx {formatCurrency(cx)}</span>
                        <button onClick={() => navigate(`/despesas?novaData=${dia}`)} className="text-content-muted hover:text-content"><Plus size={12} /></button>
                      </div>
                    </div>
                    {desps.map((d, i) => (
                      <div key={i} className="flex justify-between text-[9px] text-content-secondary">
                        <span className="truncate">{d.tipo}{(d as any).fontePagamento === 'caixa_externo' ? ' 🏦' : ''}</span>
                        <span className="shrink-0 ml-2">{formatCurrency(d.valor)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal caixa interno */}
      {caixaModal && (
        <div className="fixed inset-0 lg:left-64 z-[120] flex items-center justify-center p-4" onClick={() => setCaixaModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <span className="text-sm font-semibold">Caixa Interno</span>
              <button onClick={() => setCaixaModal(false)} className="text-content-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className={`text-2xl font-bold text-center ${saldoCaixaInterno >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCurrency(saldoCaixaInterno)}</p>
              <div className="space-y-1.5">
                <p className="text-[10px] text-content-muted font-medium">Entradas</p>
                <div className="flex justify-between text-xs"><span className="text-content-secondary">Vendas à vista (dinheiro)</span><span className="text-green-400 font-medium">+ {formatCurrency(
                  vendasCiclo.reduce((s, v) => { const ef = (v as any).entradaForma; if (v.condicaoPagamento === 'avista') { if (ef === 'dinheiro') return s + v.valorTotal; if (ef === 'misto') return s + ((v as any).valorDinheiro || 0); } return s; }, 0)
                )}</span></div>
                <div className="flex justify-between text-xs"><span className="text-content-secondary">Entradas parcelas (dinheiro)</span><span className="text-green-400 font-medium">+ {formatCurrency(
                  vendasCiclo.reduce((s, v) => { const ef = (v as any).entradaForma; if (v.condicaoPagamento?.includes('_entrada')) { if (ef === 'dinheiro') return s + (v.valorAvista || 0); if (ef === 'misto') return s + ((v as any).valorDinheiro || 0); } return s; }, 0)
                )}</span></div>
                <div className="flex justify-between text-xs"><span className="text-content-secondary">Cobranças (dinheiro)</span><span className="text-green-400 font-medium">+ {formatCurrency(cobrancasDinheiro)}</span></div>
                <div className="border-t border-border-subtle pt-1.5 flex justify-between text-xs font-semibold"><span>Total entradas</span><span className="text-green-400">{formatCurrency(caixaInterno + cobrancasDinheiro)}</span></div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-content-muted font-medium">Saídas</p>
                <div className="flex justify-between text-xs"><span className="text-content-secondary">Despesas (caixa interno)</span><span className="text-red-400 font-medium">- {formatCurrency(despesasInterno)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-content-secondary">Vales (caixa interno)</span><span className="text-red-400 font-medium">- {formatCurrency(valesInterno)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-content-secondary">Depósitos</span><span className="text-red-400 font-medium">- {formatCurrency(totalDepositos)}</span></div>
                <div className="border-t border-border-subtle pt-1.5 flex justify-between text-xs font-semibold"><span>Total saídas</span><span className="text-red-400">{formatCurrency(despesasInterno + valesInterno + totalDepositos)}</span></div>
              </div>
              <div className="border-t border-border-subtle pt-2 flex justify-between text-sm font-bold">
                <span>Saldo</span>
                <span className={saldoCaixaInterno >= 0 ? 'text-blue-400' : 'text-red-400'}>{formatCurrency(saldoCaixaInterno)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cobranças */}
      {cobrancasModal && (
        <div className="fixed inset-0 lg:left-64 z-[120] flex items-center justify-center p-4" onClick={() => setCobrancasModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
              <div>
                <p className="text-sm font-semibold">Cobranças</p>
                <p className="text-xs text-emerald-400 font-bold">{formatCurrency(totalCobrancas)} <span className="text-content-muted font-normal">· 💵 {formatCurrency(cobrancasDinheiro)} · Pix {formatCurrency(cobrancasPix)}</span></p>
              </div>
              <button onClick={() => setCobrancasModal(false)} className="text-content-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-2">
              {cobrancas.length === 0 && !cobForm && <p className="text-xs text-content-muted text-center py-4">Nenhuma cobrança registrada</p>}
              {cobrancas.sort((a, b) => b.data.localeCompare(a.data)).map(c => (
                <div key={c.id} className="rounded-lg bg-elevated p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{c.nome}</p>
                    <p className="text-[10px] text-content-muted">{new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')} · {c.forma === 'pix' ? 'Pix' : '💵 Dinheiro'}</p>
                    {c.descricao && <p className="text-[10px] text-content-secondary mt-0.5">{c.descricao}</p>}
                    <p className="text-[10px] text-content-muted mt-0.5">por {c.registradoPorNome}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-emerald-400">{formatCurrency(c.valor)}</span>
                    <button onClick={() => { removeCobranca(ciclo.id, c.id!); setTs(Date.now()); }}
                      className="text-content-muted/40 hover:text-red-500 transition-colors"><X size={14} /></button>
                  </div>
                </div>
              ))}

              {!cobForm ? (
                <button onClick={() => setCobForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle py-2.5 text-xs text-content-muted hover:bg-elevated transition">
                  <Plus size={14} /> Adicionar cobrança
                </button>
              ) : (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-content-muted">Nome / Cliente</label>
                      <input value={cobNome} onChange={e => setCobNome(e.target.value)}
                        className="w-full rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" placeholder="Nome do cliente" />
                    </div>
                    <div>
                      <label className="text-[9px] text-content-muted">Valor</label>
                      <input type="number" step="0.01" min="0.01" value={cobValor} onChange={e => setCobValor(e.target.value)}
                        className="w-full rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" placeholder="0,00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-content-muted">Data</label>
                      <input type="date" value={cobData} onChange={e => setCobData(e.target.value)}
                        className="w-full rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-[9px] text-content-muted mb-1 block">Forma</label>
                      <div className="flex gap-1.5">
                        {([['dinheiro', '💵 Dinheiro'], ['pix', 'Pix']] as const).map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setCobForma(v)}
                            className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition ${cobForma === v ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-content-muted">Descrição (opcional)</label>
                    <input value={cobDesc} onChange={e => setCobDesc(e.target.value)}
                      className="w-full rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" placeholder="Ex: parcela atrasada" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCobForm(false)} className="flex-1 rounded-lg border border-border-subtle py-1.5 text-[10px] text-content-secondary hover:bg-border-medium transition">Cancelar</button>
                    <button disabled={cobSaving || !cobNome.trim() || !cobValor} onClick={async () => {
                      setCobSaving(true);
                      try {
                        await addCobranca(ciclo.id, {
                          nome: cobNome.trim(), valor: parseFloat(cobValor), data: cobData, forma: cobForma,
                          ...(cobDesc.trim() ? { descricao: cobDesc.trim() } : {}),
                        });
                        setCobForm(false); setCobNome(''); setCobValor(''); setCobDesc(''); setCobForma('dinheiro');
                        setTs(Date.now());
                      } finally { setCobSaving(false); }
                    }}
                      className="flex-1 rounded-lg bg-blue-600 py-1.5 text-[10px] font-medium text-white hover:bg-blue-500 disabled:opacity-30 transition">
                      {cobSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal depósitos */}
      {depositosModal && (
        <div className="fixed inset-0 lg:left-64 z-[120] flex items-center justify-center p-4" onClick={() => setDepositosModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
              <div>
                <p className="text-sm font-semibold">Depósitos</p>
                <p className="text-xs text-blue-400 font-bold">{formatCurrency(totalDepositos)} <span className="text-content-muted font-normal">· {depositosCiclo.length} depósito(s)</span></p>
              </div>
              <button onClick={() => setDepositosModal(false)} className="text-content-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-2">
              {depositosCiclo.length === 0 && !depForm && <p className="text-xs text-content-muted text-center py-4">Nenhum depósito registrado</p>}
              {depositosCiclo.sort((a, b) => b.data.localeCompare(a.data)).map(dep => (
                <div key={dep.id} className="rounded-lg bg-elevated p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-blue-400">{formatCurrency(dep.valor)}</p>
                    <p className="text-[10px] text-content-muted">{new Date(dep.data).toLocaleDateString('pt-BR')} · {dep.depositanteNome}</p>
                    {dep.imagemUrl && <img src={dep.imagemUrl} alt="Comprovante" className="mt-1 rounded-lg max-h-20 object-contain" />}
                    {dep.semFoto && dep.justificativa && <p className="text-[10px] text-content-secondary mt-0.5">Sem foto: {dep.justificativa}</p>}
                  </div>
                  <button onClick={() => { deleteDeposito(dep.id); setTs(Date.now()); }}
                    className="text-content-muted/40 hover:text-red-500 transition-colors shrink-0"><X size={14} /></button>
                </div>
              ))}

              {!depForm ? (
                <button onClick={() => setDepForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle py-2.5 text-xs text-content-muted hover:bg-elevated transition">
                  <Plus size={14} /> Adicionar depósito
                </button>
              ) : (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-content-muted">Valor</label>
                      <input type="number" step="0.01" min="0.01" value={depValor} onChange={e => setDepValor(e.target.value)}
                        className="w-full rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" placeholder="0,00" />
                    </div>
                    <div>
                      <label className="text-[9px] text-content-muted">Data</label>
                      <input type="date" value={depData} onChange={e => setDepData(e.target.value)}
                        className="w-full rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-content-muted">Comprovante</label>
                    {depImagemPreview && (
                      <div className="relative mb-1">
                        <img src={depImagemPreview} alt="Preview" className="rounded-lg border border-border-subtle max-h-24 object-contain w-full" />
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle bg-elevated py-1.5 text-[10px] text-content-muted cursor-pointer hover:bg-border-medium transition-colors">
                      <ImageIcon size={12} /> {depImagemPreview ? 'Trocar' : 'Adicionar foto'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setDepImagem(f); setDepImagemPreview(URL.createObjectURL(f)); setDepSemFoto(false); }
                      }} />
                    </label>
                    {!depImagem && (
                      <label className="flex items-center gap-2 mt-1 text-[10px] text-content-secondary cursor-pointer">
                        <input type="checkbox" checked={depSemFoto} onChange={e => setDepSemFoto(e.target.checked)} className="rounded" />
                        Sem comprovante
                      </label>
                    )}
                    {depSemFoto && !depImagem && (
                      <input value={depJustificativa} onChange={e => setDepJustificativa(e.target.value)}
                        className="w-full rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500 mt-1" placeholder="Justificativa" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setDepForm(false); setDepImagem(null); setDepImagemPreview(null); setDepSemFoto(false); setDepJustificativa(''); }}
                      className="flex-1 rounded-lg border border-border-subtle py-1.5 text-[10px] text-content-secondary hover:bg-border-medium transition">Cancelar</button>
                    <button disabled={depSaving || !depValor || (!depImagem && !depSemFoto)} onClick={async () => {
                      setDepSaving(true);
                      try {
                        let imagemUrl: string | undefined;
                        if (depImagem) imagemUrl = await uploadImage(depImagem, 'depositos');
                        await createDeposito({
                          valor: parseFloat(depValor),
                          data: depData + 'T12:00:00.000Z',
                          depositanteId: user?.uid || ciclo.vendedorId,
                          depositanteNome: user?.nome || ciclo.vendedorNome,
                          ...(imagemUrl ? { imagemUrl } : {}),
                          ...(depSemFoto ? { semFoto: true, justificativa: depJustificativa.trim() } : {}),
                          cicloId: ciclo.id,
                        } as any);
                        setDepForm(false); setDepValor(''); setDepImagem(null); setDepImagemPreview(null); setDepSemFoto(false); setDepJustificativa('');
                        setTs(Date.now());
                      } finally { setDepSaving(false); }
                    }}
                      className="flex-1 rounded-lg bg-blue-600 py-1.5 text-[10px] font-medium text-white hover:bg-blue-500 disabled:opacity-30 transition">
                      {depSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
