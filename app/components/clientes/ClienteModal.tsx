import { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Phone, Calendar, User, ShoppingBag, TrendingUp, Award, UserCircle, CreditCard, Package, ExternalLink } from 'lucide-react';
import { formatCurrency } from '~/utils/format';
import type { Cliente, Venda } from '~/models';

const chartTheme = {
  backgroundColor: '#232328',
  textColor: '#f0f0f2',
  gridColor: '#2e2e36'
};

type Periodo = '3m' | '6m' | '1a';

interface Props {
  cliente: Cliente;
  vendas: Venda[];
  onClose: () => void;
  onNavigateVenda?: (vendaId: string) => void;
}

export function ClienteModal({ cliente, vendas, onClose, onNavigateVenda }: Props) {
  const [vendaAberta, setVendaAberta] = useState<Venda | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('1a');
  const [Highcharts, setHighcharts] = useState<any>(null);
  const [HighchartsReact, setHighchartsReact] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import('highcharts'),
      import('highcharts-react-official'),
    ]).then(([hc, hcr]) => {
      setHighcharts(hc.default);
      setHighchartsReact(hcr.default);
    });
  }, []);

  const clienteVendas = useMemo(() =>
    vendas.filter(v => v.clienteId === cliente.id && !v.deletedAt)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [vendas, cliente.id]
  );

  const totalDesde = clienteVendas.reduce((s, v) => s + v.valorTotal, 0);

  const now = new Date();
  const inicioAno = new Date(now.getFullYear(), 0, 1);
  const inicio3m = new Date(now);
  inicio3m.setMonth(now.getMonth() - 3);

  const totalAno = clienteVendas.filter(v => new Date(v.data) >= inicioAno).reduce((s, v) => s + v.valorTotal, 0);
  const total3m = clienteVendas.filter(v => new Date(v.data) >= inicio3m).reduce((s, v) => s + v.valorTotal, 0);

  // Modelos mais comprados (pares e pacotes)
  const modeloMap: Record<string, { modelo: string; pares: number; pacotes: number }> = {};
  clienteVendas.forEach(v => v.produtos.forEach(p => {
    const k = p.modelo;
    if (!modeloMap[k]) modeloMap[k] = { modelo: k, pares: 0, pacotes: 0 };
    if (p.tipo === 'pacote') {
      modeloMap[k].pacotes += p.quantidade;
      modeloMap[k].pares += p.quantidade * 15;
    } else {
      modeloMap[k].pares += p.quantidade;
    }
  }));
  const topModelos = Object.values(modeloMap).sort((a, b) => b.pares - a.pares);

  // Vendedores rankeados por total vendido pra este cliente
  const vendedorMap: Record<string, { nome: string; total: number }> = {};
  clienteVendas.forEach(v => {
    if (!vendedorMap[v.vendedorId]) vendedorMap[v.vendedorId] = { nome: v.vendedorNome, total: 0 };
    vendedorMap[v.vendedorId].total += v.valorTotal;
  });
  const vendedoresRanked = Object.values(vendedorMap).sort((a, b) => b.total - a.total);

  // Gráfico de compras por mês
  const mesesAtras = periodo === '3m' ? 3 : periodo === '6m' ? 6 : 12;
  const chartData = useMemo(() => {
    const cats: string[] = [];
    const vals: number[] = [];
    for (let i = mesesAtras - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mesAno = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      cats.push(mesAno);
      const total = clienteVendas
        .filter(v => {
          const dv = new Date(v.data);
          return dv.getMonth() === d.getMonth() && dv.getFullYear() === d.getFullYear();
        })
        .reduce((s, v) => s + v.valorTotal, 0);
      vals.push(total);
    }
    return { cats, vals };
  }, [clienteVendas, mesesAtras]);

  const chartOptions = Highcharts ? {
    chart: { type: 'area', backgroundColor: chartTheme.backgroundColor, height: 200 },
    title: { text: undefined },
    xAxis: { categories: chartData.cats, labels: { style: { color: chartTheme.textColor, fontSize: '10px' } }, lineColor: chartTheme.gridColor, tickColor: chartTheme.gridColor },
    yAxis: { title: { text: undefined }, gridLineColor: chartTheme.gridColor, labels: { style: { color: chartTheme.textColor, fontSize: '10px' }, formatter: function(this: any) { return formatCurrency(this.value); } } },
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { formatter: function(this: any) { return `<b>${this.x}</b><br/>${formatCurrency(this.y)}`; } },
    plotOptions: { area: { fillOpacity: 0.15, marker: { radius: 3 } } },
    series: [{ name: 'Compras', data: chartData.vals, color: '#10b981' }],
  } : null;

  const contatos = cliente.contatos?.length ? cliente.contatos : cliente.contato ? [cliente.contato] : [];

  return (
    <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
          <h3 className="font-semibold truncate">{cliente.nome}</h3>
          <button onClick={onClose} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Dados do cliente */}
          <div className="rounded-lg bg-elevated p-2.5 space-y-1">
            {cliente.cpfCnpj && <p className="text-xs text-content-secondary">{cliente.cpfCnpj.length <= 11 ? 'CPF' : 'CNPJ'}: {cliente.cpfCnpj}</p>}
            {(cliente.endereco || cliente.cidade) && (
              <p className="flex items-center gap-1.5 text-xs text-content-secondary"><MapPin size={12} className="text-content-muted shrink-0" />{[cliente.endereco, cliente.cidade, cliente.estado].filter(Boolean).join(' · ')}</p>
            )}
            {contatos.map((c, i) => (
              <p key={i} className="flex items-center gap-1.5 text-xs text-content-secondary"><Phone size={12} className="text-content-muted shrink-0" />{c}</p>
            ))}
            {cliente.createdAt && (
              <p className="flex items-center gap-1.5 text-[10px] text-content-muted"><Calendar size={11} className="shrink-0" />Cliente desde {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}</p>
            )}
          </div>

          {/* Gráfico */}
          {clienteVendas.length > 0 && (
            <div className="rounded-lg bg-elevated p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-content-muted">Compras ao longo do tempo</span>
                <div className="flex items-center bg-surface rounded-md p-0.5">
                  {([['3m', '3M'], ['6m', '6M'], ['1a', '1A']] as [Periodo, string][]).map(([v, l]) => (
                    <button key={v} onClick={() => setPeriodo(v)}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${periodo === v ? 'bg-elevated text-content shadow-sm' : 'text-content-muted hover:text-content'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {Highcharts && HighchartsReact && chartOptions && (
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              )}
            </div>
          )}

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-elevated p-2.5">
              <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><ShoppingBag size={12} /><span className="text-[10px]">Total desde cadastro</span></div>
              <p className="text-sm font-bold text-green-400">{formatCurrency(totalDesde)}</p>
              <p className="text-[10px] text-content-muted">{clienteVendas.length} compra(s)</p>
            </div>
            <div className="rounded-lg bg-elevated p-2.5">
              <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><TrendingUp size={12} /><span className="text-[10px]">No ano</span></div>
              <p className="text-sm font-bold text-blue-400">{formatCurrency(totalAno)}</p>
            </div>
            <div className="rounded-lg bg-elevated p-2.5">
              <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Últimos 3 meses</span></div>
              <p className="text-sm font-bold text-yellow-400">{formatCurrency(total3m)}</p>
            </div>
            {vendedoresRanked.length > 0 && (
              <div className="rounded-lg bg-elevated p-2.5">
                <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><User size={12} /><span className="text-[10px]">Vendedores</span></div>
                {vendedoresRanked.map((v, i) => (
                  <div key={v.nome} className="flex items-center justify-between text-xs mt-0.5">
                    <span className="truncate">{v.nome}</span>
                    <span className="text-green-400 shrink-0 ml-2 font-medium">{formatCurrency(v.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top modelos */}
          {topModelos.length > 0 && (
            <div className="rounded-lg bg-elevated p-2.5">
              <div className="flex items-center gap-1.5 text-content-muted mb-1.5"><Award size={12} /><span className="text-[10px] font-medium">Modelos mais comprados</span></div>
              <div className="space-y-1">
                {topModelos.map((m, i) => (
                  <div key={m.modelo} className="flex items-center justify-between text-xs">
                    <span className="truncate"><span className="text-content-muted mr-1.5">{i + 1}º</span>{m.modelo}</span>
                    <span className="text-content-muted shrink-0 ml-2">
                      {m.pacotes > 0 && <>{m.pacotes} pct · </>}{m.pares} pares
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de vendas */}
          {clienteVendas.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-content-muted mb-1.5">Histórico de vendas</p>
              <div className="rounded-xl border border-border-subtle overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle bg-elevated/50">
                      <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Data</th>
                      <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Produtos</th>
                      <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Vendedor</th>
                      <th className="px-2.5 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {clienteVendas.map(venda => (
                      <tr key={venda.id} onClick={() => setVendaAberta(venda)} className="cursor-pointer hover:bg-surface-hover transition-colors">
                        <td className="px-2.5 py-2 text-xs text-content-muted whitespace-nowrap">{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
                        <td className="px-2.5 py-2 text-xs text-content-secondary">
                          {venda.produtos.map((p, i) => (
                            <span key={i}>{i > 0 && ', '}{p.quantidade}x {p.modelo}</span>
                          ))}
                        </td>
                        <td className="px-2.5 py-2 text-xs text-content-muted truncate max-w-[100px] hidden sm:table-cell">{venda.vendedorNome}</td>
                        <td className="px-2.5 py-2 text-xs font-semibold text-green-400 text-right whitespace-nowrap">{formatCurrency(venda.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mini-modal da venda por cima */}
      {vendaAberta && (() => {
        const v = vendaAberta;
        const condicao = v.condicaoPagamento;
        const temEntrada = condicao?.includes('_entrada');
        return (
          <div className="fixed inset-0 lg:left-64 z-[110] flex items-center justify-center p-4" onClick={() => setVendaAberta(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  {v.pedidoNumero && <span className="text-xs bg-elevated px-2.5 py-1 rounded-md font-mono font-semibold">#{v.pedidoNumero}</span>}
                </div>
                <button onClick={() => setVendaAberta(null)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
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
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-content-muted mb-1.5"><Package size={12} /><span className="text-[10px] font-medium">Produtos</span></div>
                  <div className="space-y-1">
                    {v.produtos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-elevated p-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{p.modelo}</p>
                          <p className="text-[10px] text-content-muted">
                            {p.tipo === 'pacote'
                              ? `${p.quantidade} pct × ${formatCurrency(p.valorUnitario * 15)}`
                              : `${p.quantidade} un × ${formatCurrency(p.valorUnitario)}`
                            }
                          </p>
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
                <p className="text-[10px] text-content-muted text-center">Registrado em {new Date(v.createdAt).toLocaleString('pt-BR')}</p>
                {onNavigateVenda && (
                  <button onClick={() => onNavigateVenda(v.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-elevated py-2 text-xs font-medium text-content-secondary hover:bg-border-medium transition-colors">
                    <ExternalLink size={13} /> Ver completo em Vendas
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
