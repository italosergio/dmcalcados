import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Plus, X, Pencil, Trash2, Check, ImagePlus, Fuel, UtensilsCrossed, BedDouble, Wrench, HelpCircle, Zap, Droplets, Wifi, Truck, Home, ShoppingCart, Heart, Briefcase, Star, Tag, type LucideIcon } from 'lucide-react';
import { createDespesa, getTiposDespesa, addTipoDespesa, updateTipoDespesa, deleteTipoDespesa } from '~/services/despesas.service';
import { uploadImage } from '~/services/cloudinary.service';
import { useAuth } from '~/contexts/AuthContext';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

// Ícones conhecidos por nome de tipo
const ICONES_CONHECIDOS: Record<string, LucideIcon> = {
  'Combustível': Fuel,
  'Alimentação': UtensilsCrossed,
  'Hospedagem': BedDouble,
  'Manutenção': Wrench,
  'Outro': HelpCircle,
};

// Ícones disponíveis para seleção ao criar tipo novo
const ICONES_DISPONIVEIS: { id: string; Icon: LucideIcon }[] = [
  { id: 'Fuel', Icon: Fuel },
  { id: 'UtensilsCrossed', Icon: UtensilsCrossed },
  { id: 'BedDouble', Icon: BedDouble },
  { id: 'Wrench', Icon: Wrench },
  { id: 'Zap', Icon: Zap },
  { id: 'Droplets', Icon: Droplets },
  { id: 'Wifi', Icon: Wifi },
  { id: 'Truck', Icon: Truck },
  { id: 'Home', Icon: Home },
  { id: 'ShoppingCart', Icon: ShoppingCart },
  { id: 'Heart', Icon: Heart },
  { id: 'Briefcase', Icon: Briefcase },
  { id: 'Star', Icon: Star },
  { id: 'Tag', Icon: Tag },
];

// Mapa id -> componente para resolver ícone salvo
const ICONE_MAP: Record<string, LucideIcon> = Object.fromEntries(ICONES_DISPONIVEIS.map(i => [i.id, i.Icon]));

export function getIconeForTipo(nome: string, iconeId?: string): LucideIcon | null {
  if (ICONES_CONHECIDOS[nome]) return ICONES_CONHECIDOS[nome];
  if (iconeId && ICONE_MAP[iconeId]) return ICONE_MAP[iconeId];
  return null;
}

type TipoItem = { key: string | null; nome: string; icone?: string };

