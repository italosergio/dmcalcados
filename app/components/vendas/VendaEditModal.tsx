import { useState } from 'react';
import { X, Check, Pencil, Package, Hash, ImageIcon, Trash2 } from 'lucide-react';
import { uploadImage } from '~/services/cloudinary.service';
import { formatCurrency } from '~/utils/format';
import type { Venda, Cliente, Produto, CondicaoPagamento, VendaProduto, User } from '~/models';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-xs text-content focus:outline-none focus:border-blue-500 transition-colors";
const PECAS_POR_PACOTE = 15;

const CONDICOES: { value: CondicaoPagamento; label: string }[] = [
  { value: 'avista', label: 'À Vista' },
  { value: '1x', label: '1x' },
  { value: '2x', label: '2x' },
  { value: '3x', label: '3x' },
];

interface Props {
  venda: Venda;
  clientes: Cliente[];
  users: User[];
  produtos: Produto[];
  onClose: () => void;
  onSave: (vendaId: string, updates: Partial<Venda>) => void;
}

export function VendaEditModal({ venda, clientes, users, produtos, onClose, onSave }: Props) {
  const [vendedorId, setVendedorId] = useState(venda.vendedorId);
  const [clienteId, setClienteId] = useState(venda.clienteId);
  const baseCondicao = venda.condicaoPagamento.replace('_entrada', '') as CondicaoPagamento;
  const [condicao, setCondicao] = useState<CondicaoPagamento>(baseCondicao);
  const [comEntrada, setComEntrada] = useState(venda.condicaoPagamento.includes('_entrada'));
  const [entradaForma, setEntradaForma] = useState<'pix' | 'dinheiro' | 'misto'>((venda as any).entradaForma || 'dinheiro');
  const [valorPix, setValorPix] = useState(String((venda as any).valorPix || 0));
  const [valorDinheiro, setValorDinheiro] = useState(String((venda as any).valorDinheiro || 0));
  const [valorAvista, setValorAvista] = useState(String(venda.valorAvista || 0));
  const [valorPrazo, setValorPrazo] = useState(String(venda.valorPrazo || 0));
  const [parcelas, setParcelas] = useState(venda.parcelas || 0);
  const [datasParcelas, setDatasParcelas] = useState<string[]>(venda.datasParcelas || []);
  const [dataVenda, setDataVenda] = useState(new Date(venda.data).toISOString().slice(0, 10));
  const [editProdutos, setEditProdutos] = useState<VendaProduto[]>(venda.produtos.map(p => ({ ...p })));
  const [desconto, setDesconto] = useState(String(venda.desconto || 0));
  const [descricao, setDescricao] = useState(venda.descricao || '');
  const [imagemUrl, setImagemUrl] = useState(venda.imagemUrl || '');
  const [novaImagem, setNovaImagem] = useState<File | null>(null);
  const [novaImagemPreview, setNovaImagemPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const vendedores = users.filter(u => !u.deletedAt);
  const clientesList = clientes.filter(c => !(c as any).deletedAt);

  const subtotal = editProdutos.reduce((s, p) => s + p.valorTotal, 0);
  const descontoVal = parseFloat(desconto) || 0;
  const total = Math.max(0, subtotal - descontoVal);

  const handleProdutoQtd = (i: number, qtd: number) => {
    const arr = [...editProdutos];
    const p = arr[i];
    const pecas = p.tipo === 'pacote' ? qtd * PECAS_POR_PACOTE : qtd;
    arr[i] = { ...p, quantidade: qtd, valorTotal: pecas * p.valorUnitario };
    setEditProdutos(arr);
  };

  const handleProdutoValor = (i: number, val: number) => {
    const arr = [...editProdutos];
    const p = arr[i];
    const pecas = p.tipo === 'pacote' ? p.quantidade * PECAS_POR_PACOTE : p.quantidade;
    arr[i] = { ...p, valorUnitario: val, valorTotal: pecas * val };
    setEditProdutos(arr);
  };

  const handleProdutoTipo = (i: number, tipo: 'pacote' | 'unidade') => {
    const arr = [...editProdutos];
    const p = arr[i];
    const pecas = tipo === 'pacote' ? p.quantidade * PECAS_POR_PACOTE : p.quantidade;
    arr[i] = { ...p, tipo, valorTotal: pecas * p.valorUnitario };
    setEditProdutos(arr);
  };

  const removeProduto = (i: number) => {
    setEditProdutos(editProdutos.filter((_, idx) => idx !== i));
  };

  const addProduto = (prod: Produto) => {
    if (editProdutos.some(p => p.produtoId === prod.id)) return;
    setEditProdutos([...editProdutos, {
      produtoId: prod.id, modelo: prod.modelo, referencia: prod.referencia,
      quantidade: 1, tipo: 'pacote', valorSugerido: prod.valor, valorUnitario: prod.valor, valorTotal: prod.valor * PECAS_POR_PACOTE,
    }]);
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNovaImagem(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNovaImagemPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const novoTotal = Math.max(0, editProdutos.reduce((s, p) => s + p.valorTotal, 0) - descontoVal);
      const vendedor = vendedores.find(u => (u.uid || u.id) === vendedorId);
      const cliente = clientesList.find(c => c.id === clienteId);

      const condicaoFinal: CondicaoPagamento = comEntrada && condicao !== 'avista'
        ? `${condicao}_entrada` as CondicaoPagamento
        : condicao;

      let finalImagemUrl = imagemUrl || undefined;
      if (novaImagem) finalImagemUrl = await uploadImage(novaImagem, 'vendas');

      const updates: any = {
        vendedorId,
        vendedorNome: vendedor?.nome || venda.vendedorNome,
        clienteId,
        clienteNome: cliente?.nome || venda.clienteNome,
        produtos: editProdutos,
        valorTotal: novoTotal,
        condicaoPagamento: condicaoFinal,
        valorAvista: parseFloat(valorAvista) || 0,
        valorPrazo: parseFloat(valorPrazo) || 0,
        parcelas,
        datasParcelas,
        data: new Date(dataVenda + 'T12:00:00'),
        desconto: descontoVal > 0 ? descontoVal : null,
        descricao: descricao.trim() || null,
        imagemUrl: finalImagemUrl || null,
        ...(condicao === 'avista' || comEntrada ? {
          entradaForma,
          ...(entradaForma === 'misto' ? { valorPix: parseFloat(valorPix) || 0, valorDinheiro: parseFloat(valorDinheiro) || 0 } : { valorPix: null, valorDinheiro: null }),
        } : { entradaForma: null, valorPix: null, valorDinheiro: null }),
      };
      onSave(venda.id, updates);
    } finally {
      setSaving(false);
    }
  };

  const [addProdSearch, setAddProdSearch] = useState('');
  const produtosFiltrados = addProdSearch.length >= 2
    ? produtos.filter(p => !editProdutos.some(ep => ep.produtoId === p.id) && (p.modelo.toLowerCase().includes(addProdSearch.toLowerCase()) || p.referencia?.toLowerCase().includes(addProdSearch.toLowerCase())))
    : [];

  return (
    <div className="fixed inset-0 lg:left-64 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border-subtle px-5 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Pencil size={14} className="text-blue-400" />
            <span className="text-sm font-semibold">Editar Venda #{venda.pedidoNumero}</span>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Data */}
          <div>
            <label className="text-[10px] text-content-muted mb-1 block">Data da venda</label>
            <input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className={input} />
          </div>

          {/* Vendedor */}
          <div>
            <label className="text-[10px] text-content-muted mb-1 block">Vendedor</label>
            <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={input}>
              {vendedores.map(u => (
                <option key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Cliente */}
          <div>
            <label className="text-[10px] text-content-muted mb-1 block">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={input}>
              {clientesList.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Produtos */}
          <div>
            <label className="text-[10px] text-content-muted mb-1.5 block">Produtos</label>
            <div className="space-y-2">
              {editProdutos.map((p, i) => (
                <div key={i} className="rounded-lg bg-elevated p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{p.modelo} {p.referencia && <span className="text-content-muted">({p.referencia})</span>}</p>
                    <button type="button" onClick={() => removeProduto(i)} className="text-red-500/60 hover:text-red-500"><X size={14} /></button>
                  </div>
                  {/* Tipo: pacote/unidade */}
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => handleProdutoTipo(i, 'pacote')}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition ${(p.tipo || 'pacote') === 'pacote' ? 'bg-blue-600 text-white' : 'bg-surface text-content-secondary hover:bg-border-medium'}`}>
                      <Package size={11} /> Pacote ({PECAS_POR_PACOTE}pç)
                    </button>
                    <button type="button" onClick={() => handleProdutoTipo(i, 'unidade')}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition ${p.tipo === 'unidade' ? 'bg-blue-600 text-white' : 'bg-surface text-content-secondary hover:bg-border-medium'}`}>
                      <Hash size={11} /> Unidade
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-content-muted">Qtd {(p.tipo || 'pacote') === 'pacote' ? 'pct' : 'un'}</label>
                      <input type="number" min="1" value={p.quantidade} onChange={(e) => handleProdutoQtd(i, parseInt(e.target.value) || 1)} className={input} />
                    </div>
                    <div>
                      <label className="text-[9px] text-content-muted">Valor un.</label>
                      <input type="number" step="0.01" min="0" value={p.valorUnitario} onChange={(e) => handleProdutoValor(i, parseFloat(e.target.value) || 0)} className={input} />
                    </div>
                    <div>
                      <label className="text-[9px] text-content-muted">Total</label>
                      <p className="text-xs font-bold text-green-400 py-2">{formatCurrency(p.valorTotal)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 relative">
              <input value={addProdSearch} onChange={(e) => setAddProdSearch(e.target.value)} className={input} placeholder="Adicionar produto..." />
              {produtosFiltrados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border-subtle bg-surface shadow-lg max-h-32 overflow-y-auto">
                  {produtosFiltrados.slice(0, 5).map(p => (
                    <button key={p.id} type="button" onClick={() => { addProduto(p); setAddProdSearch(''); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-elevated transition-colors">
                      {p.modelo} {p.referencia && `(${p.referencia})`} — {formatCurrency(p.valor)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desconto + Total */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-content-muted whitespace-nowrap">Desconto</label>
              <input type="number" step="0.01" min="0" max={subtotal} value={desconto} onChange={(e) => setDesconto(e.target.value)}
                className={`${input} max-w-[8rem] text-right`} placeholder="0,00" />
            </div>
            {descontoVal > 0 && (
              <div className="flex justify-between text-xs text-content-muted px-1">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2">
              <span className="text-xs font-semibold">Total</span>
              <span className="text-sm font-bold text-green-400">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Pagamento */}
          <div>
            <label className="text-[10px] text-content-muted mb-1.5 block">Pagamento</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CONDICOES.map(opt => (
                <button key={opt.value} type="button" onClick={() => {
                  setCondicao(opt.value);
                  if (opt.value === 'avista') { setValorAvista(String(total)); setValorPrazo('0'); setParcelas(0); setDatasParcelas([]); setComEntrada(false); }
                  else {
                    const n = opt.value === '1x' ? 1 : opt.value === '2x' ? 2 : 3;
                    setParcelas(n);
                    if (!comEntrada) { setValorAvista('0'); setValorPrazo(String(total)); }
                    setDatasParcelas(prev => prev.length === n && prev.every(d => d) ? prev : Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + 30 * (i + 1)); return d.toISOString().slice(0, 10); }));
                  }
                }}
                  className={`rounded-lg py-2 text-[10px] font-medium transition ${condicao === opt.value ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Forma: à vista ou entrada */}
            {(condicao === 'avista' || comEntrada) && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-[10px] text-content-muted">{condicao === 'avista' ? 'Forma:' : 'Forma da entrada:'}</span>
                {(['dinheiro', 'pix', 'misto'] as const).map(f => (
                  <button key={f} type="button" onClick={() => setEntradaForma(f)}
                    className={`rounded-lg px-3 py-1 text-[10px] font-medium transition ${entradaForma === f ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'}`}>
                    {f === 'dinheiro' ? 'Dinheiro' : f === 'pix' ? 'Pix' : 'Misto'}
                  </button>
                ))}
              </div>
            )}
            {(condicao === 'avista' || comEntrada) && entradaForma === 'misto' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[9px] text-content-muted">Pix</label>
                  <input type="number" step="0.01" min="0" value={valorPix} className={input} placeholder="0.00"
                    onChange={(e) => { const base = condicao === 'avista' ? total : parseFloat(valorAvista) || 0; setValorPix(e.target.value); setValorDinheiro(String(Math.max(0, base - (parseFloat(e.target.value) || 0)).toFixed(2))); }} />
                </div>
                <div>
                  <label className="text-[9px] text-content-muted">Dinheiro</label>
                  <input type="number" step="0.01" min="0" value={valorDinheiro} className={input} placeholder="0.00"
                    onChange={(e) => { const base = condicao === 'avista' ? total : parseFloat(valorAvista) || 0; setValorDinheiro(e.target.value); setValorPix(String(Math.max(0, base - (parseFloat(e.target.value) || 0)).toFixed(2))); }} />
                </div>
              </div>
            )}

            {/* Checkbox com entrada (apenas para parcelas) */}
            {condicao !== 'avista' && (
              <label className="flex items-center gap-2 text-[10px] text-content-secondary cursor-pointer justify-center mt-2">
                <input type="checkbox" checked={comEntrada} onChange={(e) => {
                  setComEntrada(e.target.checked);
                  if (!e.target.checked) { setValorAvista('0'); setValorPrazo(String(total)); }
                }} className="rounded" />
                Com entrada
              </label>
            )}

            {condicao !== 'avista' && comEntrada && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[9px] text-content-muted">Entrada</label>
                  <input type="number" step="0.01" min="0" max={total} value={valorAvista} className={input} placeholder="0.00"
                    onChange={(e) => { const v = Math.min(parseFloat(e.target.value) || 0, total); setValorAvista(e.target.value ? String(v) : ''); setValorPrazo((total - v).toFixed(2)); }} />
                </div>
                <div>
                  <label className="text-[9px] text-content-muted">Restante{parcelas > 0 && ` (${parcelas}x ${formatCurrency((parseFloat(valorPrazo) || 0) / parcelas)})`}</label>
                  <input type="number" step="0.01" value={valorPrazo} className={`${input} opacity-60`} disabled />
                </div>
              </div>
            )}

            {condicao !== 'avista' && datasParcelas.length > 0 && (
              <div className={`grid gap-2 mt-2 ${datasParcelas.length === 3 ? 'grid-cols-3' : datasParcelas.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {datasParcelas.map((d, i) => (
                  <div key={i}>
                    <label className="text-[9px] text-content-muted">{i + 1}ª parcela</label>
                    <input type="date" value={d} onChange={(e) => { const arr = [...datasParcelas]; arr[i] = e.target.value; setDatasParcelas(arr); }} className={input} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observação */}
          <div>
            <label className="text-[10px] text-content-muted mb-1 block">Observação</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2}
              className={`${input} resize-none`} placeholder="Observação opcional..." />
          </div>

          {/* Foto */}
          <div>
            <label className="text-[10px] text-content-muted mb-1 block">Foto / Comprovante</label>
            {(imagemUrl || novaImagemPreview) && !novaImagem && imagemUrl && (
              <div className="relative mb-2">
                <img src={imagemUrl} alt="Comprovante" className="rounded-lg border border-border-subtle max-h-32 object-contain w-full" />
                <button type="button" onClick={() => setImagemUrl('')}
                  className="absolute top-1 right-1 rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
            {novaImagemPreview && (
              <div className="relative mb-2">
                <img src={novaImagemPreview} alt="Nova imagem" className="rounded-lg border border-border-subtle max-h-32 object-contain w-full" />
                <button type="button" onClick={() => { setNovaImagem(null); setNovaImagemPreview(null); }}
                  className="absolute top-1 right-1 rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
            <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle bg-elevated py-2 text-xs text-content-muted cursor-pointer hover:bg-border-medium transition-colors">
              <ImageIcon size={14} /> {imagemUrl || novaImagemPreview ? 'Trocar imagem' : 'Adicionar imagem'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImagemChange} />
            </label>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-xs font-medium text-content-secondary transition hover:bg-border-medium">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving || editProdutos.length === 0}
              className="rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-1.5">
              <Check size={14} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
