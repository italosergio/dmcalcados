import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Users, Pencil, X, Check, Search, Share2, LayoutGrid, List, MapPin, Phone } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { ClienteModal } from '~/components/clientes/ClienteModal';
import { useClientes, useVendas, useUsers } from '~/hooks/useRealtime';
import { deleteCliente, updateCliente, compartilharCliente } from '~/services/clientes.service';
import { useAuth } from '~/contexts/AuthContext';
import { formatCurrency } from '~/utils/format';
import type { Cliente, Venda, User } from '~/models';
import { userIsAdmin, userIsVendedor } from '~/models';

const inputCls = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function ClientesPage() {
  const { clientes: clientesRaw, loading: clientesLoading } = useClientes();
  const { vendas, loading: vendasLoading } = useVendas();
  const { users, loading: usersLoading } = useUsers();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const loading = clientesLoading || vendasLoading || usersLoading;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Cliente>>({});
  const [editContatos, setEditContatos] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [compartilhandoId, setCompartilhandoId] = useState<string | null>(null);
  const [compartilhados, setCompartilhados] = useState<string[]>([]);
  const [salvandoCompartilhamento, setSalvandoCompartilhamento] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('clientes-view') as 'cards' | 'tabela') || 'cards';
    return 'cards';
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const changeViewMode = (mode: 'cards' | 'tabela') => {
    setViewMode(mode);
    localStorage.setItem('clientes-view', mode);
  };

  useEffect(() => { setClientes(clientesRaw); }, [clientesRaw]);

  const vendedores = useMemo(() => users.filter(u => userIsVendedor(u)), [users]);
  const clienteTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    vendas.forEach(v => { if (!v.deletedAt) totals[v.clienteId] = (totals[v.clienteId] || 0) + v.valorTotal; });
    return totals;
  }, [vendas]);
  const clienteVendasCount = useMemo(() => {
    const counts: Record<string, number> = {};
    vendas.forEach(v => { if (!v.deletedAt) counts[v.clienteId] = (counts[v.clienteId] || 0) + 1; });
    return counts;
  }, [vendas]);

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
      await updateCliente(editingId, { ...editData, contato: contatosFiltrados[0] || '', contatos: contatosFiltrados });
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

  const podeCompartilhar = (cliente: Cliente) =>
    user ? userIsAdmin(user) || cliente.donoId === (user?.uid || user?.id) : false;

  const abrirCompartilhamento = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompartilhandoId(cliente.id);
    setCompartilhados(cliente.compartilhadoCom || []);
  };

  const salvarCompartilhamento = async () => {
    if (!compartilhandoId) return;
    setSalvandoCompartilhamento(true);
    try {
      await compartilharCliente(compartilhandoId, compartilhados);
      setClientes(prev => prev.map(c => c.id === compartilhandoId ? { ...c, compartilhadoCom: compartilhados } : c));
      setCompartilhandoId(null);
    } finally { setSalvandoCompartilhamento(false); }
  };

  const toggleCompartilhado = (uid: string) => {
    setCompartilhados(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const filtered = clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));
  const totalVendido = Object.values(clienteTotals).reduce((s, v) => s + v, 0);

  return (
    <div className={viewMode === 'tabela' ? 'flex flex-col h-[calc(100vh-4rem)] overflow-hidden' : ''}>
      {/* Header */}
      <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3">
        <div className="flex items-center sm:contents">
          <button onClick={() => navigate('/clientes/novo')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
            <Plus size={18} /> Novo Cliente
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800 !py-2 !px-2.5 sm:!px-3 sm:flex-1 sm:min-w-0">
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Clientes</p>
            <p className="text-base sm:text-2xl font-bold text-blue-400 leading-tight">{clientes.length}</p>
          </Card>
          <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-800 !py-2 !px-2.5 sm:!px-3 sm:flex-1 sm:min-w-0">
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Total vendido</p>
            <p className="text-base sm:text-2xl font-bold text-green-400 leading-tight">{formatCurrency(totalVendido)}</p>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
          <input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2 text-xs text-content focus:outline-none focus:border-border-medium transition-colors" />
        </div>
        <div className="ml-auto flex items-center bg-elevated rounded-lg p-0.5">
          <button onClick={() => changeViewMode('cards')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => changeViewMode('tabela')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'tabela' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}>
            <List size={16} />
          </button>
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

      {/* Formulário de edição inline */}
      {editingId && (() => {
        const cliente = clientes.find(c => c.id === editingId);
        if (!cliente) return null;
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={cancelEdit}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm rounded-2xl border border-blue-500/30 bg-surface shadow-2xl p-4 space-y-2" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-blue-400">Editando cliente</span>
                <button onClick={cancelEdit} className="text-content-muted hover:text-content transition-colors"><X size={18} /></button>
              </div>
              <input value={editData.nome || ''} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} className={inputCls} placeholder="Nome" />
              <input value={editData.cpfCnpj || ''} onChange={(e) => setEditData({ ...editData, cpfCnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })} className={inputCls} placeholder="CPF / CNPJ" inputMode="numeric" />
              <input value={editData.endereco || ''} onChange={(e) => setEditData({ ...editData, endereco: e.target.value })} className={inputCls} placeholder="Endereço" />
              <div className="grid grid-cols-[5rem_1fr] gap-2">
                <select value={editData.estado || 'MA'} onChange={(e) => { setEditData({ ...editData, estado: e.target.value, cidade: '' }); fetchCidades(e.target.value); }} className={inputCls}>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                <div>
                  <input value={editData.cidade || ''} onChange={(e) => setEditData({ ...editData, cidade: e.target.value })} className={inputCls} list="edit-cidades" placeholder="Cidade" />
                  <datalist id="edit-cidades">{cidades.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              {editContatos.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input value={c} onChange={(e) => { const arr = [...editContatos]; arr[i] = formatContato(e.target.value); setEditContatos(arr); }} className={inputCls} placeholder="Contato" inputMode="tel" />
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
          </div>
        );
      })()}

      {/* Cards */}
      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div className="space-y-3">
          {filtered.map(cliente => (
            <div key={cliente.id} className="rounded-xl border border-border-subtle bg-surface p-3 sm:p-4 cursor-pointer hover:border-border-medium transition-colors" onClick={() => setClienteSelecionado(cliente)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{cliente.nome}</h3>
                  {(cliente.endereco || cliente.cidade) && (
                    <p className="text-xs text-content-muted truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" />{[cliente.cidade, cliente.estado].filter(Boolean).join(' · ')}</p>
                  )}
                  {cliente.cpfCnpj && <p className="text-xs text-content-muted">{cliente.cpfCnpj}</p>}
                  {(cliente.contatos?.length ? cliente.contatos : cliente.contato ? [cliente.contato] : []).slice(0, 1).map((c, i) => (
                    <p key={i} className="text-xs text-content-muted flex items-center gap-1"><Phone size={12} className="shrink-0" />{c}</p>
                  ))}
                  {cliente.createdAt && <p className="text-[10px] text-content-muted">Desde {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="text-right mr-1">
                    <p className="text-sm font-bold text-green-400">{formatCurrency(clienteTotals[cliente.id] || 0)}</p>
                    <p className="text-[10px] text-content-muted">{clienteVendasCount[cliente.id] || 0} compra(s)</p>
                  </div>
                  <button onClick={(e) => startEdit(cliente, e)} className="rounded-lg p-1.5 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Editar">
                    <Pencil size={16} />
                  </button>
                  {podeCompartilhar(cliente) && (
                    <button onClick={(e) => abrirCompartilhamento(cliente, e)} className="rounded-lg p-1.5 text-purple-400/50 hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="Compartilhar">
                      <Share2 size={16} />
                    </button>
                  )}
                  {user && userIsAdmin(user) && (
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
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {!loading && filtered.length > 0 && viewMode === 'tabela' && (
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col min-h-0 flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-elevated/50">
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted">Nome</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Cidade</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-content-muted hidden sm:table-cell">Compras</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted">Total</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-medium uppercase tracking-wide text-content-muted w-24">Ações</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(cliente => (
                  <tr key={cliente.id} onClick={() => setClienteSelecionado(cliente)} className="cursor-pointer hover:bg-surface-hover transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-medium truncate max-w-[180px]">{cliente.nome}</p>
                      {cliente.cpfCnpj && <p className="text-[10px] text-content-muted">{cliente.cpfCnpj}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-content-secondary truncate max-w-[120px] hidden sm:table-cell">{[cliente.cidade, cliente.estado].filter(Boolean).join('/') || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-content-muted hidden sm:table-cell">{clienteVendasCount[cliente.id] || 0}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold text-right text-green-400 whitespace-nowrap">{formatCurrency(clienteTotals[cliente.id] || 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(cliente, e); }} className="rounded-lg p-1 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={14} /></button>
                        {podeCompartilhar(cliente) && (
                          <button onClick={(e) => { e.stopPropagation(); abrirCompartilhamento(cliente, e); }} className="rounded-lg p-1 text-purple-400/50 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"><Share2 size={14} /></button>
                        )}
                        {user && userIsAdmin(user) && (
                          <button onClick={(e) => handleDelete(cliente.id, e)}
                            className={`rounded-lg p-1 transition-colors ${
                              (deleteClicks[cliente.id] || 0) === 0 ? 'text-red-500/50 hover:text-red-500 hover:bg-red-500/10'
                              : (deleteClicks[cliente.id] || 0) === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
                            }`}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalhe do cliente */}
      {clienteSelecionado && (
        <ClienteModal cliente={clienteSelecionado} vendas={vendas} onClose={() => setClienteSelecionado(null)}
          onNavigateVenda={(vendaId) => navigate('/vendas', { state: { vendaId } })} />
      )}
      {compartilhandoId && (() => {
        const cliente = clientes.find(c => c.id === compartilhandoId);
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => setCompartilhandoId(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
                <div>
                  <p className="text-sm font-semibold">Compartilhar cliente</p>
                  <p className="text-xs text-content-muted truncate">{cliente?.nome}</p>
                </div>
                <button onClick={() => setCompartilhandoId(null)} className="text-content-muted hover:text-content"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {vendedores.length === 0 && <p className="text-xs text-content-muted">Nenhum vendedor cadastrado</p>}
                {vendedores.map(v => {
                  const uid = v.uid || v.id;
                  const checked = compartilhados.includes(uid);
                  return (
                    <label key={uid} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-elevated cursor-pointer transition-colors">
                      <input type="checkbox" checked={checked} onChange={() => toggleCompartilhado(uid)} className="rounded border-border-subtle accent-purple-500" />
                      <span className="text-sm">{v.nome}</span>
                      <span className="text-xs text-content-muted ml-auto">@{v.username}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 border-t border-border-subtle p-4">
                <button onClick={() => setCompartilhandoId(null)}
                  className="flex-1 rounded-lg border border-border-subtle bg-elevated py-2 text-sm font-medium text-content-secondary hover:bg-border-medium transition">
                  Cancelar
                </button>
                <button onClick={salvarCompartilhamento} disabled={salvandoCompartilhamento}
                  className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-violet-500 py-2 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-violet-400 disabled:opacity-30">
                  {salvandoCompartilhamento ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
