import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Users, ChevronDown, ChevronUp, Pencil, X, Check, Search } from 'lucide-react';
import { getClientes, deleteCliente, updateCliente } from '~/services/clientes.service';
import { getVendas } from '~/services/vendas.service';
import { useAuth } from '~/contexts/AuthContext';
import { formatCurrency } from '~/utils/format';
import type { Cliente, Venda } from '~/models';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clienteTotals, setClienteTotals] = useState<Record<string, number>>({});
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Cliente>>({});
  const [editContatos, setEditContatos] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getClientes(), getVendas()]).then(([clientesData, vendasData]) => {
      setClientes(clientesData);
      setVendas(vendasData);
      const totals: Record<string, number> = {};
      vendasData.forEach(v => { if (!v.deletedAt) totals[v.clienteId] = (totals[v.clienteId] || 0) + v.valorTotal; });
      setClienteTotals(totals);
    }).finally(() => setLoading(false));
  }, []);

  const fetchCidades = (uf: string) => {
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => setCidades(data.map(c => c.nome)))
      .catch(() => setCidades([]));
  };

  const startEdit = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(cliente.id);
    setEditData({ nome: cliente.nome, endereco: cliente.endereco, cidade: cliente.cidade || '', estado: cliente.estado || 'MA', cpfCnpj: cliente.cpfCnpj });
    setEditContatos(cliente.contatos?.length ? [...cliente.contatos] : cliente.contato ? [cliente.contato] : ['']);
    fetchCidades(cliente.estado || 'MA');
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); setEditContatos([]); };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const contatosFiltrados = editContatos.filter(c => c.trim());
      await updateCliente(editingId, {
        ...editData,
        contato: contatosFiltrados[0] || '',
        contatos: contatosFiltrados,
      });
      setClientes(prev => prev.map(c => c.id === editingId ? { ...c, ...editData, contato: contatosFiltrados[0] || '', contatos: contatosFiltrados } : c));
      cancelEdit();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const formatContato = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 2) return nums.length ? `(${nums}` : '';
    if (nums.length <= 3) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3)}`;
    return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3,7)}-${nums.slice(7)}`;
  };

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers.current[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      deleteCliente(id).then(() => setClientes(prev => prev.filter(c => c.id !== id)));
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers.current[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const getClienteVendas = (clienteId: string) =>
    vendas.filter(v => v.clienteId === clienteId && !v.deletedAt).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const filtered = clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <button onClick={() => navigate('/clientes/novo')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95 shrink-0">
          <Plus size={18} /> Novo Cliente
        </button>
        <div className="relative w-40 sm:w-48">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
          <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2 text-xs text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors" />
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhum cliente encontrado</p>
          <p className="mb-6 text-sm text-content-muted">Cadastre seu primeiro cliente</p>
          <button onClick={() => navigate('/clientes/novo')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
            <Plus size={20} /> Cadastrar Primeiro Cliente
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(cliente => {
            const isExpanded = expandedClient === cliente.id;
            const isEditing = editingId === cliente.id;
            const clienteVendas = getClienteVendas(cliente.id);

            if (isEditing) {
              return (
                <div key={cliente.id} className="rounded-xl border border-blue-500/30 bg-surface p-3 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-400">Editando cliente</span>
                    <button onClick={cancelEdit} className="text-content-muted hover:text-content transition-colors"><X size={18} /></button>
                  </div>
                  <input value={editData.nome || ''} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} className={input} placeholder="Nome" />
                  <input value={editData.cpfCnpj || ''} onChange={(e) => setEditData({ ...editData, cpfCnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })} className={input} placeholder="CPF / CNPJ" inputMode="numeric" />
                  <input value={editData.endereco || ''} onChange={(e) => setEditData({ ...editData, endereco: e.target.value })} className={input} placeholder="Endereço" />
                  <div className="grid grid-cols-[5rem_1fr] gap-2">
                    <select value={editData.estado || 'MA'} onChange={(e) => { setEditData({ ...editData, estado: e.target.value, cidade: '' }); fetchCidades(e.target.value); }} className={input}>
                      {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    <div>
                      <input value={editData.cidade || ''} onChange={(e) => setEditData({ ...editData, cidade: e.target.value })} className={input} list="edit-cidades" placeholder="Cidade" />
                      <datalist id="edit-cidades">{cidades.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                  </div>
                  {editContatos.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={c} onChange={(e) => { const arr = [...editContatos]; arr[i] = formatContato(e.target.value); setEditContatos(arr); }} className={input} placeholder="Contato" inputMode="tel" />
                      {editContatos.length > 1 && (
                        <button type="button" onClick={() => setEditContatos(editContatos.filter((_, j) => j !== i))} className="rounded-lg px-2 text-red-500/60 hover:text-red-500"><X size={18} /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditContatos([...editContatos, ''])} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                    <Plus size={14} /> Adicionar contato
                  </button>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={cancelEdit} className="rounded-lg border border-border-subtle bg-elevated py-2 text-sm font-medium text-content-secondary transition hover:bg-border-medium">Cancelar</button>
                    <button onClick={saveEdit} disabled={saving}
                      className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2 text-sm font-semibold text-white transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-1.5">
                      <Check size={16} /> {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={cliente.id} className="rounded-xl border border-border-subtle bg-surface p-3 sm:p-4">
                <div className="flex cursor-pointer items-start justify-between gap-2" onClick={() => setExpandedClient(isExpanded ? null : cliente.id)}>
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isExpanded ? <ChevronUp size={18} className="flex-shrink-0 mt-0.5 text-content-muted" /> : <ChevronDown size={18} className="flex-shrink-0 mt-0.5 text-content-muted" />}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate">{cliente.nome}</h3>
                      <p className="text-xs text-content-muted truncate">{[cliente.endereco, cliente.cidade, cliente.estado].filter(Boolean).join(' · ')}</p>
                      {cliente.cpfCnpj && <p className="text-xs text-content-muted">{cliente.cpfCnpj}</p>}
                      {cliente.createdAt && <p className="text-[10px] text-content-muted">Cliente desde {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}</p>}
                      {(cliente.contatos?.length ? cliente.contatos : cliente.contato ? [cliente.contato] : []).map((c, i) => (
                        <p key={i} className="text-xs text-content-muted">{c}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="text-right mr-1">
                      <p className="text-sm font-bold text-green-400">{formatCurrency(clienteTotals[cliente.id] || 0)}</p>
                      <p className="text-[10px] text-content-muted">{clienteVendas.length} compra(s)</p>
                    </div>
                    <button onClick={(e) => startEdit(cliente, e)} className="rounded-lg p-1.5 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Editar">
                      <Pencil size={16} />
                    </button>
                    {user?.role === 'admin' && (
                      <button onClick={(e) => handleDelete(cliente.id, e)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          (deleteClicks[cliente.id] || 0) === 0 ? 'text-red-500/50 hover:text-red-500 hover:bg-red-500/10'
                          : (deleteClicks[cliente.id] || 0) === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
                        }`} title={deleteClicks[cliente.id] ? (deleteClicks[cliente.id] === 1 ? 'Certeza?' : 'Confirmar!') : 'Apagar'}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t pt-3 border-border-subtle">
                    <h4 className="text-xs font-semibold text-content-muted">Histórico de Compras</h4>
                    {clienteVendas.length === 0 ? (
                      <p className="text-xs text-content-muted">Nenhuma compra registrada</p>
                    ) : clienteVendas.map(venda => (
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
                        <p className="mt-1 text-content-muted">Vendedor: {venda.vendedorNome}</p>
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
