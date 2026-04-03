import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, ChevronUp, Plus, Users } from 'lucide-react';
import { getVendas } from '~/services/vendas.service';
import { getClientes } from '~/services/clientes.service';
import { useAuth } from '~/contexts/AuthContext';
import { formatCurrency } from '~/utils/format';
import type { Venda } from '~/models';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

interface ClienteInfo { id: string; nome: string; total: number; vendas: Venda[]; createdAt?: string; }

export default function MeusClientesPage() {
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    Promise.all([getVendas(), getClientes()]).then(([vendasData, clientesData]) => {
      const clienteMap: Record<string, string> = {};
      clientesData.forEach(c => { if (c.createdAt) clienteMap[c.id] = typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString(); });
      const map: Record<string, ClienteInfo> = {};
      vendasData.forEach(v => {
        if (!v.deletedAt && (v.vendedorId === user.uid || v.vendedorId === user.id)) {
          if (!map[v.clienteId]) map[v.clienteId] = { id: v.clienteId, nome: v.clienteNome, total: 0, vendas: [], createdAt: clienteMap[v.clienteId] };
          map[v.clienteId].total += v.valorTotal;
          map[v.clienteId].vendas.push(v);
        }
      });
      setClientes(Object.values(map).map(c => ({ ...c, vendas: c.vendas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()) })));
      setLoading(false);
    });
  }, [user]);

  const filtered = clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${input} sm:max-w-xs`} />
        <button onClick={() => navigate('/clientes/novo')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95 w-full sm:w-auto">
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhum cliente encontrado</p>
          <p className="mb-6 text-sm text-content-muted">Seus clientes aparecerão aqui após a primeira venda</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(cliente => {
            const isExpanded = expandedClient === cliente.id;
            return (
              <div key={cliente.id} className="rounded-xl border border-border-subtle bg-surface p-3 sm:p-4">
                <div className="flex cursor-pointer items-start justify-between gap-2" onClick={() => setExpandedClient(isExpanded ? null : cliente.id)}>
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isExpanded ? <ChevronUp size={18} className="flex-shrink-0 mt-0.5 text-content-muted" /> : <ChevronDown size={18} className="flex-shrink-0 mt-0.5 text-content-muted" />}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate">{cliente.nome}</h3>
                      <p className="text-xs text-content-muted">{cliente.vendas.length} compra(s)</p>
                      {cliente.createdAt && <p className="text-[10px] text-content-muted">Cliente desde {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-400 flex-shrink-0">{formatCurrency(cliente.total)}</span>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t pt-3 border-border-subtle">
                    {cliente.vendas.map(venda => (
                      <div key={venda.id} className="rounded-lg bg-elevated p-2.5 text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{new Date(venda.data).toLocaleDateString('pt-BR')}</span>
                          <span className="font-bold text-green-400">{formatCurrency(venda.valorTotal)}</span>
                        </div>
                        <div className="space-y-0.5 text-content-muted">
                          {venda.produtos.map((p, i) => (
                            <div key={i} className="flex justify-between gap-2">
                              <span className="truncate">{p.quantidade}x {p.modelo}</span>
                              <span className="flex-shrink-0">{formatCurrency(p.valorTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
