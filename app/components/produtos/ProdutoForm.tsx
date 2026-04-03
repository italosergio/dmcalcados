import { useState, useEffect, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { createProduto, updateProduto, getProdutos } from '~/services/produtos.service';
import { createEntrada } from '~/services/entradas.service';
import { uploadImage } from '~/services/cloudinary.service';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Produto } from '~/models';

const inputBase = "w-full rounded-lg border bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:ring-1 transition-colors";
const inputOk = `${inputBase} border-border-subtle focus:border-border-medium focus:ring-blue-500/30`;
const inputError = `${inputBase} border-red-500/50 focus:border-red-500 focus:ring-red-500/30`;

interface ProdutoFormProps {
  produto?: Produto;
}

export function ProdutoForm({ produto }: ProdutoFormProps) {
  const isEdit = !!produto;
  const [modelo, setModelo] = useState(produto?.modelo || '');
  const [referencia, setReferencia] = useState(produto?.referencia || '');
  const [valor, setValor] = useState(produto?.valor?.toString() || '');
  const [estoquePct, setEstoquePct] = useState(produto ? Math.floor(produto.estoque / 15).toString() : '');
  const [estoqueUn, setEstoqueUn] = useState(produto?.estoque?.toString() || '');
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(produto?.foto || '');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [existentes, setExistentes] = useState<Produto[]>([]);
  const navigate = useNavigate();

  useEffect(() => { getProdutos().then(setExistentes); }, []);

  const outros = useMemo(() =>
    existentes.filter(p => !isEdit || p.id !== produto?.id),
    [existentes, isEdit, produto?.id]
  );

  const modeloDup = modelo.trim() && outros.some(p => p.modelo.toLowerCase() === modelo.trim().toLowerCase());
  const refDup = referencia.trim() && outros.some(p => p.referencia.toLowerCase() === referencia.trim().toLowerCase());
  const hasDup = modeloDup || refDup;

  const handleFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (hasDup) return;
    setErro(''); setLoading(true);
    try {
      const fotoUrl = foto ? await uploadImage(foto) : (preview || '');
      const valorNum = parseFloat(valor) || 0;
      const estoqueNovo = parseInt(estoqueUn) || 0;
      if (isEdit) {
        const diff = estoqueNovo - (produto.estoque || 0);
        await updateProduto(produto.id, { modelo, referencia, valor: valorNum, foto: fotoUrl, estoque: estoqueNovo });
        if (diff > 0) {
          await createEntrada({ produtoId: produto.id, modelo, referencia, quantidade: diff, valorUnitario: valorNum });
        }
      } else {
        const id = await createProduto({ modelo, referencia, valor: valorNum, foto: fotoUrl, estoque: estoqueNovo });
        if (estoqueNovo > 0) {
          await createEntrada({ produtoId: id, modelo, referencia, quantidade: estoqueNovo, valorUnitario: valorNum });
        }
      }
      navigate('/produtos');
    } catch (error) {
      setErro(error instanceof Error ? error.message : `Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} produto`);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-lg mx-auto">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Modelo</label>
          <input value={modelo} onChange={(e) => setModelo(e.target.value)} className={modeloDup ? inputError : inputOk} required />
          {modelo.trim() && (
            <div className={`flex items-center gap-1 mt-1 text-[10px] ${modeloDup ? 'text-red-400' : 'text-green-400'}`}>
              {modeloDup ? <><AlertCircle size={10} /> Modelo já cadastrado</> : <><CheckCircle2 size={10} /> Disponível</>}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Referência</label>
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={refDup ? inputError : inputOk} required />
          {referencia.trim() && (
            <div className={`flex items-center gap-1 mt-1 text-[10px] ${refDup ? 'text-red-400' : 'text-green-400'}`}>
              {refDup ? <><AlertCircle size={10} /> Referência já cadastrada</> : <><CheckCircle2 size={10} /> Disponível</>}
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="text-xs text-content-muted mb-1 block">Valor sugerido (R$)</label>
        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className={inputOk} required />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Estoque (pct)</label>
          <input type="number" min="0" value={estoquePct} className={inputOk} required
            onChange={(e) => { setEstoquePct(e.target.value); setEstoqueUn(e.target.value ? String(Number(e.target.value) * 15) : ''); }} />
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Estoque (un)</label>
          <input type="number" min="0" value={estoqueUn} className={inputOk} required
            onChange={(e) => { setEstoqueUn(e.target.value); setEstoquePct(e.target.value ? String(Math.floor(Number(e.target.value) / 15)) : ''); }} />
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Resto</label>
          <input value={estoqueUn ? `${Number(estoqueUn) % 15} un` : ''} className={`${inputOk} opacity-60`} disabled />
        </div>
      </div>

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="h-48 w-full rounded-lg object-cover" />
          <button type="button" onClick={() => { setFoto(null); setPreview(''); }}
            className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-elevated py-8 text-content-muted hover:border-border-medium hover:text-content-secondary transition-colors">
          <Upload size={24} />
          <span className="text-sm">Clique para selecionar foto</span>
          <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
        </label>
      )}

      {erro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => navigate('/produtos')}
          className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
          Cancelar
        </button>
        <button type="submit" disabled={loading || hasDup}
          className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
          {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </button>
      </div>
    </form>
  );
}
