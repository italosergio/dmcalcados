import { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Phone, Calendar, User, ShoppingBag, TrendingUp, Award, UserCircle, CreditCard, Package, ExternalLink, Pencil, Check, Plus, Share2, Ban, ChevronDown } from 'lucide-react';
import { suspenderCliente } from '~/services/clientes.service';
import { formatCurrency } from '~/utils/format';
import type { Cliente, Venda, User as UserType } from '~/models';
import { userIsAdmin } from '~/models';

const chartTheme = {
  backgroundColor: '#232328',
  textColor: '#f0f0f2',
  gridColor: '#2e2e36'
};

const inputCls = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type Periodo = '3m' | '6m' | '1a';

interface Props {
  cliente: Cliente;
  vendas: Venda[];
  onClose: () => void;
  onNavigateVenda?: (vendaId: string) => void;
  user?: UserType | null;
  vendedores?: UserType[];
  onEdit?: (clienteId: string, data: Partial<Cliente>) => Promise<void>;
  onShare?: (clienteId: string, userIds: string[]) => Promise<void>;
}

export function ClienteModal({ cliente, vendas, onClose, onNavigateVenda, user, vendedores = [], onEdit, onShare }: Props) {
  const [vendaAberta, setVendaAberta] = useState<Venda | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('1a');
  const [Highcharts, setHighcharts] = useState<any>(null);
  const [HighchartsReact, setHighchartsReact] = useState<any>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Cliente>>({});
  const [editContatos, setEditContatos] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editErro, setEditErro] = useState('');

  // Share state
  const [compartilhados, setCompartilhados] = useState<string[]>(cliente.compartilhadoCom || []);
  const [shareExpanded, setShareExpanded] = useState(false);

  // Suspender state
  const [suspenso, setSuspenso] = useState(!!cliente.suspenso);

  const isAdmin = user ? userIsAdmin(user as any) : false;
  const podeCompartilhar = user ? isAdmin || cliente.donoId === (user?.uid || user?.id) : false;

  const fetchCidades = (uf: string) => {
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => setCidades(data.map(c => c.nome)))
      .catch(() => setCidades([]));
  };

  const startEdit = () => {
    setEditing(true);
    setEditErro('');
    setEditData({ nome: cliente.nome, endereco: cliente.endereco, cidade: cliente.cidade || '', estado: cliente.estado || 'MA', cpfCnpj: cliente.cpfCnpj });
    setEditContatos(cliente.contatos?.length ? [...cliente.contatos] : cliente.contato ? [cliente.contato] : ['']);
    fetchCidades(cliente.estado || 'MA');
  };

  const saveEdit = async () => {
    if (!onEdit) return;
    setSaving(true);
    setEditErro('');
    try {
      const contatosFiltrados = editContatos.filter(c => c.trim());
      await onEdit(cliente.id, { ...editData, contato: contatosFiltrados[0] || '', contatos: contatosFiltrados });
      setEditing(false);
    } catch (err) {
      setEditErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const formatContato = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 2) return nums.length ? `(${nums}` : '';
    if (nums.length <= 3) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3)}`;
    return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3,7)}-${nums.slice(7)}`;
  };

  const toggleCompartilhar = async (uid: string) => {
    if (!onShare) return;
    const next = compartilhados.includes(uid) ? compartilhados.filter(id => id !== uid) : [...compartilhados, uid];
    setCompartilhados(next);
    await onShare(cliente.id, next);
  };

  const toggleSuspender = async () => {
    const next = !suspenso;
    setSuspenso(next);
    await suspenderCliente(cliente.id, next);
  };

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
          <div className="rounded-lg bg-elevated p-2.5 space-y-1 relative group">
            {onEdit && !editing && (
              <button onClick={startEdit} className="absolute top-2 right-2 rounded-md p-1 text-content-muted/40 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Editar">
                <Pencil size={13} />
              </button>
            )}
            {!editing ? (
              <>
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
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }} className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-blue-400">Editando</span>
                  <button type="button" onClick={() => setEditing(false)} className="text-content-muted hover:text-content"><X size={16} /></button>
                </div>
                <input value={editData.nome || ''} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} className={inputCls} placeholder="Nome" />
                <input value={editData.cpfCnpj || ''} onChange={(e) => setEditData({ ...editData, cpfCnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })} className={inputCls} placeholder="CPF / CNPJ" inputMode="numeric" />
                <input value={editData.endereco || ''} onChange={(e) => setEditData({ ...editData, endereco: e.target.value })} className={inputCls} placeholder="Endereço" />
                <div className="grid grid-cols-[5rem_1fr] gap-2">
                  <select value={editData.estado || 'MA'} onChange={(e) => { setEditData({ ...editData, estado: e.target.value, cidade: '' }); fetchCidades(e.target.value); }} className={inputCls}>
                    {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                  <div>
                    <input value={editData.cidade || ''} onChange={(e) => setEditData({ ...editData, cidade: e.target.value })} className={inputCls} list="modal-edit-cidades" placeholder="Cidade" />
                    <datalist id="modal-edit-cidades">{cidades.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>
                {editContatos.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={c} onChange={(e) => { const arr = [...editContatos]; arr[i] = formatContato(e.target.value); setEditContatos(arr); }} className={inputCls} placeholder="Contato" inputMode="tel" />
                    {editContatos.length > 1 && (
                      <button onClick={() => setEditContatos(editContatos.filter((_, j) => j !== i))} className="rounded-lg px-2 text-red-500/60 hover:text-red-500"><X size={16} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setEditContatos([...editContatos, ''])} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                  <Plus size={14} /> Adicionar contato
                </button>
                {editErro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{editErro}</div>}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border-subtle bg-elevated py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">Cancelar</button>
                  <button type="submit" disabled={saving}
                    className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2 text-sm font-semibold text-white transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-1.5">
                    <Check size={16} /> {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Compartilhar */}
          {podeCompartilhar && onShare && vendedores.length > 0 && (
            <div className="rounded-lg bg-elevated p-2.5">
              <button onClick={() => setShareExpanded(!shareExpanded)} className="w-full flex items-center justify-between text-content-muted hover:text-content transition-colors">
                <div className="flex items-center gap-1.5">
                  <Share2 size={12} />
                  <span className="text-[10px] font-medium">Compartilhar com vendedores</span>
                  {compartilhados.length > 0 && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">{compartilhados.length}</span>}
                </div>
                <ChevronDown size={14} className={`transition-transform ${shareExpanded ? 'rotate-180' : ''}`} />
              </button>
              {shareExpanded && (
                <div className="space-y-1 max-h-32 overflow-y-auto mt-2 pt-2 border-t border-border-subtle">
                  {vendedores.map(v => {
                    const uid = v.uid || v.id;
                    const checked = compartilhados.includes(uid);
                    return (
                      <label key={uid} className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-surface cursor-pointer transition-colors">
                        <button type="button" role="switch" aria-checked={checked} onClick={() => toggleCompartilhar(uid)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-border-medium'}`}>
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </button>
                        <span className="text-xs">{v.nome}</span>
                        <span className="text-[10px] text-content-muted ml-auto">@{v.username}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
          {/* Suspender cliente */}
          {isAdmin && (
            <label className="flex items-center justify-between rounded-lg bg-elevated p-2.5 cursor-pointer">
              <div className="flex items-center gap-1.5">
                <Ban size={13} className={suspenso ? 'text-red-400' : 'text-content-muted'} />
                <span className="text-xs font-medium">{suspenso ? 'Cliente suspenso' : 'Suspender cliente'}</span>
              </div>
              <button type="button" role="switch" aria-checked={suspenso} onClick={toggleSuspender}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${suspenso ? 'bg-red-500' : 'bg-border-medium'}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${suspenso ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
              </button>
            </label>
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
