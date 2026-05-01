import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Plus, X, Pencil, Trash2, Check, ImagePlus, Fuel, UtensilsCrossed, BedDouble, Wrench, HelpCircle, Zap, Droplets, Wifi, Truck, Home, ShoppingCart, Heart, Briefcase, Star, Tag, ImageOff, type LucideIcon } from 'lucide-react';
import { createDespesa, getTiposDespesa, addTipoDespesa, updateTipoDespesa, deleteTipoDespesa } from '~/services/despesas.service';
import { getUsers } from '~/services/users.service';
import { uploadImage } from '~/services/cloudinary.service';
import { useAuth } from '~/contexts/AuthContext';
import { useCachedState, clearFormCache } from '~/hooks/useFormCache';
import type { User } from '~/models';
import { userIsVendedor, userIsAdmin } from '~/models';
import { findCicloParaUsuario } from '~/services/ciclos.service';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

const ICONES_CONHECIDOS: Record<string, LucideIcon> = {
  'Combustível': Fuel, 'Alimentação': UtensilsCrossed, 'Hospedagem': BedDouble, 'Manutenção': Wrench, 'Outro': HelpCircle,
};

const ICONES_DISPONIVEIS: { id: string; Icon: LucideIcon }[] = [
  { id: 'Fuel', Icon: Fuel }, { id: 'UtensilsCrossed', Icon: UtensilsCrossed }, { id: 'BedDouble', Icon: BedDouble },
  { id: 'Wrench', Icon: Wrench }, { id: 'Zap', Icon: Zap }, { id: 'Droplets', Icon: Droplets },
  { id: 'Wifi', Icon: Wifi }, { id: 'Truck', Icon: Truck }, { id: 'Home', Icon: Home },
  { id: 'ShoppingCart', Icon: ShoppingCart }, { id: 'Heart', Icon: Heart }, { id: 'Briefcase', Icon: Briefcase },
  { id: 'Star', Icon: Star }, { id: 'Tag', Icon: Tag },
];

const ICONE_MAP: Record<string, LucideIcon> = Object.fromEntries(ICONES_DISPONIVEIS.map(i => [i.id, i.Icon]));

export function getIconeForTipo(nome: string, iconeId?: string): LucideIcon | null {
  if (ICONES_CONHECIDOS[nome]) return ICONES_CONHECIDOS[nome];
  if (iconeId && ICONE_MAP[iconeId]) return ICONE_MAP[iconeId];
  return null;
}

// Regras de imagem por tipo
const IMAGEM_REGRAS: Record<string, number> = {
  'Combustível': 3,
  'Alimentação': 1,
  'Hospedagem': 1,
  'Manutenção': 1,
};

function getImagensObrigatorias(tipo: string): number {
  return IMAGEM_REGRAS[tipo] ?? 0;
}

type TipoItem = { key: string | null; nome: string; icone?: string };

