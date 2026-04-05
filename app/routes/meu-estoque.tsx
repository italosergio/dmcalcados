import { useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useCiclos } from '~/hooks/useRealtime';
import { formatCurrency } from '~/utils/format';
import type { Ciclo } from '~/models';
import { Package, Calendar, TrendingUp, X } from 'lucide-react';

export default function MeuEstoquePage() {
  const { user } = useAuth();
  const { ciclos: allCiclos, loading } = useCiclos();
  const [modalCiclo, setModalCiclo] = useState<Ciclo | null>(null);

  const uid = user?.uid || user?.id || '';
  const ciclos = allCiclos.filter(c => c.vendedorId === uid);

  if (loading) return <div className="flex items-center justify-center py-20 text-content-secondary">Carregando...</div>;

  const ativo = ciclos.find(c => c.status === 'ativo');
  const fechados = ciclos.filter(c => c.status === 'fechado');

  const prods = (c: Ciclo) => c.produtos || [];
  const totalPecas = (c: Ciclo) => prods(c).reduce((s, p) => s + p.pecasAtual, 0);
  const totalPacotes = (c: Ciclo) => prods(c).reduce((s, p) => s + p.pacotesAtual, 0);
  const totalValor = (c: Ciclo) => prods(c).reduce((s, p) => s + p.pecasAtual * p.valorUnitario, 0);
  const totalVendidoPecas = (c: Ciclo) => prods(c).reduce((s, p) => s + (p.pecasInicial - p.pecasAtual), 0);
  const totalVendidoValor = (c: Ciclo) => prods(c).reduce((s, p) => s + (p.pecasInicial - p.pecasAtual) * p.valorUnitario, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Ciclo ativo */}
      {ativo ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card label="No carro" value={`${totalPacotes(ativo)} pct`} sub={totalPecas(ativo) % 15 > 0 ? `+ ${totalPecas(ativo) % 15} avulsos (${totalPecas(ativo)} pçs)` : `${totalPecas(ativo)} pçs`} />
            <Card label="Valor no carro" value={formatCurrency(totalValor(ativo))} />
            <Card label="Vendido" value={`${totalVendidoPecas(ativo)} pçs`} />
            <Card label="Valor vendido" value={formatCurrency(totalVendidoValor(ativo))} className="text-green-400" />
          </div>

          <div className="text-xs text-content-muted flex items-center gap-1.5">
            <Calendar size={12} />
            Iniciado em {new Date(ativo.createdAt).toLocaleDateString('pt-BR')}
          </div>

          {/* Tabela de produtos do ciclo */}
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface text-left text-xs text-content-muted">
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2 text-center">Pct</th>
                  <th className="px-3 py-2 text-center">Pçs</th>
                  <th className="px-3 py-2 text-right">Valor pct</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ativo.produtos.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-3 py-2">
                      <span className="font-medium">{p.modelo}</span>
                      {p.referencia && <span className="text-xs text-content-muted ml-1">({p.referencia})</span>}
                    </td>
                    <td className="px-3 py-2 text-center">{p.pacotesAtual}{p.pecasAtual % 15 > 0 ? <span className="text-content-muted">+{p.pecasAtual % 15}</span> : ''}</td>
                    <td className="px-3 py-2 text-center text-content-muted">{p.pecasAtual}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(p.valorUnitario * 15)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(p.pecasAtual * p.valorUnitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border-subtle py-12 text-center">
          <Package size={32} className="mx-auto mb-2 text-content-muted opacity-30" />
          <p className="text-sm text-content-muted">Nenhum ciclo ativo</p>
          <p className="text-xs text-content-muted mt-1">Aguarde o administrador abrir um novo ciclo para você.</p>
        </div>
      )}

      {/* Ciclos fechados */}
      {fechados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-content-secondary">Ciclos anteriores</h2>
          {fechados.map(c => (
            <button
              key={c.id}
              onClick={() => setModalCiclo(c)}
              className="w-full rounded-lg border border-border-subtle bg-surface p-3 text-left hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')} — {c.closedAt ? new Date(c.closedAt).toLocaleDateString('pt-BR') : ''}
                  </span>
                  <p className="text-xs text-content-muted mt-0.5">
                    {totalVendidoPecas(c)} pçs vendidas · {formatCurrency(totalVendidoValor(c))}
                  </p>
                </div>
                <TrendingUp size={16} className="text-content-muted" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal ciclo fechado */}
      {modalCiclo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalCiclo(null)}>
          <div className="w-full max-w-lg rounded-xl border border-border-subtle bg-surface p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Detalhes do ciclo</h3>
              <button onClick={() => setModalCiclo(null)} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-content-muted block">Período</span>{new Date(modalCiclo.createdAt).toLocaleDateString('pt-BR')} — {modalCiclo.closedAt ? new Date(modalCiclo.closedAt).toLocaleDateString('pt-BR') : ''}</div>
              <div><span className="text-xs text-content-muted block">Vendido</span><span className="text-green-400 font-semibold">{formatCurrency(totalVendidoValor(modalCiclo))}</span></div>
              <div><span className="text-xs text-content-muted block">Pçs vendidas</span>{totalVendidoPecas(modalCiclo)}</div>
              <div><span className="text-xs text-content-muted block">Pçs devolvidas</span>{totalPecas(modalCiclo)}</div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-elevated text-left text-content-muted">
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2 text-center">Inicial</th>
                    <th className="px-3 py-2 text-center">Vendido</th>
                    <th className="px-3 py-2 text-center">Devolvido</th>
                  </tr>
                </thead>
                <tbody>
                  {modalCiclo.produtos.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-border-subtle last:border-0">
                      <td className="px-3 py-2 font-medium">{p.modelo}</td>
                      <td className="px-3 py-2 text-center text-content-muted">{p.pacotesInicial} pct ({p.pecasInicial} pçs)</td>
                      <td className="px-3 py-2 text-center text-green-400">{p.pecasInicial - p.pecasAtual} pçs</td>
                      <td className="px-3 py-2 text-center text-yellow-400">{p.pecasAtual} pçs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <p className="text-xs text-content-muted">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${className || ''}`}>{value}</p>
      {sub && <p className="text-[10px] text-content-muted mt-0.5">{sub}</p>}
    </div>
  );
}
