import { useMemo } from 'react';
import { Card } from '~/components/common/Card';
import { useVendas, useDespesas, useUsers, useClientes } from '~/hooks/useRealtime';
import { formatCurrency } from '~/utils/format';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '~/contexts/AuthContext';
import {
  VendasTimeline, DespesasTimeline, VendasPorVendedor, TopClientes,
  DespesasPorTipo, DespesasPorUsuario, TopModelos, SaldoTimeline,
  TicketMedioPorVendedor, SazonalidadeSemanal, ComparativoMensal,
  CondicaoPagamentoTimeline,
} from '~/components/dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'desenvolvedor';
  const { vendas: todasVendasRaw, loading: vendasLoading } = useVendas();
  const { despesas: todasDespesasRaw, loading: despesasLoading } = useDespesas();
  const { users, loading: usersLoading } = useUsers();
  const { clientes, loading: clientesLoading } = useClientes();
  const loading = vendasLoading || despesasLoading || usersLoading || clientesLoading;

  const vendas = useMemo(() => todasVendasRaw.filter((v: any) => !v.deletedAt), [todasVendasRaw]);
  const despesas = useMemo(() => todasDespesasRaw.filter((d: any) => !d.deletedAt), [todasDespesasRaw]);

  // Totais desde sempre (sem filtro de período)
  const totalVendas = vendas.reduce((s, v) => s + v.valorTotal, 0);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const saldo = totalVendas - totalDespesas;

  const userNomeMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => { map[u.uid || u.id] = u.nome; map[u.id] = u.nome; });
    return map;
  }, [users]);

  const clienteNomeMap = useMemo(() => {
    const map: Record<string, string> = {};
    clientes.forEach(c => { map[c.id] = c.nome; });
    return map;
  }, [clientes]);

  const resolveNome = (id: string, fallback: string) => userNomeMap[id] || fallback;
  const resolveCliente = (id: string, fallback: string) => clienteNomeMap[id] || fallback;

  const vendedoresNomes = useMemo(() => {
    const set = new Set<string>();
    vendas.forEach(v => set.add(resolveNome(v.vendedorId, v.vendedorNome || 'Sem vendedor')));
    return Array.from(set).sort();
  }, [vendas, userNomeMap]);

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-content-secondary">Carregando...</p>
        </div>
      ) : (
        <>
          {/* Cards totais (desde sempre) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-800 cursor-pointer hover:brightness-110 transition" onClick={() => navigate('/vendas')}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1"><ShoppingBag size={16} className="text-green-400" /><h3 className="text-xs font-medium text-content-secondary">Vendas</h3></div>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(totalVendas)}</p>
                  <p className="text-xs text-content-muted">{vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'} · Ticket {vendas.length > 0 ? formatCurrency(totalVendas / vendas.length) : 'R$ 0'}</p>
                </div>
                <div className="bg-green-900/30 p-2 rounded-full"><TrendingUp size={18} className="text-green-400" /></div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-red-900/20 to-rose-900/20 border-red-800 cursor-pointer hover:brightness-110 transition" onClick={() => navigate('/despesas')}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Receipt size={16} className="text-red-400" /><h3 className="text-xs font-medium text-content-secondary">Despesas</h3></div>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDespesas)}</p>
                  <p className="text-xs text-content-muted">{despesas.length} {despesas.length === 1 ? 'despesa' : 'despesas'}</p>
                </div>
                <div className="bg-red-900/30 p-2 rounded-full"><TrendingDown size={18} className="text-red-400" /></div>
              </div>
            </Card>
            <Card className={`sm:col-span-2 lg:col-span-1 ${isAdmin ? (saldo >= 0 ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-800' : 'bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-800') : 'bg-gradient-to-br from-purple-900/20 to-violet-900/20 border-purple-800'}`}>
              <div className="flex items-start justify-between">
                <div>
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className={saldo >= 0 ? 'text-blue-400' : 'text-orange-400'} /><h3 className="text-xs font-medium text-content-secondary">Saldo</h3></div>
                      <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{formatCurrency(saldo)}</p>
                      <p className="text-xs text-content-muted">{saldo >= 0 ? 'Lucro' : 'Prejuízo'} · Margem {totalVendas > 0 ? `${((saldo / totalVendas) * 100).toFixed(1)}%` : '0%'}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className="text-purple-400" /><h3 className="text-xs font-medium text-content-secondary">Comissão (10%)</h3></div>
                      <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalVendas * 0.1)}</p>
                      <p className="text-xs text-content-muted">sobre {formatCurrency(totalVendas)}</p>
                    </>
                  )}
                </div>
                <div className={`p-2 rounded-full ${isAdmin ? (saldo >= 0 ? 'bg-blue-900/30' : 'bg-orange-900/30') : 'bg-purple-900/30'}`}><DollarSign size={18} className={isAdmin ? (saldo >= 0 ? 'text-blue-400' : 'text-orange-400') : 'text-purple-400'} /></div>
              </div>
            </Card>
          </div>

          {/* Gráficos - cada um com filtros próprios */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna Vendas */}
            <div className="space-y-4">
              <VendasTimeline vendas={vendas} />
              {isAdmin && <VendasPorVendedor vendas={vendas} resolveNome={resolveNome} />}
              <TopClientes vendas={vendas} resolveCliente={resolveCliente} />
              <CondicaoPagamentoTimeline vendas={vendas} />
            </div>

            {/* Coluna Despesas */}
            <div className="space-y-4">
              <DespesasTimeline despesas={despesas} />
              {isAdmin && <DespesasPorUsuario despesas={despesas} resolveNome={resolveNome} />}
              <DespesasPorTipo despesas={despesas} resolveNome={resolveNome} vendedores={vendedoresNomes} />
              {isAdmin && <SaldoTimeline vendas={vendas} despesas={despesas} />}
            </div>
          </div>

          {/* Linha extra: modelos + extras */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <TopModelos vendas={vendas} resolveNome={resolveNome} vendedores={vendedoresNomes} />
            <div className="space-y-4">
              <ComparativoMensal vendas={vendas} despesas={despesas} />
              {isAdmin && <TicketMedioPorVendedor vendas={vendas} resolveNome={resolveNome} />}
              <SazonalidadeSemanal vendas={vendas} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
