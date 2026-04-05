import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, X, Package, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { createProduto } from '~/services/produtos.service';
import { createEntrada } from '~/services/entradas.service';
import { updateProduto } from '~/services/produtos.service';
import { uploadImage } from '~/services/cloudinary.service';
import { formatCurrency } from '~/utils/format';
import { useProdutos } from '~/hooks/useRealtime';
import type { Produto } from '~/models';

const inputBase = "w-full rounded-lg border bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:ring-1 transition-colors";
const inputOk = `${inputBase} border-border-subtle focus:border-border-medium focus:ring-blue-500/30`;

interface ItemEntrada {
  produtoId: string;
  modelo: string;
  referencia: string;
  valorUnitario: number;
  quantidade: number;
}

export default function EstoqueEntradaPage() {
  const { produtos, loading } = useProdutos();
  const [itens, setItens] = useState<ItemEntrada[]>([]);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [dropdown, setDropdown] = useState(false);
  const [modo, setModo] = useState<'pacote' | 'unidade'>('pacote');

  // Novo produto inline
  const [novoProduto, setNovoProduto] = useState(false);
  const [npModelo, setNpModelo] = useState('');
  const [npReferencia, setNpReferencia] = useState('');
  const [npValor, setNpValor] = useState('');
  const [npSaving, setNpSaving] = useState(false);

  const navigate = useNavigate();

  const filteredProdutos = produtos.filter(p =>
    !itens.some(i => i.produtoId === p.id) &&
    ((p.modelo || '').toLowerCase().includes(busca.toLowerCase()) ||
     (p.referencia || '').toLowerCase().includes(busca.toLowerCase()))
  );

  const addProduto = (p: Produto) => {
    setItens(prev => [...prev, {
      produtoId: p.id, modelo: p.modelo, referencia: p.referencia,
      valorUnitario: p.valor, quantidade: 0,
    }]);
    setBusca('');
    setDropdown(false);
  };

  const removeItem = (produtoId: string) => {
    setItens(prev => prev.filter(i => i.produtoId !== produtoId));
  };

  const updateQtd = (produtoId: string, qtd: number) => {
    setItens(prev => prev.map(i => i.produtoId === produtoId ? { ...i, quantidade: Math.max(0, qtd) } : i));
  };

  const modeloDup = npModelo.trim() && produtos.some(p => p.modelo.toLowerCase() === npModelo.trim().toLowerCase());
  const refDup = npReferencia.trim() && produtos.some(p => p.referencia.toLowerCase() === npReferencia.trim().toLowerCase());
  const npFormOk = npModelo.trim() && npReferencia.trim() && npValor && !modeloDup && !refDup;

  const salvarNovoProduto = async () => {
    if (!npFormOk) return;
    setNpSaving(true);
    try {
      const valor = parseFloat(npValor) || 0;
      const id = await createProduto({ modelo: npModelo.trim(), referencia: npReferencia.trim(), valor, foto: '', estoque: 0 });
      const novo = { id, modelo: npModelo.trim(), referencia: npReferencia.trim(), valor, foto: '', estoque: 0, createdAt: new Date(), updatedAt: new Date() } as Produto;
      addProduto(novo);
      setNovoProduto(false); setNpModelo(''); setNpReferencia(''); setNpValor('');
    } catch { } finally { setNpSaving(false); }
  };

  const totalItens = itens.filter(i => i.quantidade > 0);
  const totalUnidades = totalItens.reduce((s, i) => s + (modo === 'pacote' ? i.quantidade * 15 : i.quantidade), 0);

  const handleSubmit = async () => {
    if (totalItens.length === 0) return;
    setSaving(true);
    try {
      for (const item of totalItens) {
        const qtdReal = modo === 'pacote' ? item.quantidade * 15 : item.quantidade;
        await createEntrada({
          produtoId: item.produtoId, modelo: item.modelo, referencia: item.referencia,
          quantidade: qtdReal, valorUnitario: item.valorUnitario,
        });
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto) {
          await updateProduto(item.produtoId, { estoque: produto.estoque + qtdReal });
        }
      }
      navigate('/produtos');
    } catch { } finally { setSaving(false); }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Registrar Entrada</h2>
        <div className="flex rounded-lg border border-border-subtle overflow-hidden text-xs">
          <button onClick={() => setModo('pacote')} className={`px-3 py-1.5 transition-colors ${modo === 'pacote' ? 'bg-blue-600 text-white' : 'text-content-muted hover:text-content'}`}>Pacotes</button>
          <button onClick={() => setModo('unidade')} className={`px-3 py-1.5 transition-colors ${modo === 'unidade' ? 'bg-blue-600 text-white' : 'text-content-muted hover:text-content'}`}>Unidades</button>
        </div>
      </div>

      {/* Buscar / adicionar produto */}
      {novoProduto ? (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400">Novo produto</span>
            <button type="button" onClick={() => setNovoProduto(false)} className="text-content-muted hover:text-content"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input placeholder="Modelo" value={npModelo} onChange={e => setNpModelo(e.target.value)} className={inputOk} />
              {npModelo.trim() && (
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${modeloDup ? 'text-red-400' : 'text-green-400'}`}>
                  {modeloDup ? <><AlertCircle size={10} /> Já existe</> : <><CheckCircle2 size={10} /> OK</>}
                </div>
              )}
            </div>
            <div>
              <input placeholder="Referência" value={npReferencia} onChange={e => setNpReferencia(e.target.value)} className={inputOk} />
              {npReferencia.trim() && (
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${refDup ? 'text-red-400' : 'text-green-400'}`}>
                  {refDup ? <><AlertCircle size={10} /> Já existe</> : <><CheckCircle2 size={10} /> OK</>}
                </div>
              )}
            </div>
          </div>
          <input type="number" step="0.01" placeholder="Valor sugerido (R$)" value={npValor} onChange={e => setNpValor(e.target.value)} className={inputOk} />
          <button type="button" onClick={salvarNovoProduto} disabled={npSaving || !npFormOk}
            className="w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
            {npSaving ? 'Salvando...' : 'Cadastrar e Adicionar'}
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
          <input placeholder="Buscar produto para adicionar..." value={busca}
            onChange={e => { setBusca(e.target.value); setDropdown(true); }}
            onFocus={() => setDropdown(true)}
            className="w-full rounded-lg border border-border-subtle bg-elevated pl-8 pr-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium transition-colors" />
          {dropdown && busca.trim() && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-border-subtle bg-surface shadow-xl max-h-48 overflow-y-auto">
              {filteredProdutos.slice(0, 8).map(p => (
                <button key={p.id} type="button" onClick={() => addProduto(p)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-elevated transition-colors">
                  <div className="min-w-0">
                    <span className="font-medium">{p.modelo}</span>
                    {p.referencia && <span className="text-content-muted ml-2 text-xs">{p.referencia}</span>}
                  </div>
                  <span className="text-xs text-content-muted">{p.estoque} un</span>
                </button>
              ))}
              <button type="button" onClick={() => { setNovoProduto(true); setNpModelo(busca); setDropdown(false); setBusca(''); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors border-t border-border-subtle">
                <Plus size={14} /> Cadastrar "{busca}"
              </button>
            </div>
          )}
        </div>
      )}

      {/* Itens adicionados */}
      {itens.length > 0 && (
        <div className="space-y-2">
          {itens.map(item => (
            <div key={item.produtoId} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface px-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.modelo}</p>
                <p className="text-[10px] text-content-muted">{item.referencia} · {formatCurrency(item.valorUnitario)}/un</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQtd(item.produtoId, item.quantidade - 1)} className="w-7 h-7 rounded-lg bg-elevated text-sm font-bold hover:bg-border-medium transition-colors">−</button>
                <div className="text-center w-8">
                  <span className="text-sm font-semibold">{item.quantidade}</span>
                  <p className="text-[9px] text-content-muted">{modo === 'pacote' ? 'pct' : 'un'}</p>
                </div>
                <button onClick={() => updateQtd(item.produtoId, item.quantidade + 1)} className="w-7 h-7 rounded-lg bg-elevated text-sm font-bold hover:bg-border-medium transition-colors">+</button>
                <button onClick={() => removeItem(item.produtoId)} className="text-content-muted hover:text-red-400 transition-colors ml-1"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumo + Salvar */}
      {totalItens.length > 0 && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-content-muted">{totalItens.length} produto(s)</span>
            <span className="font-semibold text-green-400">{totalUnidades} un ({Math.floor(totalUnidades / 15)} pct{totalUnidades % 15 > 0 ? ` + ${totalUnidades % 15}` : ''})</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => navigate('/produtos')}
          className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving || totalItens.length === 0}
          className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
          {saving ? 'Registrando...' : 'Registrar Entrada'}
        </button>
      </div>
    </div>
  );
}