export function DespesaForm({ onClose, dataInicial }: { onClose?: () => void; dataInicial?: string } = {}) {
  const FK = 'despesa';
  const [tipos, setTipos] = useState<TipoItem[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useCachedState(FK, 'tipo', '');
  const [tipoOutro, setTipoOutro] = useCachedState(FK, 'tipoOutro', '');
  const [novoTipo, setNovoTipo] = useState('');
  const [novoIcone, setNovoIcone] = useState('Tag');
  const [adicionando, setAdicionando] = useState(false);
  const [iconePicker, setIconePicker] = useState(false);
  const [editandoKey, setEditandoKey] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [menuTipo, setMenuTipo] = useState<string | null>(null);

  const [valor, setValor] = useCachedState(FK, 'valor', '');
  const [data, setData] = useCachedState(FK, 'data', dataInicial || new Date().toISOString().split('T')[0]);
  useEffect(() => { if (dataInicial) setData(dataInicial); }, [dataInicial]);
  const [imagens, setImagens] = useState<{ file: File; preview: string }[]>([]);
  const [semImagem, setSemImagem] = useState(false);
  const [semImagemJustificativa, setSemImagemJustificativa] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [vendedores, setVendedores] = useState<User[]>([]);
  const [vendedorId, setVendedorId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [rateioAtivo, setRateioAtivo] = useState(false);
  const [rateioIds, setRateioIds] = useState<string[]>([]);
  const [fontePagamento, setFontePagamento] = useCachedState<'caixa_interno' | 'caixa_externo' | 'misto'>(FK, 'fontePagamento', 'caixa_interno');
  const [valorInterno, setValorInterno] = useCachedState(FK, 'valorInterno', '');
  const [valorExterno, setValorExterno] = useCachedState(FK, 'valorExterno', '');
  const [ciclosAbertos, setCiclosAbertos] = useState<any[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'desenvolvedor';
  const canManageTipos = user ? userIsAdmin(user) : false;

  const isOutro = tipoSelecionado === '__outro__';
  const tipoFinal = isOutro ? tipoOutro.trim() : tipoSelecionado;
  const imagensObrigatorias = getImagensObrigatorias(tipoFinal);
  const imagensOk = semImagem || imagens.length >= imagensObrigatorias;

  // Auto-detectar ciclo para o usuário atual
  const cicloDetectado = useMemo(() => {
    if (ciclosAbertos.length === 0 || !user) return null;
    const uid = vendedorId || user.uid || user.id;
    return findCicloParaUsuario(ciclosAbertos, uid, data);
  }, [ciclosAbertos, user, vendedorId, data]);

  useEffect(() => {
    getUsers().then(u => setVendedores(u.filter(x => userIsVendedor(x) && (x.uid || x.id) !== (user?.uid || user?.id))));
    import('~/services/ciclos.service').then(m => m.getCiclosAbertos()).then(setCiclosAbertos);
  }, [user]);

  useEffect(() => {
    getTiposDespesa().then(salvos => setTipos(salvos.map(s => ({ key: s.key, nome: s.nome, icone: s.icone }))));
  }, []);

  useEffect(() => {
    if (!menuTipo) return;
    const handler = () => setMenuTipo(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuTipo]);

  // Reset imagens ao trocar tipo
  useEffect(() => {
    setSemImagem(false);
    setSemImagemJustificativa('');
  }, [tipoSelecionado]);

  const handleAdicionarTipo = async () => {
    const nome = novoTipo.trim();
    if (!nome || tipos.some(t => t.nome === nome)) { setAdicionando(false); setNovoTipo(''); return; }
    await addTipoDespesa(nome, novoIcone);
    const salvos = await getTiposDespesa();
    setTipos(salvos.map(s => ({ key: s.key, nome: s.nome, icone: s.icone })));
    setTipoSelecionado(nome);
    setNovoTipo(''); setNovoIcone('Tag'); setAdicionando(false); setIconePicker(false);
  };

  const handleEditarTipo = async (item: TipoItem) => {
    const nome = editandoNome.trim();
    if (!nome || nome === item.nome) { setEditandoKey(null); return; }
    if (item.key) {
      await updateTipoDespesa(item.key, nome, item.icone);
      setTipos(prev => prev.map(t => t.key === item.key ? { ...t, nome } : t));
      if (tipoSelecionado === item.nome) setTipoSelecionado(nome);
    }
    setEditandoKey(null);
  };

  const handleExcluirTipo = async (item: TipoItem) => {
    if (!item.key) return;
    await deleteTipoDespesa(item.key);
    setTipos(prev => prev.filter(t => t.key !== item.key));
    if (tipoSelecionado === item.nome) setTipoSelecionado('');
    setMenuTipo(null);
  };

  const handleImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxTotal = Math.max(imagensObrigatorias, 1);
    const remaining = maxTotal - imagens.length;
    const toAdd = files.slice(0, Math.max(remaining, 1));
    setImagens(prev => [...prev, ...toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    setSemImagem(false);
    e.target.value = '';
  };

  const removeImagem = (idx: number) => {
    setImagens(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !tipoFinal) return;
    if (!imagensOk) { setErro(`${tipoFinal} exige ${imagensObrigatorias} foto(s) ou justificativa`); return; }
    if (semImagem && !semImagemJustificativa.trim()) { setErro('Informe a justificativa para não ter imagem'); return; }
    setErro(''); setLoading(true);
    try {
      const imagensUrls: string[] = [];
      for (const img of imagens) {
        imagensUrls.push(await uploadImage(img.file, 'despesas'));
      }
      const alvo = isAdmin && vendedorId ? vendedores.find(v => (v.uid || v.id) === vendedorId) : null;
      const valorTotal = parseFloat(valor);
      const rateio = rateioAtivo && rateioIds.length > 0
        ? rateioIds.map(uid => {
            const u = vendedores.find(v => (v.uid || v.id) === uid);
            return { usuarioId: uid, usuarioNome: u?.nome || uid, valor: parseFloat((valorTotal / (rateioIds.length + 1)).toFixed(2)) };
          })
        : undefined;
      const usuarioId = alvo ? (alvo.uid || alvo.id) : (user.uid || user.id);
      // Auto-detectar ciclo
      const { findCicloParaUsuario } = await import('~/services/ciclos.service');
      const cicloMatch = findCicloParaUsuario(ciclosAbertos, usuarioId, data);
      // Também checar participantes do rateio
      let cicloId = cicloMatch?.id;
      if (!cicloId && rateio) {
        for (const r of rateio) {
          const cm = findCicloParaUsuario(ciclosAbertos, r.usuarioId, data);
          if (cm) { cicloId = cm.id; break; }
        }
      }
      await createDespesa({
        tipo: tipoFinal,
        valor: valorTotal,
        data: new Date(data + 'T12:00:00'),
        usuarioId,
        usuarioNome: alvo ? alvo.nome : user.nome,
        descricao: descricao.trim() || undefined,
        imagemUrl: imagensUrls[0],
        imagensUrls: imagensUrls.length > 0 ? imagensUrls : undefined,
        semImagemJustificativa: semImagem ? semImagemJustificativa.trim() : undefined,
        rateio,
        fontePagamento,
        ...(fontePagamento === 'misto' ? { valorInterno: parseFloat(valorInterno) || 0, valorExterno: parseFloat(valorExterno) || 0 } : {}),
        ...(cicloId ? { cicloId } : {}),
      });
      clearFormCache(FK);
      if (onClose) onClose(); else navigate('/despesas');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao cadastrar despesa');
    } finally { setLoading(false); }
  };

  const renderTipoIcon = (item: TipoItem, size = 14) => {
    const Ic = getIconeForTipo(item.nome, item.icone);
    return Ic ? <Ic size={size} /> : null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-lg mx-auto">
      <div>
        <label className="text-xs text-content-muted mb-2 block">Tipo da despesa</label>
        <div className="flex flex-wrap gap-1.5">
          {tipos.map(item => {
            const isEditing = editandoKey === (item.key || item.nome);
            if (isEditing) {
              return (
                <div key={item.key || item.nome} className="flex items-center gap-1">
                  <input value={editandoNome} onChange={(e) => setEditandoNome(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEditarTipo(item); } if (e.key === 'Escape') setEditandoKey(null); }}
                    className="rounded-lg border border-blue-600/30 bg-elevated px-2 py-1 text-xs text-content focus:outline-none w-28" autoFocus />
                  <button type="button" onClick={() => handleEditarTipo(item)} className="rounded-lg bg-green-600/20 text-green-400 p-1 transition hover:bg-green-600/30"><Check size={14} /></button>
                  <button type="button" onClick={() => setEditandoKey(null)} className="rounded-lg bg-red-600/20 text-red-400 p-1 transition hover:bg-red-600/30"><X size={14} /></button>
                </div>
              );
            }
            return (
              <div key={item.key || item.nome} className="relative">
                <button type="button"
                  onClick={() => { setTipoSelecionado(item.nome); setTipoOutro(''); setMenuTipo(null); }}
                  onContextMenu={(e) => { if (item.key && canManageTipos) { e.preventDefault(); setMenuTipo(item.key); } }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition flex items-center gap-1.5 ${
                    tipoSelecionado === item.nome ? 'bg-red-600/10 text-red-400 border-red-600/30' : 'bg-elevated text-content-secondary border-transparent hover:bg-border-medium'
                  }`}>
                  {renderTipoIcon(item)}
                  {item.nome}
                </button>
                {item.key && canManageTipos && menuTipo === item.key && (
                  <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border-subtle bg-surface shadow-lg py-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { setEditandoKey(item.key || item.nome); setEditandoNome(item.nome); setMenuTipo(null); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover transition-colors"><Pencil size={12} /> Editar</button>
                    <button type="button" onClick={() => handleExcluirTipo(item)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/10 transition-colors"><Trash2 size={12} /> Excluir</button>
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={() => setTipoSelecionado('__outro__')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition flex items-center gap-1.5 ${
              isOutro ? 'bg-yellow-600/10 text-yellow-400 border-yellow-600/30' : 'bg-elevated text-content-secondary border-transparent hover:bg-border-medium'
            }`}>
            <HelpCircle size={14} /> Outro
          </button>
          {canManageTipos && (adicionando ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); setIconePicker(!iconePicker); }}
                  className="rounded-lg border border-border-subtle bg-elevated p-1.5 text-content-secondary hover:bg-border-medium transition">
                  {(() => { const Ic = ICONE_MAP[novoIcone] || Tag; return <Ic size={14} />; })()}
                </button>
                <input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdicionarTipo(); } if (e.key === 'Escape') { setAdicionando(false); setNovoTipo(''); setIconePicker(false); } }}
                  className="rounded-lg border border-border-subtle bg-elevated px-2 py-1 text-xs text-content focus:outline-none focus:border-border-medium w-28" placeholder="Nome do tipo" autoFocus />
                <button type="button" onClick={handleAdicionarTipo} disabled={!novoTipo.trim()} className="rounded-lg bg-green-600/20 text-green-400 p-1 transition hover:bg-green-600/30 disabled:opacity-30"><Plus size={14} /></button>
                <button type="button" onClick={() => { setAdicionando(false); setNovoTipo(''); setIconePicker(false); }} className="rounded-lg bg-red-600/20 text-red-400 p-1 transition hover:bg-red-600/30"><X size={14} /></button>
              </div>
              {iconePicker && (
                <div className="rounded-lg border border-border-subtle bg-surface shadow-lg p-1.5 flex flex-wrap gap-1 w-fit" onClick={(e) => e.stopPropagation()}>
                  {ICONES_DISPONIVEIS.map(({ id, Icon }) => (
                    <button key={id} type="button" onClick={() => { setNovoIcone(id); setIconePicker(false); }}
                      className={`rounded-md p-1.5 transition ${novoIcone === id ? 'bg-blue-600/20 text-blue-400' : 'text-content-muted hover:bg-surface-hover hover:text-content'}`}>
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => setAdicionando(true)}
              className="rounded-lg px-2 py-1.5 text-xs font-medium border border-transparent bg-elevated text-content-secondary hover:bg-border-medium transition" title="Adicionar novo tipo">
              <Plus size={14} />
            </button>
          ))}
        </div>
        {isOutro && (
          <div className="mt-2">
            <input value={tipoOutro} onChange={(e) => setTipoOutro(e.target.value)} className={input} placeholder="Nome da despesa" required autoFocus />
            <p className="text-[10px] text-yellow-400/70 mt-1">Use apenas para despesas que não se encaixam nos tipos acima.</p>
          </div>
        )}
      </div>

      {isAdmin && vendedores.length > 0 && (
        <div>
          <label className="text-xs text-content-muted mb-1 block">Registrar em nome de (opcional)</label>
          <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={input}>
            <option value="">Meu nome ({user?.nome})</option>
            {vendedores.map(v => <option key={v.uid || v.id} value={v.uid || v.id}>{v.nome} (@{v.username})</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Valor (R$)</label>
          <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className={input} required />
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={input} required />
        </div>
      </div>

      <div>
        <label className="text-xs text-content-muted mb-1 block">Descrição (opcional)</label>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={input} placeholder="Ex: almoço na estrada, abastecimento km 320..." />
      </div>

      {/* Fonte de pagamento */}
      <div>
        <label className="text-xs text-content-muted mb-1.5 block">Pago com{cicloDetectado ? <span className="text-blue-400 ml-1">(ciclo: {cicloDetectado.vendedorNome})</span> : ''}</label>
        <div className="flex gap-2">
          {([['caixa_interno', 'Caixa interno'], ['caixa_externo', 'Caixa externo'], ['misto', 'Misto']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setFontePagamento(v)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${fontePagamento === v ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
              {l}
            </button>
          ))}
        </div>
        {fontePagamento === 'misto' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-[9px] text-content-muted">Caixa interno</label>
              <input type="number" step="0.01" min="0" value={valorInterno} className={input} placeholder="0,00"
                onChange={e => { setValorInterno(e.target.value); setValorExterno(String(Math.max(0, (parseFloat(valor) || 0) - (parseFloat(e.target.value) || 0)).toFixed(2))); }} />
            </div>
            <div>
              <label className="text-[9px] text-content-muted">Caixa externo</label>
              <input type="number" step="0.01" min="0" value={valorExterno} className={input} placeholder="0,00"
                onChange={e => { setValorExterno(e.target.value); setValorInterno(String(Math.max(0, (parseFloat(valor) || 0) - (parseFloat(e.target.value) || 0)).toFixed(2))); }} />
            </div>
          </div>
        )}
      </div>

      {/* Rateio */}
      {vendedores.length > 0 && (
        <div>
          <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
            <input type="checkbox" checked={rateioAtivo} onChange={(e) => { setRateioAtivo(e.target.checked); if (!e.target.checked) setRateioIds([]); }} className="rounded accent-blue-500" />
            Incluir outras pessoas nessa despesa
          </label>
          {rateioAtivo && (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {vendedores.map(v => {
                  const uid = v.uid || v.id;
                  const checked = rateioIds.includes(uid);
                  return (
                    <button key={uid} type="button"
                      onClick={() => setRateioIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                        checked ? 'bg-blue-600/10 text-blue-400 border-blue-600/30' : 'bg-elevated text-content-muted border-transparent hover:bg-border-medium'
                      }`}>{v.nome}</button>
                  );
                })}
              </div>
              {rateioIds.length > 0 && <p className="text-[10px] text-content-muted">Despesa registrada para {rateioIds.length + 1} pessoa(s)</p>}
            </div>
          )}
        </div>
      )}

      {/* Imagens - só aparece após selecionar tipo */}
      {tipoFinal && <div>
        <label className="text-xs text-content-muted mb-1 block">
          {imagensObrigatorias > 0
            ? `Comprovante (${imagensObrigatorias} foto${imagensObrigatorias > 1 ? 's' : ''} obrigatória${imagensObrigatorias > 1 ? 's' : ''})`
            : 'Comprovante (opcional)'}
        </label>

        {imagens.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {imagens.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.preview} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-lg border border-border-subtle object-cover" />
                <button type="button" onClick={() => removeImagem(i)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white shadow-md hover:bg-red-400 transition">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!semImagem && imagens.length < Math.max(imagensObrigatorias, 1) && (
          <label className="flex items-center gap-2 rounded-lg border border-dashed border-border-subtle bg-elevated px-3 py-2.5 text-xs text-content-muted cursor-pointer hover:border-border-medium transition-colors">
            <ImagePlus size={16} />
            <span>{imagens.length === 0 ? 'Anexar imagem' : `Adicionar foto (${imagens.length}/${imagensObrigatorias})`}</span>
            <input type="file" accept="image/*" onChange={handleImagem} className="hidden" />
          </label>
        )}

        {imagensObrigatorias > 0 && imagens.length < imagensObrigatorias && (
          <div className="mt-2">
            <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
              <input type="checkbox" checked={semImagem} onChange={(e) => setSemImagem(e.target.checked)} className="rounded accent-red-500" />
              <span className="flex items-center gap-1"><ImageOff size={12} /> Sem imagem</span>
            </label>
            {semImagem && (
              <input value={semImagemJustificativa} onChange={(e) => setSemImagemJustificativa(e.target.value)}
                className={`${input} mt-1.5`} placeholder="Justifique por que não tem foto..." required />
            )}
          </div>
        )}
      </div>}

      {erro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onClose ? onClose() : navigate('/despesas')}
          className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !tipoFinal || !imagensOk}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
          {loading ? 'Salvando...' : 'Registrar Despesa'}
        </button>
      </div>
    </form>
  );
}
