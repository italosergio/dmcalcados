import { useState, useMemo } from 'react';
import { Plus, X, Banknote, Calendar, User, Check, Filter, Pencil } from 'lucide-react';
import { useVales, useUsers } from '~/hooks/useRealtime';
import { useAuth } from '~/contexts/AuthContext';
import { createValeCard, addValeRegistro, quitarValeCard, removeValeRegistro, updateValeRegistro } from '~/services/vales.service';
import { formatCurrency } from '~/utils/format';
import type { ValeCard } from '~/models';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

export default function ValesPage() {
  const { valeCards, loading } = useVales();
  const { users } = useUsers();
  const { user } = useAuth();
  const [modalNovo, setModalNovo] = useState(false);
  const [cardAberto, setCardAberto] = useState<string | null>(null);
  const [addRegistro, setAddRegistro] = useState(false);
  const [filtroFunc, setFiltroFunc] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aberto' | 'quitado'>('todos');
  const [quitarClicks, setQuitarClicks] = useState(0);
  const [editReg, setEditReg] = useState<string | null>(null);
  const [editValor, setEditValor] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editData, setEditData] = useState('');
  const [editFontePag, setEditFontePag] = useState<'caixa_interno' | 'caixa_externo'>('caixa_interno');

  const funcionarios = users.filter(u => !u.deletedAt);

  const filtered = useMemo(() => {
    let list = valeCards;
    if (filtroFunc) list = list.filter(c => c.funcionarioId === filtroFunc);
    if (filtroStatus === 'aberto') list = list.filter(c => !c.quitado);
    if (filtroStatus === 'quitado') list = list.filter(c => c.quitado);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [valeCards, filtroFunc, filtroStatus]);

  const totalReceber = valeCards.filter(c => !c.quitado).reduce((s, c) => s + c.total, 0);
  const totalPago = valeCards.filter(c => c.quitado).reduce((s, c) => s + c.total, 0);

  const cardSelecionado = cardAberto ? valeCards.find(c => c.id === cardAberto) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Vales</h1>
        <button onClick={() => setModalNovo(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 transition">
          <Plus size={14} /> Novo Vale
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setFiltroStatus(filtroStatus === 'aberto' ? 'todos' : 'aberto')}
          className={`rounded-xl border p-4 text-left transition-colors ${filtroStatus === 'aberto' ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border-subtle bg-surface hover:bg-elevated'}`}>
          <p className="text-[10px] text-content-muted mb-1">A receber</p>
          <p className="text-xl font-bold text-yellow-400">{formatCurrency(totalReceber)}</p>
          <p className="text-[10px] text-content-muted mt-1">{valeCards.filter(c => !c.quitado).length} aberto(s)</p>
        </button>
        <button onClick={() => setFiltroStatus(filtroStatus === 'quitado' ? 'todos' : 'quitado')}
          className={`rounded-xl border p-4 text-left transition-colors ${filtroStatus === 'quitado' ? 'border-green-500/40 bg-green-500/5' : 'border-border-subtle bg-surface hover:bg-elevated'}`}>
          <p className="text-[10px] text-content-muted mb-1">Quitado</p>
          <p className="text-xl font-bold text-green-400">{formatCurrency(totalPago)}</p>
          <p className="text-[10px] text-content-muted mt-1">{valeCards.filter(c => c.quitado).length} quitado(s)</p>
        </button>
      </div>

      {/* Filtro funcionário */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-content-muted" />
        <select value={filtroFunc} onChange={e => setFiltroFunc(e.target.value)}
          className="rounded-lg border border-border-subtle bg-elevated px-2 py-1.5 text-xs text-content focus:outline-none">
          <option value="">Todos os funcionários</option>
          {funcionarios.map(u => (
            <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
          ))}
        </select>
        {(filtroFunc || filtroStatus !== 'todos') && (
          <button onClick={() => { setFiltroFunc(''); setFiltroStatus('todos'); }}
            className="text-[10px] text-blue-400 hover:text-blue-300">Limpar filtros</button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-5 w-5 border-2 border-content-muted border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle py-16 text-center">
          <Banknote size={32} className="mx-auto text-content-muted mb-2" />
          <p className="text-sm text-content-muted">{valeCards.length === 0 ? 'Nenhum vale registrado' : 'Nenhum vale encontrado com os filtros'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(card => (
            <button key={card.id} onClick={() => { setCardAberto(card.id); setQuitarClicks(0); setAddRegistro(false); }}
              className={`rounded-xl border p-4 text-left transition-colors ${card.quitado ? 'border-green-500/20 bg-green-500/5 opacity-70' : 'border-border-subtle bg-surface hover:bg-elevated'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User size={16} className="text-content-muted shrink-0" />
                  <span className="text-sm font-semibold truncate">{card.funcionarioNome}</span>
                </div>
                {card.quitado && <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium shrink-0">Quitado</span>}
              </div>
              <p className={`text-xl font-bold ${card.quitado ? 'text-green-400' : 'text-yellow-400'}`}>{formatCurrency(card.total)}</p>
              <p className="text-[10px] text-content-muted mt-1">
                {Object.keys(card.registros || {}).length} registro(s)
                {card.quitado && card.quitadoEm && ` · quitado ${new Date(card.quitadoEm).toLocaleDateString('pt-BR')}`}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Modal detalhe do card */}
      {cardSelecionado && (() => {
        const card = cardSelecionado;
        const regs = Object.entries(card.registros || {})
          .map(([k, r]: [string, any]) => ({ id: k, ...r }))
          .sort((a, b) => b.data.localeCompare(a.data));
        return (
          <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={() => setCardAberto(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
                <div>
                  <p className="text-sm font-semibold">{card.funcionarioNome}</p>
                  <p className={`text-xs font-bold ${card.quitado ? 'text-green-400' : 'text-yellow-400'}`}>
                    Total: {formatCurrency(card.total)}
                    {card.quitado && <span className="text-green-400 ml-2 text-[10px] font-medium">Quitado</span>}
                  </p>
                </div>
                <button onClick={() => setCardAberto(null)} className="text-content-muted hover:text-content"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-2">
                {regs.length === 0 && <p className="text-xs text-content-muted text-center py-4">Nenhum registro ainda</p>}
                {regs.map(r => (
                  <div key={r.id} className="rounded-lg bg-elevated p-3">
                    {editReg === r.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-content-muted">Valor</label>
                            <input type="number" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)}
                              className="w-full rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="text-[9px] text-content-muted">Data</label>
                            <input type="date" value={editData} onChange={e => setEditData(e.target.value)}
                              className="w-full rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] text-content-muted">Descrição</label>
                          <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                            className="w-full rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs text-content focus:outline-none focus:border-blue-500" placeholder="Opcional" />
                        </div>
                        <div>
                          <label className="text-[9px] text-content-muted mb-1 block">Pago com</label>
                          <div className="flex gap-2">
                            {([['caixa_interno', '💵 Interno'], ['caixa_externo', '🏦 Externo']] as const).map(([v, l]) => (
                              <button key={v} type="button" onClick={() => setEditFontePag(v)}
                                className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition ${editFontePag === v ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditReg(null)} className="flex-1 rounded-lg border border-border-subtle py-1.5 text-[10px] text-content-secondary hover:bg-border-medium transition">Cancelar</button>
                          <button onClick={() => {
                            updateValeRegistro(card.id, r.id, { valor: parseFloat(editValor) || r.valor, data: editData || r.data, fontePagamento: editFontePag, ...(editDesc.trim() ? { descricao: editDesc.trim() } : { descricao: '' }) });
                            setEditReg(null);
                          }} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-[10px] font-medium text-white hover:bg-blue-500 transition">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] text-content-muted mb-0.5">
                            <Calendar size={10} />
                            {new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </div>
                          {r.descricao && <p className="text-xs text-content-secondary truncate">{r.descricao}</p>}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-content-muted">por {r.registradoPorNome}</p>
                            {r.fontePagamento && (
                              <span className={`text-[9px] px-1 py-0.5 rounded ${r.fontePagamento === 'caixa_externo' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                                {r.fontePagamento === 'caixa_externo' ? '🏦 Externo' : '💵 Interno'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-bold text-yellow-400 whitespace-nowrap">{formatCurrency(r.valor)}</span>
                          {!card.quitado && (
                            <>
                              <button onClick={() => { setEditReg(r.id); setEditValor(String(r.valor)); setEditDesc(r.descricao || ''); setEditData(r.data); setEditFontePag(r.fontePagamento || 'caixa_interno'); }}
                                className="text-content-muted/40 hover:text-blue-400 transition-colors"><Pencil size={12} /></button>
                              <button onClick={() => removeValeRegistro(card.id, r.id)}
                                className="text-content-muted/40 hover:text-red-500 transition-colors"><X size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Adicionar registro */}
                {!card.quitado && !addRegistro && (
                  <button onClick={() => setAddRegistro(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle py-2.5 text-xs text-content-muted hover:bg-elevated transition">
                    <Plus size={14} /> Adicionar vale
                  </button>
                )}
                {!card.quitado && addRegistro && (
                  <AddRegistroForm cardId={card.id} user={user} onDone={() => setAddRegistro(false)} />
                )}

                {/* Quitar */}
                {!card.quitado && (
                  <button onClick={() => {
                    setQuitarClicks(p => p + 1);
                    if (quitarClicks >= 2) { quitarValeCard(card.id); setCardAberto(null); }
                  }}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                      quitarClicks === 0 ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      : quitarClicks === 1 ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      : 'bg-green-600/30 text-green-200 hover:bg-green-600/40'
                    }`}>
                    <Check size={14} />
                    {quitarClicks === 0 ? 'Marcar como quitado' : quitarClicks === 1 ? 'Clique novamente' : 'Confirmar quitação'}
                  </button>
                )}

                {card.quitado && card.quitadoPorNome && (
                  <p className="text-[10px] text-content-muted text-center">
                    Quitado por {card.quitadoPorNome} em {new Date(card.quitadoEm!).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal novo vale card */}
      {modalNovo && <NovoValeModal funcionarios={funcionarios} user={user} valeCards={valeCards} onClose={() => setModalNovo(false)} onOpenCard={(id) => { setCardAberto(id); setQuitarClicks(0); setAddRegistro(false); }} />}
    </div>
  );
}

function AddRegistroForm({ cardId, user, onDone }: { cardId: string; user: any; onDone: () => void }) {
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [fonte, setFonte] = useState<'caixa_interno' | 'caixa_externo'>('caixa_interno');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!valor || !user) return;
    setSaving(true);
    try {
      await addValeRegistro(cardId, {
        valor: parseFloat(valor),
        ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
        data,
        fontePagamento: fonte,
        registradoPor: user.uid || user.id,
        registradoPorNome: user.nome,
      });
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-content-muted">Valor</label>
          <input type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} className={input} placeholder="0,00" />
        </div>
        <div>
          <label className="text-[9px] text-content-muted">Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className={input} />
        </div>
      </div>
      <div>
        <label className="text-[9px] text-content-muted">Descrição (opcional)</label>
        <input value={descricao} onChange={e => setDescricao(e.target.value)} className={input} placeholder="Ex: adiantamento" />
      </div>
      <div>
        <label className="text-[9px] text-content-muted mb-1 block">Pago com</label>
        <div className="flex gap-2">
          {([['caixa_interno', '💵 Caixa interno'], ['caixa_externo', '🏦 Caixa externo']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setFonte(v)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition ${fonte === v ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-lg border border-border-subtle bg-elevated py-2 text-xs text-content-secondary hover:bg-border-medium transition">Cancelar</button>
        <button onClick={handleSave} disabled={saving || !valor}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-30 transition">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function NovoValeModal({ funcionarios, user, valeCards, onClose, onOpenCard }: { funcionarios: any[]; user: any; valeCards: ValeCard[]; onClose: () => void; onOpenCard: (id: string) => void }) {
  const [funcionarioId, setFuncionarioId] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const cardAberto = funcionarioId ? valeCards.find(c => c.funcionarioId === funcionarioId && !c.quitado) : null;

  const handleSave = async () => {
    if (!funcionarioId || !user) return;
    if (cardAberto) return;
    setSaving(true); setErro('');
    try {
      const func = funcionarios.find((u: any) => (u.uid || u.id) === funcionarioId);
      const cardId = await createValeCard(funcionarioId, func?.nome || '');
      onClose();
      onOpenCard(cardId);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <span className="text-sm font-semibold">Novo Vale</span>
          <button onClick={onClose} className="text-content-muted hover:text-content"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-content-muted mb-1 block">Funcionário</label>
            <select value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)} className={input}>
              <option value="">Selecione...</option>
              {funcionarios.map(u => (
                <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
              ))}
            </select>
            {cardAberto && (
              <div className="mt-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2.5 text-xs text-yellow-400">
                Já existe vale aberto para este funcionário ({formatCurrency(cardAberto.total)}).
                <button onClick={() => { onClose(); onOpenCard(cardAberto.id); }} className="block mt-1 text-blue-400 hover:text-blue-300 font-medium">Abrir vale existente</button>
              </div>
            )}
          </div>
          {erro && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erro}</p>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={onClose}
              className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-xs font-medium text-content-secondary hover:bg-border-medium transition">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !funcionarioId || !!cardAberto}
              className="rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-30 transition">
              {saving ? 'Criando...' : 'Criar Vale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