export function DespesaForm() {
  const [tipos, setTipos] = useState<TipoItem[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [tipoOutro, setTipoOutro] = useState('');
  const [novoTipo, setNovoTipo] = useState('');
  const [novoIcone, setNovoIcone] = useState('Tag');
  const [adicionando, setAdicionando] = useState(false);
  const [iconePicker, setIconePicker] = useState(false);
  const [editandoKey, setEditandoKey] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [menuTipo, setMenuTipo] = useState<string | null>(null);

  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [imagem, setImagem] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    getTiposDespesa().then(salvos => {
      setTipos(salvos.map(s => ({ key: s.key, nome: s.nome, icone: s.icone })));
    });
  }, []);

  useEffect(() => {
    if (!menuTipo) return;
    const handler = () => setMenuTipo(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuTipo]);

  const isOutro = tipoSelecionado === '__outro__';
  const tipoFinal = isOutro ? tipoOutro.trim() : tipoSelecionado;

  const handleAdicionarTipo = async () => {
    const nome = novoTipo.trim();
    if (!nome || tipos.some(t => t.nome === nome)) { setAdicionando(false); setNovoTipo(''); return; }
    await addTipoDespesa(nome, novoIcone);
    const salvos = await getTiposDespesa();
    const novo = salvos.find(s => s.nome === nome);
    setTipos(salvos.map(s => ({ key: s.key, nome: s.nome, icone: s.icone })));
    setTipoSelecionado(nome);
    setNovoTipo('');
    setNovoIcone('Tag');
    setAdicionando(false);
    setIconePicker(false);
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
    const file = e.target.files?.[0];
    if (!file) return;
    setImagem(file);
    setImagemPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !tipoFinal) return;
    setErro(''); setLoading(true);
    try {
      let imagemUrl: string | undefined;
      if (imagem) imagemUrl = await uploadImage(imagem, 'despesas');
      await createDespesa({ tipo: tipoFinal, valor: parseFloat(valor), data: new Date(data + 'T12:00:00'), usuarioId: user.uid, usuarioNome: user.nome, imagemUrl } as any);
      navigate('/despesas');
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
                  <button type="button" onClick={() => handleEditarTipo(item)}
                    className="rounded-lg bg-green-600/20 text-green-400 p-1 transition hover:bg-green-600/30">
                    <Check size={14} />
                  </button>
                  <button type="button" onClick={() => setEditandoKey(null)}
                    className="rounded-lg bg-red-600/20 text-red-400 p-1 transition hover:bg-red-600/30">
                    <X size={14} />
                  </button>
                </div>
              );
            }
            return (
              <div key={item.key || item.nome} className="relative">
                <button type="button"
                  onClick={() => { setTipoSelecionado(item.nome); setTipoOutro(''); setMenuTipo(null); }}
                  onContextMenu={(e) => { if (item.key) { e.preventDefault(); setMenuTipo(item.key); } }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition flex items-center gap-1.5 ${
                    tipoSelecionado === item.nome
                      ? 'bg-red-600/10 text-red-400 border-red-600/30'
                      : 'bg-elevated text-content-secondary border-transparent hover:bg-border-medium'
                  }`}>
                  {renderTipoIcon(item)}
                  {item.nome}
                </button>
                {item.key && menuTipo === item.key && (
                  <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border-subtle bg-surface shadow-lg py-1 min-w-[120px]"
                    onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { setEditandoKey(item.key || item.nome); setEditandoNome(item.nome); setMenuTipo(null); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover transition-colors">
                      <Pencil size={12} /> Editar
                    </button>
                    <button type="button" onClick={() => handleExcluirTipo(item)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/10 transition-colors">
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={() => setTipoSelecionado('__outro__')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition flex items-center gap-1.5 ${
              isOutro
                ? 'bg-yellow-600/10 text-yellow-400 border-yellow-600/30'
                : 'bg-elevated text-content-secondary border-transparent hover:bg-border-medium'
            }`}>
            <HelpCircle size={14} />
            Outro
          </button>
          {adicionando ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); setIconePicker(!iconePicker); }}
                  className="rounded-lg border border-border-subtle bg-elevated p-1.5 text-content-secondary hover:bg-border-medium transition">
                  {(() => { const Ic = ICONE_MAP[novoIcone] || Tag; return <Ic size={14} />; })()}
                </button>
                <input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdicionarTipo(); } if (e.key === 'Escape') { setAdicionando(false); setNovoTipo(''); setIconePicker(false); } }}
                  className="rounded-lg border border-border-subtle bg-elevated px-2 py-1 text-xs text-content focus:outline-none focus:border-border-medium w-28"
                  placeholder="Nome do tipo" autoFocus />
                <button type="button" onClick={handleAdicionarTipo} disabled={!novoTipo.trim()}
                  className="rounded-lg bg-green-600/20 text-green-400 p-1 transition hover:bg-green-600/30 disabled:opacity-30">
                  <Plus size={14} />
                </button>
                <button type="button" onClick={() => { setAdicionando(false); setNovoTipo(''); setIconePicker(false); }}
                  className="rounded-lg bg-red-600/20 text-red-400 p-1 transition hover:bg-red-600/30">
                  <X size={14} />
                </button>
              </div>
              {iconePicker && (
                <div className="rounded-lg border border-border-subtle bg-surface shadow-lg p-1.5 flex flex-wrap gap-1 w-fit"
                  onClick={(e) => e.stopPropagation()}>
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
              className="rounded-lg px-2 py-1.5 text-xs font-medium border border-transparent bg-elevated text-content-secondary hover:bg-border-medium transition"
              title="Adicionar novo tipo">
              <Plus size={14} />
            </button>
          )}
        </div>
        {isOutro && (
          <div className="mt-2">
            <input value={tipoOutro} onChange={(e) => setTipoOutro(e.target.value)} className={input}
              placeholder="Nome da despesa" required autoFocus />
            <p className="text-[10px] text-yellow-400/70 mt-1">Use apenas para despesas que não se encaixam nos tipos acima.</p>
          </div>
        )}
      </div>

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
        <label className="text-xs text-content-muted mb-1 block">Comprovante (opcional)</label>
        {imagemPreview ? (
          <div className="relative inline-block">
            <img src={imagemPreview} alt="Preview" className="h-24 rounded-lg border border-border-subtle object-cover" />
            <button type="button" onClick={() => { setImagem(null); setImagemPreview(null); }}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white shadow-md hover:bg-red-400 transition">
              <X size={12} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 rounded-lg border border-dashed border-border-subtle bg-elevated px-3 py-2.5 text-xs text-content-muted cursor-pointer hover:border-border-medium transition-colors">
            <ImagePlus size={16} />
            <span>Anexar imagem</span>
            <input type="file" accept="image/*" onChange={handleImagem} className="hidden" />
          </label>
        )}
      </div>

      {erro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => navigate('/despesas')}
          className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !tipoFinal}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-300 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
          {loading ? 'Salvando...' : 'Registrar Despesa'}
        </button>
      </div>
    </form>
  );
}
