import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { Navigate } from 'react-router';
import { getCiclos, createCiclo, fecharCiclo } from '~/services/ciclos.service';
import { getUsers } from '~/services/users.service';
import { getProdutos } from '~/services/produtos.service';
import { formatCurrency } from '~/utils/format';
import type { Ciclo, CicloProduto, Produto, User } from '~/models';
import { userIsAdmin, userIsVendedor, userCanAccessAdmin } from '~/models';
import { Plus, Minus, X, Package, ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const PECAS_POR_PACOTE = 15;

export default function CiclosPage() {
  const { user } = useAuth();
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [vendedores, setVendedores] = useState<User[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendedorId, setVendedorId] = useState('');
  const [itensCiclo, setItensCiclo] = useState<{ produtoId: string; pacotes: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);
  const [modalCiclo, setModalCiclo] = useState<Ciclo | null>(null);
  const [fecharClicks, setFecharClicks] = useState(0);
  const [fecharTimer, setFecharTimer] = useState<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    const [c, u, p] = await Promise.all([getCiclos(), getUsers(), getProdutos()]);
    setCiclos(c);
    setVendedores(u.filter(x => userIsVendedor(x)));
    setProdutos(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!user || !userCanAccessAdmin(user)) return <Navigate to="/vendas" replace />;
  if (loading) return <div className="flex items-center justify-center py-20 text-content-secondary">Carregando...</div>;

  const vendedoresComCiclo = vendedores.map(v => {
    const uid = v.uid || v.id;
    const ciclosV = ciclos.filter(c => c.vendedorId === uid);
    const ativo = ciclosV.find(c => c.status === 'ativo');
    const fechados = ciclosV.filter(c => c.status === 'fechado');
    return { ...v, uid, ativo, fechados, total: ciclosV.length };
  });

  const addItem = () => setItensCiclo([...itensCiclo, { produtoId: '', pacotes: 1 }]);
  const removeItem = (i: number) => setItensCiclo(itensCiclo.filter((_, j) => j !== i));
  const updateItem = (i: number, field: 'produtoId' | 'pacotes', value: string | number) => {
    setItensCiclo(itensCiclo.map((item, j) => j === i ? { ...item, [field]: value } : item));
  };

  const vendedorSelecionado = vendedoresComCiclo.find(v => v.uid === vendedorId);
  const vendedorTemCicloAtivo = vendedorSelecionado?.ativo != null;

  const handleCriar = async () => {
    if (!vendedorId || itensCiclo.length === 0) return;
    const vendedor = vendedores.find(v => (v.uid || v.id) === vendedorId);
    if (!vendedor) return;

    const prodsCiclo = itensCiclo
      .filter(item => item.produtoId && item.pacotes > 0)
      .map(item => {
        const prod = produtos.find(p => p.id === item.produtoId)!;
        return {
          produtoId: prod.id,
          modelo: prod.modelo,
          referencia: prod.referencia,
          pacotes: item.pacotes,
          valorUnitario: prod.valor,
        };
      });

    if (prodsCiclo.length === 0) return;
    setSaving(true);
    setErro('');
    try {
      await createCiclo(vendedorId, vendedor.nome, prodsCiclo);
      setShowForm(false);
      setVendedorId('');
      setItensCiclo([]);
      await load();
    } catch (e: any) {
      setErro(e.message || 'Erro ao criar ciclo');
    } finally { setSaving(false); }
  };

  const handleFechar = async (cicloId: string) => {
    const clicks = fecharClicks + 1;
    clearTimeout(fecharTimer);
    if (clicks >= 3) {
      setFecharClicks(0);
      try {
        await fecharCiclo(cicloId);
        setModalCiclo(null);
        await load();
      } catch (e: any) {
        setErro(e.message);
      }
    } else {
      setFecharClicks(clicks);
      setFecharTimer(setTimeout(() => setFecharClicks(0), 3000));
    }
  };

  const fecharLabel = fecharClicks === 0 ? 'Fechar ciclo' : fecharClicks === 1 ? 'Tem certeza?' : 'Confirmar!';

  const prods = (c: Ciclo) => c.produtos || [];
  const totalPecas = (c: Ciclo) => prods(c).reduce((s, p) => s + p.pecasAtual, 0);
  const totalPacotesInicial = (c: Ciclo) => prods(c).reduce((s, p) => s + p.pacotesInicial, 0);
  const totalVendidoPecas = (c: Ciclo) => prods(c).reduce((s, p) => s + (p.pecasInicial - p.pecasAtual), 0);
  const totalVendidoPacotes = (c: Ciclo) => Math.floor(totalVendidoPecas(c) / PECAS_POR_PACOTE);
  const totalVendidoValor = (c: Ciclo) => prods(c).reduce((s, p) => s + (p.pecasInicial - p.pecasAtual) * p.valorUnitario, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ciclos de Estoque</h1>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) addItem(); }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 transition">
          <Plus size={14} /> Novo Ciclo
        </button>
      </div>

      {/* Form novo ciclo */}
      {showForm && (
        <div className="rounded-lg border border-blue-500/30 bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-400">Novo ciclo</span>
            <button onClick={() => { setShowForm(false); setErro(''); }} className="text-content-muted hover:text-content"><X size={16} /></button>
          </div>

          <div>
            <label className="text-xs text-content-muted mb-1 block">Vendedor</label>
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className={input}>
              <option value="">Selecione...</option>
              {vendedoresComCiclo.map(v => (
                <option key={v.uid} value={v.uid} disabled={!!v.ativo}>
                  {v.nome} {v.ativo ? '(ciclo ativo)' : ''}
                </option>
              ))}
            </select>
            {vendedorTemCicloAtivo && <p className="text-xs text-red-400 mt-1">Este vendedor já possui um ciclo ativo.</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-content-muted block">Produtos (em pacotes de 15)</label>
            {itensCiclo.map((item, i) => {
              const prod = produtos.find(p => p.id === item.produtoId);
              const estoqueDisp = prod ? Math.floor(prod.estoque / 15) : 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <select value={item.produtoId} onChange={e => updateItem(i, 'produtoId', e.target.value)} className={`${input} flex-1`}>
                    <option value="">Produto...</option>
                    {produtos.filter(p => p.estoque >= 15).map(p => (
                      <option key={p.id} value={p.id}>{p.modelo} ({p.referencia}) — {Math.floor(p.estoque / 15)} pct</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-0">
                    <button type="button" onClick={() => updateItem(i, 'pacotes', Math.max(1, item.pacotes - 1))}
                      className="rounded-l-lg border border-border-subtle bg-elevated px-2 py-2.5 text-content-secondary hover:bg-border-medium transition-colors"><Minus size={14} /></button>
                    <span className="border-y border-border-subtle bg-elevated px-3 py-2.5 text-sm font-semibold min-w-[2.5rem] text-center">{item.pacotes}</span>
                    <button type="button" onClick={() => updateItem(i, 'pacotes', Math.min(estoqueDisp || 99, item.pacotes + 1))}
                      className="rounded-r-lg border border-border-subtle bg-elevated px-2 py-2.5 text-content-secondary hover:bg-border-medium transition-colors"><Plus size={14} /></button>
                  </div>
                  <span className="text-xs text-content-muted whitespace-nowrap">{item.pacotes * 15} pçs</span>
                  {itensCiclo.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-red-500/60 hover:text-red-500"><X size={16} /></button>
                  )}
                </div>
              );
            })}
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
              <Plus size={14} /> Adicionar produto
            </button>
          </div>

          {erro && <p className="text-xs text-red-400">{erro}</p>}

          <button onClick={handleCriar} disabled={saving || !vendedorId || vendedorTemCicloAtivo || itensCiclo.every(i => !i.produtoId)}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition disabled:opacity-30">
            {saving ? 'Criando...' : 'Criar Ciclo'}
          </button>
        </div>
      )}

      {/* Lista por vendedor */}
      {vendedoresComCiclo.filter(v => v.total > 0).length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-border-subtle py-12 text-center">
          <Package size={32} className="mx-auto mb-2 text-content-muted opacity-30" />
          <p className="text-sm text-content-muted">Nenhum ciclo criado ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vendedoresComCiclo.filter(v => v.total > 0).map(v => (
            <div key={v.uid} className="rounded-lg border border-border-subtle bg-surface overflow-hidden">
              <button
                onClick={() => setExpandedVendedor(expandedVendedor === v.uid ? null : v.uid)}
                className="w-full flex items-center justify-between p-3 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  {v.ativo ? <Unlock size={14} className="text-green-400" /> : <Lock size={14} className="text-content-muted" />}
                  <div className="text-left">
                    <span className="text-sm font-medium">{v.nome}</span>
                    <p className="text-xs text-content-muted">
                      {v.ativo ? 'Ciclo ativo' : 'Sem ciclo ativo'} · {v.fechados.length} fechado{v.fechados.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {expandedVendedor === v.uid ? <ChevronDown size={16} className="text-content-muted" /> : <ChevronRight size={16} className="text-content-muted" />}
              </button>

              {expandedVendedor === v.uid && (
                <div className="border-t border-border-subtle p-3 space-y-3">
                  {/* Ciclo ativo */}
                  {v.ativo && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-400">Ciclo ativo</span>
                        <span className="text-[10px] text-content-muted">Desde {new Date(v.ativo.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-elevated p-2">
                          <p className="text-xs text-content-muted">Vendido</p>
                          <p className="text-sm font-bold text-green-400">{totalVendidoPacotes(v.ativo)}/{totalPacotesInicial(v.ativo)} pct</p>
                          <p className="text-[10px] text-content-muted">{totalVendidoPecas(v.ativo)} pçs</p>
                        </div>
                        <div className="rounded-lg bg-elevated p-2">
                          <p className="text-xs text-content-muted">Valor vendido</p>
                          <p className="text-sm font-bold text-green-400">{formatCurrency(totalVendidoValor(v.ativo))}</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border-subtle">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border-subtle bg-elevated text-left text-content-muted">
                              <th className="px-2 py-1.5">Modelo</th>
                              <th className="px-2 py-1.5 text-center">Vendido</th>
                              <th className="px-2 py-1.5 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.ativo.produtos.map((p, i) => {
                              const vendidoPecas = p.pecasInicial - p.pecasAtual;
                              const vendidoPct = Math.floor(vendidoPecas / PECAS_POR_PACOTE);
                              const avulsos = vendidoPecas % PECAS_POR_PACOTE;
                              return (
                                <tr key={i} className="border-b border-border-subtle last:border-0">
                                  <td className="px-2 py-1.5 font-medium">{p.modelo}</td>
                                  <td className="px-2 py-1.5 text-center text-green-400">{vendidoPct}/{p.pacotesInicial} pct{avulsos > 0 ? <span className="text-content-muted"> +{avulsos}</span> : ''}</td>
                                  <td className="px-2 py-1.5 text-right text-green-400">{formatCurrency(vendidoPecas * p.valorUnitario)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={() => handleFechar(v.ativo!.id)}
                        className={`w-full rounded-lg py-2 text-xs font-medium transition-colors ${
                          fecharClicks === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : fecharClicks === 1 ? 'bg-red-500/20 text-red-400'
                          : 'bg-red-600/30 text-red-300'
                        }`}
                      >
                        {fecharLabel}
                      </button>
                    </div>
                  )}

                  {/* Ciclos fechados */}
                  {v.fechados.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-content-muted">Fechados</span>
                      {v.fechados.map(c => (
                        <button key={c.id} onClick={() => { setModalCiclo(c); setFecharClicks(0); }}
                          className="w-full rounded-lg bg-elevated p-2 text-left hover:bg-border-medium transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')} — {c.closedAt ? new Date(c.closedAt).toLocaleDateString('pt-BR') : ''}</span>
                            <span className="text-green-400 font-medium">{formatCurrency(totalVendidoValor(c))} · {totalVendidoPacotes(c)}/{totalPacotesInicial(c)} pct</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal ciclo fechado */}
      {modalCiclo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalCiclo(null)}>
          <div className="w-full max-w-lg rounded-xl border border-border-subtle bg-surface p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Ciclo — {modalCiclo.vendedorNome}</h3>
              <button onClick={() => setModalCiclo(null)} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-content-muted block">Período</span>{new Date(modalCiclo.createdAt).toLocaleDateString('pt-BR')} — {modalCiclo.closedAt ? new Date(modalCiclo.closedAt).toLocaleDateString('pt-BR') : ''}</div>
              <div><span className="text-xs text-content-muted block">Valor vendido</span><span className="text-green-400 font-semibold">{formatCurrency(totalVendidoValor(modalCiclo))}</span></div>
              <div><span className="text-xs text-content-muted block">Vendido</span>{totalVendidoPacotes(modalCiclo)}/{totalPacotesInicial(modalCiclo)} pct ({totalVendidoPecas(modalCiclo)} pçs)</div>
              <div><span className="text-xs text-content-muted block">Devolvido</span>{totalPecas(modalCiclo)} pçs</div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-elevated text-left text-content-muted">
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2 text-center">Vendido</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {modalCiclo.produtos.map((p, i) => {
                    const vendidoPecas = p.pecasInicial - p.pecasAtual;
                    const vendidoPct = Math.floor(vendidoPecas / PECAS_POR_PACOTE);
                    const avulsos = vendidoPecas % PECAS_POR_PACOTE;
                    return (
                      <tr key={i} className="border-b border-border-subtle last:border-0">
                        <td className="px-3 py-2 font-medium">{p.modelo}</td>
                        <td className="px-3 py-2 text-center text-green-400">{vendidoPct}/{p.pacotesInicial} pct{avulsos > 0 ? <span className="text-content-muted"> +{avulsos}</span> : ''}</td>
                        <td className="px-3 py-2 text-right text-green-400">{formatCurrency(vendidoPecas * p.valorUnitario)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
