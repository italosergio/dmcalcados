import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Undo2, Landmark, UserCircle, X, Calendar, ImageIcon, Pencil, MoreVertical } from 'lucide-react';
import { ImageLightbox } from '~/components/common/ImageLightbox';
import { Card } from '~/components/common/Card';
import { useDepositos, useUsers, useVendas } from '~/hooks/useRealtime';
import { createDeposito, deleteDeposito, restoreDeposito, updateDeposito } from '~/services/depositos.service';
import { uploadImage } from '~/services/cloudinary.service';
import { formatCurrency } from '~/utils/format';
import { useAuth } from '~/contexts/AuthContext';
import { userIsAdmin } from '~/models';
import { findCicloParaUsuario } from '~/services/ciclos.service';
import type { Deposito } from '~/models';

type Periodo = 'hoje' | '7dias' | '30dias' | 'mes' | 'tudo';

export default function DepositosPage() {
  const { depositos, loading } = useDepositos();
  const { users } = useUsers();
  const { vendas } = useVendas();
  const { user } = useAuth();
  const isAdmin = user ? userIsAdmin(user) : false;
  const userNomeMap = new Map(users.map(u => [u.uid || u.id, u.nome]));
  const resolveUser = (id: string, fallback: string) => userNomeMap.get(id) || fallback;

  const [periodo, setPeriodo] = useState<Periodo>('30dias');
  const [criando, setCriando] = useState(false);
  const [selecionado, setSelecionado] = useState<Deposito | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imagemAberta, setImagemAberta] = useState<string | null>(null);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const novoBtnRef = useRef<HTMLButtonElement>(null);

  // Form state
  const [formValor, setFormValor] = useState('');
  const [formData, setFormData] = useState(new Date().toISOString().slice(0, 10));
  const [formDepositante, setFormDepositante] = useState('');
  const [formImagem, setFormImagem] = useState<File | null>(null);
  const [formImagemPreview, setFormImagemPreview] = useState<string | null>(null);
  const [formSemFoto, setFormSemFoto] = useState(false);
  const [formJustificativa, setFormJustificativa] = useState('');
  const [formCicloId, setFormCicloId] = useState('');
  const [ciclosAbertos, setCiclosAbertos] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formErro, setFormErro] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Edit state
  const [editando, setEditando] = useState(false);

  const fecharCriando = useCallback(() => {
    setCriando(false);
    setFormValor(''); setFormData(new Date().toISOString().slice(0, 10)); setFormDepositante(''); setFormImagem(null); setFormImagemPreview(null); setFormSemFoto(false); setFormJustificativa(''); setFormErro('');
    setTimeout(() => novoBtnRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    import('~/services/ciclos.service').then(m => m.getCiclosAbertos()).then(setCiclosAbertos);
  }, []);

  useEffect(() => {
    if (!criando) return;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => modalRef.current?.querySelector<HTMLElement>('input')?.focus(), 50);
    return () => { document.body.style.overflow = ''; clearTimeout(t); };
  }, [criando]);

  useEffect(() => { setActionLoading({}); }, [depositos]);

  const vendedores = users.filter(u => !u.deletedAt);

  const filtered = depositos.filter(d => {
    if (periodo === 'tudo') return true;
    const agora = new Date();
    const inicio = new Date();
    if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0);
    else if (periodo === '7dias') inicio.setDate(agora.getDate() - 7);
    else if (periodo === '30dias') inicio.setDate(agora.getDate() - 30);
    else if (periodo === 'mes') { inicio.setDate(1); inicio.setHours(0, 0, 0, 0); }
    return new Date(d.data) >= inicio;
  });

  const totalDepositos = filtered.filter(d => !d.deletedAt).reduce((s, d) => s + d.valor, 0);

  // Total vendas à vista no período para comparação
  const totalAvistaVendas = vendas.filter(v => {
    if (v.deletedAt) return false;
    if (v.condicaoPagamento !== 'avista') return false;
    if (periodo === 'tudo') return true;
    const agora = new Date();
    const inicio = new Date();
    if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0);
    else if (periodo === '7dias') inicio.setDate(agora.getDate() - 7);
    else if (periodo === '30dias') inicio.setDate(agora.getDate() - 30);
    else if (periodo === 'mes') { inicio.setDate(1); inicio.setHours(0, 0, 0, 0); }
    return new Date(v.data) >= inicio;
  }).reduce((s, v) => s + v.valorTotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValor || !formDepositante) return;
    if (!formImagem && !formSemFoto) { setFormErro('Adicione o comprovante ou marque sem foto'); return; }
    if (formSemFoto && !formJustificativa.trim()) { setFormErro('Informe a justificativa'); return; }
    setFormLoading(true);
    setFormErro('');
    try {
      let imagemUrl: string | undefined;
      if (formImagem) imagemUrl = await uploadImage(formImagem, 'depositos');
      const dep = vendedores.find(u => (u.uid || u.id) === formDepositante);
      await createDeposito({
        valor: parseFloat(formValor),
        data: formData + 'T12:00:00.000Z',
        depositanteId: formDepositante,
        depositanteNome: dep?.nome || '',
        imagemUrl,
        ...(formSemFoto ? { semFoto: true, justificativa: formJustificativa.trim() } : {}),
        ...((() => { const cm = findCicloParaUsuario(ciclosAbertos, formDepositante, formData); return cm ? { cicloId: cm.id } : {}; })()),
      });
      fecharCriando();
    } catch (err) {
      setFormErro(err instanceof Error ? err.message : String(err));
    } finally { setFormLoading(false); }
  };

  const handleDelete = useCallback((id: string) => {
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers.current[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      setActionLoading(prev => ({ ...prev, [id]: true }));
      deleteDeposito(id);
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers.current[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const deleteLabel = (id: string) => {
    const clicks = deleteClicks[id] || 0;
    if (clicks === 0) return 'Apagar';
    if (clicks === 1) return 'Tem certeza?';
    return 'Confirmar!';
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImagem(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFormImagemPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3">
        <div className="flex items-stretch gap-2 sm:contents">
          <button ref={novoBtnRef} onClick={() => setCriando(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-95 shrink-0">
            <Plus size={18} /> <span className="hidden sm:inline">Novo Depósito</span><span className="sm:hidden">Depósito</span>
          </button>
          <Card className="flex-1 min-w-0 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800 !py-2 !px-2.5 sm:!px-3">
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Depositado</p>
            <p className="text-xs sm:text-base font-bold text-blue-400 leading-tight">{formatCurrency(totalDepositos)}</p>
            <p className="text-[10px] text-content-muted leading-tight">{filtered.filter(d => !d.deletedAt).length} depósito(s)</p>
          </Card>
          <Card className="flex-1 min-w-0 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-800 !py-2 !px-2.5 sm:!px-3">
            <p className="text-[10px] text-content-secondary font-medium leading-tight">Vendas à vista</p>
            <p className="text-xs sm:text-base font-bold text-green-400 leading-tight">{formatCurrency(totalAvistaVendas)}</p>
            {totalAvistaVendas > 0 && (
              <p className={`text-[10px] leading-tight font-medium ${totalDepositos >= totalAvistaVendas ? 'text-green-400' : 'text-yellow-400'}`}>
                {Math.round((totalDepositos / totalAvistaVendas) * 100)}% depositado
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Filtros período */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([
          { value: 'hoje', label: 'Hoje' },
          { value: '7dias', label: '7 dias' },
          { value: '30dias', label: '30 dias' },
          { value: 'mes', label: 'Mês' },
          { value: 'tudo', label: 'Tudo' },
        ] as { value: Periodo; label: string }[]).map(opt => (
          <button key={opt.value} onClick={() => setPeriodo(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${periodo === opt.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface p-8 sm:p-12 text-center">
          <Landmark size={48} className="mx-auto mb-4 text-content-muted opacity-40" />
          <p className="mb-1 text-base sm:text-lg font-semibold">Nenhum depósito registrado</p>
          <p className="mb-6 text-sm text-content-muted">Registre o primeiro depósito</p>
          <button onClick={() => setCriando(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-95">
            <Plus size={20} /> Registrar Depósito
          </button>
        </div>
      )}

      {/* Lista */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(dep => (
            <div key={dep.id} onClick={() => setSelecionado(dep)}
              className={`rounded-xl border p-3 sm:p-4 cursor-pointer transition-colors ${dep.deletedAt ? 'border-red-900/50 bg-red-950/20 opacity-70 hover:opacity-90' : 'border-border-subtle bg-surface hover:border-border-medium'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {dep.deletedAt && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">Apagado</span>}
                  <p className={`text-lg font-bold ${dep.deletedAt ? 'text-red-400 line-through' : 'text-blue-400'}`}>{formatCurrency(dep.valor)}</p>
                  <p className="text-sm text-content-secondary flex items-center gap-1"><UserCircle size={14} />{resolveUser(dep.depositanteId, dep.depositanteNome)}</p>
                  {dep.imagemUrl && <ImageIcon size={13} className="text-blue-400 inline mt-0.5" />}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-content-muted">{new Date(dep.data).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[10px] text-content-muted/60">reg. {new Date(dep.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalhe */}
      {imagemAberta && <ImageLightbox src={imagemAberta} onClose={() => setImagemAberta(null)} />}
      {selecionado && (() => {
        const d = selecionado;
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => { setSelecionado(null); setMenuOpen(false); }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <span className="text-sm font-semibold">Depósito</span>
                <div className="flex items-center gap-1">
                  {!d.deletedAt && (
                    <div className="relative">
                      <button onClick={() => setMenuOpen(!menuOpen)} className="text-content-muted hover:text-content p-1 rounded-lg hover:bg-elevated transition-colors"><MoreVertical size={18} /></button>
                      {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border-subtle bg-elevated shadow-xl z-10 py-1">
                          <button onClick={() => {
                            setMenuOpen(false); setEditando(true);
                            setFormValor(String(d.valor));
                            setFormData(d.data.slice(0, 10));
                            setFormDepositante(d.depositanteId);
                            setFormImagemPreview(d.imagemUrl || null);
                            setFormImagem(null);
                            setFormSemFoto(!!d.semFoto);
                            setFormJustificativa(d.justificativa || '');
                            setFormErro('');
                          }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-content hover:bg-surface-hover transition-colors">
                            <Pencil size={13} /> Editar depósito
                          </button>
                          <button onClick={() => { setMenuOpen(false); handleDelete(d.id); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                              (deleteClicks[d.id] || 0) === 0 ? 'text-red-500 hover:bg-surface-hover'
                              : (deleteClicks[d.id] || 0) === 1 ? 'text-red-400 bg-red-500/10' : 'text-red-300 bg-red-600/20'
                            }`}>
                            <Trash2 size={13} /> {actionLoading[d.id] ? 'Aguarde...' : deleteLabel(d.id)}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => { setSelecionado(null); setMenuOpen(false); }} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(d.valor)}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><Calendar size={12} /><span className="text-[10px]">Data</span></div>
                    <p className="text-xs font-semibold">{new Date(d.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="rounded-lg bg-elevated p-2.5">
                    <div className="flex items-center gap-1.5 text-content-muted mb-0.5"><UserCircle size={12} /><span className="text-[10px]">Depositante</span></div>
                    <p className="text-xs font-semibold">{resolveUser(d.depositanteId, d.depositanteNome)}</p>
                  </div>
                </div>
                {d.imagemUrl && (
                  <div>
                    <p className="text-[10px] text-content-muted mb-1.5">Comprovante</p>
                    <img src={d.imagemUrl} alt="Comprovante" className="rounded-lg border border-border-subtle max-h-48 object-contain w-full cursor-pointer hover:opacity-80 transition" onClick={() => setImagemAberta(d.imagemUrl!)} />
                  </div>
                )}
                {d.justificativa && (
                  <p className="text-[10px] text-yellow-400 text-center">Sem comprovante: {d.justificativa}</p>
                )}
                <p className="text-[10px] text-content-muted text-center">
                  Registrado por {resolveUser(d.registradoPorId, d.registradoPorNome)} em {new Date(d.createdAt).toLocaleString('pt-BR')}
                </p>

                {d.deletedAt && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center">
                    <p className="text-xs text-red-400 font-medium">Depósito apagado</p>
                    <button type="button" onClick={() => { setActionLoading(prev => ({ ...prev, [d.id]: true })); restoreDeposito(d.id); }}
                      disabled={actionLoading[d.id]}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40">
                      <Undo2 size={13} /> {actionLoading[d.id] ? 'Aguarde...' : 'Desfazer exclusão'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal novo depósito */}
      {criando && (
        <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={fecharCriando}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div ref={modalRef} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
              <span className="text-sm font-semibold">Novo Depósito</span>
              <button onClick={fecharCriando} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-content-muted mb-1 block">Valor</label>
                <input type="number" step="0.01" min="0.01" value={formValor} onChange={e => setFormValor(e.target.value)} className={input} required placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Data do depósito</label>
                <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className={input} required />
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Quem depositou</label>
                <select value={formDepositante} onChange={e => setFormDepositante(e.target.value)} className={input} required>
                  <option value="">Selecione...</option>
                  {vendedores.map(u => (
                    <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Comprovante (foto)</label>
                {formImagemPreview && (
                  <div className="relative mb-2">
                    <img src={formImagemPreview} alt="Preview" className="rounded-lg border border-border-subtle max-h-32 object-contain w-full" />
                    <button type="button" onClick={() => { setFormImagem(null); setFormImagemPreview(null); }}
                      className="absolute top-1 right-1 rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500 transition-colors"><X size={12} /></button>
                  </div>
                )}
                <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle bg-elevated py-2 text-xs text-content-muted cursor-pointer hover:bg-border-medium transition-colors">
                  <ImageIcon size={14} /> {formImagemPreview ? 'Trocar imagem' : 'Adicionar comprovante'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImagemChange} />
                </label>
                {!formImagem && !formImagemPreview && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-content-secondary cursor-pointer">
                    <input type="checkbox" checked={formSemFoto} onChange={e => setFormSemFoto(e.target.checked)} className="rounded" />
                    Sem comprovante
                  </label>
                )}
                {formSemFoto && !formImagem && (
                  <input value={formJustificativa} onChange={e => setFormJustificativa(e.target.value)} className={`${input} mt-2`} placeholder="Justificativa (obrigatória)" />
                )}
              </div>
              {formErro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formErro}</div>}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={fecharCriando}
                  className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">Cancelar</button>
                <button type="submit" disabled={formLoading || !formValor || !formDepositante || (!formImagem && !formSemFoto) || (formSemFoto && !formJustificativa.trim())}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-[0.98] disabled:opacity-30">
                  {formLoading ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar depósito */}
      {editando && selecionado && (
        <div className="fixed inset-0 lg:left-64 z-[110] flex items-center justify-center p-4" onClick={() => setEditando(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
              <span className="text-sm font-semibold">Editar Depósito</span>
              <button onClick={() => setEditando(false)} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-content-muted mb-1 block">Valor</label>
                <input type="number" step="0.01" min="0.01" value={formValor} onChange={e => setFormValor(e.target.value)} className={input} />
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Data</label>
                <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className={input} />
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Depositante</label>
                <select value={formDepositante} onChange={e => setFormDepositante(e.target.value)} className={input}>
                  {vendedores.map(u => (
                    <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Comprovante</label>
                {(formImagemPreview && !formImagem) && (
                  <div className="relative mb-2">
                    <img src={formImagemPreview} alt="Comprovante" className="rounded-lg border border-border-subtle max-h-32 object-contain w-full" />
                  </div>
                )}
                {formImagem && formImagemPreview && (
                  <div className="relative mb-2">
                    <img src={formImagemPreview} alt="Nova" className="rounded-lg border border-border-subtle max-h-32 object-contain w-full" />
                  </div>
                )}
                <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle bg-elevated py-2 text-xs text-content-muted cursor-pointer hover:bg-border-medium transition-colors">
                  <ImageIcon size={14} /> {formImagemPreview ? 'Trocar imagem' : 'Adicionar comprovante'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImagemChange} />
                </label>
                {!formImagem && !selecionado.imagemUrl && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-content-secondary cursor-pointer">
                    <input type="checkbox" checked={formSemFoto} onChange={e => setFormSemFoto(e.target.checked)} className="rounded" />
                    Sem comprovante
                  </label>
                )}
                {formSemFoto && !formImagem && !selecionado.imagemUrl && (
                  <input value={formJustificativa} onChange={e => setFormJustificativa(e.target.value)} className={`${input} mt-2`} placeholder="Justificativa" />
                )}
              </div>
              {formErro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formErro}</div>}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditando(false)}
                  className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary hover:bg-border-medium transition">Cancelar</button>
                <button type="button" disabled={formLoading} onClick={async () => {
                  setFormLoading(true);
                  try {
                    let imagemUrl = selecionado.imagemUrl;
                    if (formImagem) imagemUrl = await uploadImage(formImagem, 'depositos');
                    const dep = vendedores.find(u => (u.uid || u.id) === formDepositante);
                    await updateDeposito(selecionado.id, {
                      valor: parseFloat(formValor),
                      data: formData + 'T12:00:00.000Z',
                      depositanteId: formDepositante,
                      depositanteNome: dep?.nome || '',
                      ...(imagemUrl ? { imagemUrl } : {}),
                      ...(formSemFoto && !imagemUrl ? { semFoto: true, justificativa: formJustificativa.trim() } : { semFoto: null as any, justificativa: null as any }),
                      cicloId: findCicloParaUsuario(ciclosAbertos, formDepositante, formData)?.id || null,
                    });
                    setEditando(false);
                    setSelecionado(null);
                  } catch (err) {
                    setFormErro(err instanceof Error ? err.message : String(err));
                  } finally { setFormLoading(false); }
                }}
                  className="rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 active:scale-[0.98] disabled:opacity-30 transition">
                  {formLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
