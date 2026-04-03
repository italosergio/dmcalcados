import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createVenda, getVendas } from '~/services/vendas.service';
import { getClientes, createCliente } from '~/services/clientes.service';
import { getProdutos, createProduto } from '~/services/produtos.service';
import { useAuth } from '~/contexts/AuthContext';
import type { Cliente, Produto, VendaProduto, CondicaoPagamento } from '~/models';
import { formatCurrency } from '~/utils/format';
import { Pencil, Trash2, Plus, Minus, ShoppingBag, X, Check } from 'lucide-react';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

export function VendaForm() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const clienteRef = useRef<HTMLDivElement>(null);
  const [produtosSelecionados, setProdutosSelecionados] = useState<VendaProduto[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [produtoBusca, setProdutoBusca] = useState('');
  const [produtoDropdown, setProdutoDropdown] = useState(false);
  const produtoRef = useRef<HTMLDivElement>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [condicao, setCondicao] = useState<CondicaoPagamento>('avista');
  const [comEntrada, setComEntrada] = useState(false);
  const [valorAvista, setValorAvista] = useState('');
  const [valorPrazo, setValorPrazo] = useState('');
  const [parcelas, setParcelas] = useState(2);
  const [datasParcelas, setDatasParcelas] = useState<string[]>([]);
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().slice(0, 10));
  const [novoCliente, setNovoCliente] = useState(false);
  const [ncNome, setNcNome] = useState('');
  const [ncCpfCnpj, setNcCpfCnpj] = useState('');
  const [ncEndereco, setNcEndereco] = useState('');
  const [ncEstado, setNcEstado] = useState('MA');
  const [ncCidade, setNcCidade] = useState('');
  const [ncCidades, setNcCidades] = useState<string[]>([]);
  const [ncContatos, setNcContatos] = useState(['']);
  const [ncSaving, setNcSaving] = useState(false);
  const [novoProduto, setNovoProduto] = useState(false);
  const [npModelo, setNpModelo] = useState('');
  const [npReferencia, setNpReferencia] = useState('');
  const [npValor, setNpValor] = useState('');
  const [npSaving, setNpSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [deleteClicks, setDeleteClicks] = useState<Record<number, number>>({});
  const deleteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    Promise.all([getClientes(), getProdutos(), getVendas()]).then(([clientesData, produtosData, vendasData]) => {
      if (user.role === 'vendedor') {
        const meusClientesIds = new Set(
          vendasData
            .filter(v => !v.deletedAt && (v.vendedorId === user.uid || v.vendedorId === user.id))
            .map(v => v.clienteId)
        );
        setClientes(clientesData.filter(c => meusClientesIds.has(c.id)));
      } else {
        setClientes(clientesData);
      }
      setProdutos(produtosData);
    });
  }, [user]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) setClienteDropdown(false); if (produtoRef.current && !produtoRef.current.contains(e.target as Node)) setProdutoDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) setPrecoUnitario(produto.valor.toString());
    else setPrecoUnitario('');
  }, [produtoId, produtos]);

  const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  const formatContato = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 2) return nums.length ? `(${nums}` : '';
    if (nums.length <= 3) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3)}`;
    return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3,7)}-${nums.slice(7)}`;
  };

  useEffect(() => {
    if (!novoCliente) return;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ncEstado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => setNcCidades(data.map(c => c.nome)))
      .catch(() => setNcCidades([]));
  }, [ncEstado, novoCliente]);

  const clientesSorted = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome));
  const clientesFiltrados = clienteBusca
    ? clientesSorted.filter(c => c.nome.toLowerCase().includes(clienteBusca.toLowerCase()) || (c.contatos?.[0] || c.contato || '').includes(clienteBusca))
    : clientesSorted;

  const selecionarCliente = (c: Cliente) => {
    setClienteId(c.id);
    setClienteBusca(c.nome);
    setClienteDropdown(false);
  };

  const resetNovoCliente = () => {
    setNovoCliente(false); setNcNome(''); setNcCpfCnpj(''); setNcEndereco(''); setNcEstado('MA'); setNcCidade(''); setNcContatos(['']);
  };

  const DDDS_VALIDOS = ['11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74','75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94','95','96','97','98','99'];
  const ncContatoDigitos = (v: string) => v.replace(/\D/g, '').length;
  const ncContatoDddOk = (v: string) => { const d = v.replace(/\D/g, ''); return d.length >= 2 && DDDS_VALIDOS.includes(d.slice(0, 2)); };
  const ncContatoValido = (v: string) => { const d = v.replace(/\D/g, ''); return d.length === 11 && d[2] === '9' && DDDS_VALIDOS.includes(d.slice(0, 2)); };

  const validarCpf = (cpf: string) => {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let resto = (soma * 10) % 11; if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    resto = (soma * 10) % 11; if (resto === 10) resto = 0;
    return resto === parseInt(cpf[10]);
  };

  const validarCnpj = (cnpj: string) => {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    const p1 = [5,4,3,2,9,8,7,6,5,4,3,2], p2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let soma = 0;
    for (let i = 0; i < 12; i++) soma += parseInt(cnpj[i]) * p1[i];
    let resto = soma % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== parseInt(cnpj[12])) return false;
    soma = 0;
    for (let i = 0; i < 13; i++) soma += parseInt(cnpj[i]) * p2[i];
    resto = soma % 11;
    return (resto < 2 ? 0 : 11 - resto) === parseInt(cnpj[13]);
  };

  const ncCpfCnpjOk = ncCpfCnpj.length === 11 ? validarCpf(ncCpfCnpj) : ncCpfCnpj.length === 14 ? validarCnpj(ncCpfCnpj) : false;
  const ncCpfCnpjErro = ncCpfCnpj.length === 11 && !validarCpf(ncCpfCnpj) ? 'CPF inválido' : ncCpfCnpj.length === 14 && !validarCnpj(ncCpfCnpj) ? 'CNPJ inválido' : ncCpfCnpj.length > 0 && ncCpfCnpj.length < 11 ? `Faltam ${11 - ncCpfCnpj.length} dígito(s)` : ncCpfCnpj.length > 11 && ncCpfCnpj.length < 14 ? `Faltam ${14 - ncCpfCnpj.length} dígito(s) para CNPJ` : '';

  const ncCidadeOk = ncCidade.trim().length >= 2 && ncCidades.includes(ncCidade.trim());

  const ncFormOk = ncNome.trim().length >= 3 && ncCpfCnpjOk && ncEndereco.trim().length >= 3 && ncCidadeOk && ncContatos.every(c => ncContatoValido(c));

  const salvarNovoCliente = async () => {
    if (!ncFormOk) return;
    setNcSaving(true);
    try {
      const contatosFiltrados = ncContatos.filter(c => c.trim());
      const id = await createCliente({
        nome: ncNome, endereco: ncEndereco, cidade: ncCidade, estado: ncEstado, cpfCnpj: ncCpfCnpj,
        contato: contatosFiltrados[0] || '', contatos: contatosFiltrados,
      });
      const novo = { id, nome: ncNome, endereco: ncEndereco, cidade: ncCidade, estado: ncEstado, cpfCnpj: ncCpfCnpj, contato: contatosFiltrados[0] || '', contatos: contatosFiltrados, createdAt: new Date() } as Cliente;
      setClientes(prev => [...prev, novo]);
      setClienteId(id);
      setClienteBusca(ncNome);
      resetNovoCliente();
    } finally { setNcSaving(false); }
  };

  const produtosSorted = [...produtos].sort((a, b) => a.modelo.localeCompare(b.modelo));
  const produtosFiltrados = produtoBusca
    ? produtosSorted.filter(p => p.modelo.toLowerCase().includes(produtoBusca.toLowerCase()) || (p.referencia || '').toLowerCase().includes(produtoBusca.toLowerCase()))
    : produtosSorted;

  const selecionarProduto = (p: Produto) => {
    setProdutoId(p.id);
    setProdutoBusca(p.modelo + (p.referencia ? ` (${p.referencia})` : ''));
    setProdutoDropdown(false);
  };

  const npFormOk = npModelo.trim().length > 0 && npReferencia.trim().length > 0 && (parseFloat(npValor) || 0) > 0;

  const salvarNovoProduto = async () => {
    if (!npFormOk) return;
    setNpSaving(true);
    try {
      const valor = parseFloat(npValor) || 0;
      const id = await createProduto({ modelo: npModelo, referencia: npReferencia, valor, foto: '', estoque: 0 });
      const novo = { id, modelo: npModelo, referencia: npReferencia, valor, foto: '', estoque: 0, createdAt: new Date(), updatedAt: new Date() } as Produto;
      setProdutos(prev => [...prev, novo]);
      setProdutoId(id);
      setProdutoBusca(npModelo + (npReferencia ? ` (${npReferencia})` : ''));
      setNovoProduto(false); setNpModelo(''); setNpReferencia(''); setNpValor('');
    } finally { setNpSaving(false); }
  };

  const adicionarProduto = () => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto || !precoUnitario) return;
    const qtd = parseInt(quantidade);
    const preco = parseFloat(precoUnitario);
    setProdutosSelecionados([...produtosSelecionados, {
      produtoId: produto.id, modelo: produto.modelo, referencia: produto.referencia || '',
      quantidade: qtd, valorSugerido: produto.valor, valorUnitario: preco, valorTotal: preco * qtd
    }]);
    setProdutoId(''); setProdutoBusca(''); setQuantidade('1'); setPrecoUnitario('');
  };

  const handleDelete = useCallback((index: number) => {
    const clicks = (deleteClicks[index] || 0) + 1;
    clearTimeout(deleteTimers.current[index]);
    if (clicks >= 3) {
      setProdutosSelecionados(prev => prev.filter((_, i) => i !== index));
      setDeleteClicks(prev => { const n = { ...prev }; delete n[index]; return n; });
    } else {
      setDeleteClicks(prev => ({ ...prev, [index]: clicks }));
      deleteTimers.current[index] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[index]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const updateProdutoSelecionado = (index: number, field: 'quantidade' | 'valorUnitario', value: number) => {
    setProdutosSelecionados(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, [field]: value };
      updated.valorTotal = updated.quantidade * updated.valorUnitario;
      return updated;
    }));
  };

  const deleteLabel = (index: number) => {
    const clicks = deleteClicks[index] || 0;
    if (clicks === 0) return 'Remover';
    if (clicks === 1) return 'Tem certeza?';
    return 'Confirmar!';
  };

  const total = produtosSelecionados.reduce((sum, p) => sum + p.valorTotal, 0);

  useEffect(() => {
    if (condicao === 'avista') { setValorAvista(total.toString()); setValorPrazo('0'); setDatasParcelas([]); setComEntrada(false); }
    else if (condicao === '1x') {
      setParcelas(1);
      if (!comEntrada) { setValorAvista(''); setValorPrazo(total.toString()); }
      setDatasParcelas(prev => prev.length >= 1 ? prev.slice(0, 1) : ['']);
    }
    else if (condicao === '2x' || condicao === '3x') {
      const n = condicao === '2x' ? 2 : 3;
      setParcelas(n);
      if (!comEntrada) { setValorAvista(''); setValorPrazo(total.toString()); }
      setDatasParcelas(prev => {
        const arr = [...prev];
        while (arr.length < n) arr.push('');
        return arr.slice(0, n);
      });
    }
  }, [condicao, total, comEntrada]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !clienteId || produtosSelecionados.length === 0) return;
    const vAvista = parseFloat(valorAvista) || 0;
    const vPrazo = parseFloat(valorPrazo) || 0;
    if (comEntrada && Math.abs((vAvista + vPrazo) - total) > 0.01) {
      setErro(`Entrada (${formatCurrency(vAvista)}) + prazo (${formatCurrency(vPrazo)}) deve ser igual ao total (${formatCurrency(total)})`);
      return;
    }
    const condicaoFinal: CondicaoPagamento = comEntrada
      ? (condicao === '1x' ? '1x_entrada' : condicao === '2x' ? '2x_entrada' : '3x_entrada')
      : condicao;
    setErro(''); setLoading(true);
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      await createVenda({
        clienteId, clienteNome: cliente?.nome || '', vendedorId: user.id, vendedorNome: user.nome,
        produtos: produtosSelecionados, valorTotal: total, condicaoPagamento: condicaoFinal,
        valorAvista: vAvista, valorPrazo: vPrazo, parcelas: condicao === 'avista' ? 0 : parcelas,
        datasParcelas: condicao !== 'avista' ? datasParcelas : [],
        data: new Date(dataVenda + 'T12:00:00')
      });
      navigate('/vendas');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('contains undefined') || msg.includes('contains null')) {
        const match = msg.match(/produtos\.(\d+)/);
        const p = match ? produtosSelecionados[parseInt(match[1])] : undefined;
        const info = p ? [p.modelo, p.referencia && `REF: ${p.referencia}`, `${p.quantidade}x`, formatCurrency(p.valorUnitario)].filter(Boolean).join(' · ') : 'produto selecionado';
        setErro(`Produto precisa ser atualizado pelo administrador: ${info}`);
      } else { setErro(msg || 'Erro ao registrar venda'); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl mx-auto">
      {/* Data + Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Data da venda</label>
          <input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className={input} required />
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Cliente</label>
          {novoCliente ? (
            <div className="rounded-lg border border-blue-500/30 bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400">Novo cliente</span>
                <button type="button" onClick={resetNovoCliente} className="text-content-muted hover:text-content"><X size={16} /></button>
              </div>
              <div>
                <input value={ncNome} onChange={(e) => setNcNome(e.target.value)} className={`${input} ${ncNome.trim().length >= 3 ? 'border-green-500/50' : ''}`} placeholder="Nome / Razão Social" />
                {ncNome.trim().length >= 3 && <p className="text-xs text-green-400 mt-0.5">✓</p>}
              </div>
              <div>
                <input value={ncCpfCnpj} onChange={(e) => setNcCpfCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))} className={`${input} ${ncCpfCnpjOk ? 'border-green-500/50' : ncCpfCnpjErro ? 'border-red-500/50' : ''}`} placeholder="CPF / CNPJ" inputMode="numeric" />
                {ncCpfCnpjOk && <p className="text-xs text-green-400 mt-0.5">{ncCpfCnpj.length === 11 ? 'CPF válido' : 'CNPJ válido'} ✓</p>}
                {ncCpfCnpjErro && <p className="text-xs text-red-400 mt-0.5">{ncCpfCnpjErro}</p>}
              </div>
              <div>
                <input value={ncEndereco} onChange={(e) => setNcEndereco(e.target.value)} className={`${input} ${ncEndereco.trim().length >= 3 ? 'border-green-500/50' : ''}`} placeholder="Endereço" />
                {ncEndereco.trim().length >= 3 && <p className="text-xs text-green-400 mt-0.5">✓</p>}
              </div>
              <div className="grid grid-cols-[5rem_1fr] gap-2">
                <select value={ncEstado} onChange={(e) => { setNcEstado(e.target.value); setNcCidade(''); }} className={input}>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                <div>
                  <input value={ncCidade} onChange={(e) => setNcCidade(e.target.value)} className={`${input} ${ncCidadeOk ? 'border-green-500/50' : ncCidade.trim() && !ncCidadeOk ? 'border-red-500/50' : ''}`} list="nc-cidades" placeholder="Cidade" />
                  <datalist id="nc-cidades">{ncCidades.map(c => <option key={c} value={c} />)}</datalist>
                  {ncCidadeOk && <p className="text-xs text-green-400 mt-0.5">✓</p>}
                  {ncCidade.trim() && !ncCidadeOk && <p className="text-xs text-red-400 mt-0.5">Cidade não encontrada em {ncEstado}</p>}
                </div>
              </div>
              {ncContatos.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1">
                    <input value={c} onKeyDown={(e) => { const digits = c.replace(/\D/g, ''); if (e.key === 'Backspace') { e.preventDefault(); const arr = [...ncContatos]; arr[i] = formatContato(digits.slice(0, -1)); setNcContatos(arr); } else if (/^\d$/.test(e.key)) { e.preventDefault(); if (digits.length < 11) { const arr = [...ncContatos]; arr[i] = formatContato(digits + e.key); setNcContatos(arr); } } else if (e.key !== 'Tab') { e.preventDefault(); } }} onClick={(e) => { const el = e.currentTarget; requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length)); }} onFocus={(e) => { const el = e.currentTarget; requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length)); }} onChange={() => {}} className={`${input} ${ncContatoValido(c) ? 'border-green-500/50' : ncContatoDigitos(c) > 0 ? 'border-red-500/50' : ''}`} placeholder="(00) 9 0000-0000" inputMode="tel" />
                    {ncContatoValido(c) && <p className="text-xs text-green-400 mt-0.5">✓</p>}
                    {ncContatoDigitos(c) >= 2 && !ncContatoDddOk(c) && <p className="text-xs text-red-400 mt-0.5">DDD inválido</p>}
                    {ncContatoDigitos(c) === 11 && ncContatoDddOk(c) && !ncContatoValido(c) && <p className="text-xs text-red-400 mt-0.5">Celular deve começar com 9</p>}
                    {ncContatoDigitos(c) > 0 && ncContatoDigitos(c) < 11 && ncContatoDddOk(c) && <p className="text-xs text-red-400 mt-0.5">Faltam {11 - ncContatoDigitos(c)} dígito(s)</p>}
                  </div>
                  {ncContatos.length > 1 && (
                    <button type="button" onClick={() => setNcContatos(ncContatos.filter((_, j) => j !== i))} className="rounded-lg px-2 text-red-500/60 hover:text-red-500"><X size={16} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setNcContatos([...ncContatos, ''])} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                <Plus size={14} /> Adicionar contato
              </button>
              <button type="button" onClick={salvarNovoCliente} disabled={ncSaving || !ncFormOk}
                className="w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-30 flex items-center justify-center gap-1.5">
                <Check size={14} /> {ncSaving ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </div>
          ) : (
            <div ref={clienteRef} className="relative">
              <input
                value={clienteBusca}
                onChange={(e) => { setClienteBusca(e.target.value); setClienteDropdown(true); if (!e.target.value) setClienteId(''); }}
                onFocus={() => setClienteDropdown(true)}
                className={`${input} ${clienteId ? 'border-green-500/50' : ''}`}
                placeholder="Buscar cliente por nome..."
              />
              {clienteId && <p className="text-xs text-green-400 mt-0.5">✓</p>}
              {clienteDropdown && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border-subtle bg-elevated shadow-lg">
                  {clientesFiltrados.length === 0 ? (
                    <>
                      <p className="px-3 py-2 text-xs text-content-muted">Nenhum cliente encontrado</p>
                      <button type="button" onClick={() => { setNovoCliente(true); setNcNome(clienteBusca); setClienteDropdown(false); }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-blue-400 hover:bg-surface-hover border-t border-border-subtle">
                        + Cadastrar "{clienteBusca}"
                      </button>
                    </>
                  ) : clientesFiltrados.map(c => (
                    <button key={c.id} type="button" onClick={() => selecionarCliente(c)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors ${clienteId === c.id ? 'bg-blue-500/10 text-blue-400' : 'text-content'}`}>
                      <span className="block truncate">{c.nome}</span>
                      {(c.contatos?.[0] || c.contato) && <span className="text-xs text-content-muted">{c.contatos?.[0] || c.contato}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Adicionar produto */}
      <div className="space-y-2">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Produto</label>
          {novoProduto ? (
            <div className="rounded-lg border border-blue-500/30 bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400">Novo produto</span>
                <button type="button" onClick={() => setNovoProduto(false)} className="text-content-muted hover:text-content"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input value={npModelo} onChange={(e) => setNpModelo(e.target.value)} className={`${input} ${npModelo.trim() ? 'border-green-500/50' : ''}`} placeholder="Modelo" />
                  {npModelo.trim() && <p className="text-xs text-green-400 mt-0.5">✓</p>}
                </div>
                <div>
                  <input value={npReferencia} onChange={(e) => setNpReferencia(e.target.value)} className={`${input} ${npReferencia.trim() ? 'border-green-500/50' : ''}`} placeholder="Referência" />
                  {npReferencia.trim() && <p className="text-xs text-green-400 mt-0.5">✓</p>}
                </div>
              </div>
              <div>
                <input type="number" step="0.01" value={npValor} onChange={(e) => setNpValor(e.target.value)} className={`${input} ${(parseFloat(npValor) || 0) > 0 ? 'border-green-500/50' : ''}`} placeholder="Valor sugerido (R$)" />
                {(parseFloat(npValor) || 0) > 0 && <p className="text-xs text-green-400 mt-0.5">✓</p>}
              </div>
              <button type="button" onClick={salvarNovoProduto} disabled={npSaving || !npFormOk}
                className="w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-30 flex items-center justify-center gap-1.5">
                <Check size={14} /> {npSaving ? 'Salvando...' : 'Salvar produto'}
              </button>
            </div>
          ) : (
            <div ref={produtoRef} className="relative">
              <input
                value={produtoBusca}
                onChange={(e) => { setProdutoBusca(e.target.value); setProdutoDropdown(true); if (!e.target.value) setProdutoId(''); }}
                onFocus={() => setProdutoDropdown(true)}
                className={`${input} ${produtoId ? 'border-green-500/50' : ''}`}
                placeholder="Buscar produto por modelo ou referência..."
              />
              {produtoId && <p className="text-xs text-green-400 mt-0.5">✓</p>}
              {produtoDropdown && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border-subtle bg-elevated shadow-lg">
                  {produtosFiltrados.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-content-muted">Nenhum produto encontrado</p>
                  ) : produtosFiltrados.map(p => (
                    <button key={p.id} type="button" onClick={() => selecionarProduto(p)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors ${produtoId === p.id ? 'bg-blue-500/10 text-blue-400' : 'text-content'}`}>
                      <span className="block truncate">{p.modelo} {p.referencia ? `(${p.referencia})` : ''}</span>
                      <span className="text-xs text-content-muted">{formatCurrency(p.valor)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-[5rem_auto_1fr] gap-2">
          <div>
            <label className="text-xs text-content-muted mb-1 block">un (R$)</label>
            <input type="number" step="0.01" value={precoUnitario} onChange={(e) => setPrecoUnitario(e.target.value)} placeholder="0.00" className={input} />
          </div>
          <div>
            <label className="text-xs text-content-muted mb-1 block">Qtd</label>
            <div className="flex items-center gap-0">
              <button type="button" onClick={() => setQuantidade(String(Math.max(1, parseInt(quantidade) - 1)))}
                className="rounded-l-lg border border-border-subtle bg-elevated px-3 py-2.5 text-content-secondary hover:bg-border-medium transition-colors">
                <Minus size={16} />
              </button>
              <span className="border-y border-border-subtle bg-elevated px-4 py-2.5 text-sm font-semibold text-center min-w-[3rem]">{quantidade}</span>
              <button type="button" onClick={() => setQuantidade(String(parseInt(quantidade) + 1))}
                className="rounded-r-lg border border-border-subtle bg-elevated px-3 py-2.5 text-content-secondary hover:bg-border-medium transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={adicionarProduto} disabled={!produtoId || !precoUnitario}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white text-sm font-medium transition hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Produtos selecionados */}
      {produtosSelecionados.length > 0 ? (
        <div className="space-y-2">
          {produtosSelecionados.map((p, i) => (
            <div key={i} className="rounded-lg border border-border-subtle bg-surface p-3">
              {editingIndex === i ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{p.modelo}</span>
                      {p.referencia && <span className="text-xs text-content-muted">{p.referencia}</span>}
                    </div>
                    <button type="button" onClick={() => setEditingIndex(null)} className="text-green-400 hover:text-green-300 transition-colors" title="Concluir">
                      <Check size={18} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0">
                      <button type="button" onClick={() => updateProdutoSelecionado(i, 'quantidade', Math.max(1, p.quantidade - 1))}
                        className="rounded-l-lg border border-border-subtle bg-elevated px-2 py-1.5 text-content-secondary hover:bg-border-medium transition-colors"><Minus size={14} /></button>
                      <span className="border-y border-border-subtle bg-elevated px-3 py-1.5 text-xs font-semibold min-w-[2.5rem] text-center">{p.quantidade}</span>
                      <button type="button" onClick={() => updateProdutoSelecionado(i, 'quantidade', p.quantidade + 1)}
                        className="rounded-r-lg border border-border-subtle bg-elevated px-2 py-1.5 text-content-secondary hover:bg-border-medium transition-colors"><Plus size={14} /></button>
                    </div>
                    <div className="flex-1">
                      <input type="number" step="0.01" value={p.valorUnitario} className={`${input} text-xs py-1.5`}
                        onChange={(e) => updateProdutoSelecionado(i, 'valorUnitario', parseFloat(e.target.value) || 0)} />
                    </div>
                    <span className="text-sm font-bold text-green-400 whitespace-nowrap">{formatCurrency(p.valorTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate">{p.modelo}</span>
                    {p.referencia && <span className="text-xs text-content-muted">{p.referencia}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-green-400 whitespace-nowrap">
                      {p.quantidade}x {formatCurrency(p.valorUnitario)} = {formatCurrency(p.valorTotal)}
                    </span>
                    <button type="button" onClick={() => setEditingIndex(i)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Editar">
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>
              )}
              <button type="button" onClick={() => handleDelete(i)}
                className={`mt-2 w-full flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  (deleteClicks[i] || 0) === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : (deleteClicks[i] || 0) === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
                }`}>
                <Trash2 size={14} /> {deleteLabel(i)}
              </button>
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-between items-center rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold text-green-400">{formatCurrency(total)}</span>
          </div>

          {/* Pagamento */}
          <div className="grid grid-cols-4 gap-1.5">
            {([
              { value: 'avista', label: 'À Vista' },
              { value: '1x', label: '1x' },
              { value: '2x', label: '2x' },
              { value: '3x', label: '3x' },
            ] as { value: CondicaoPagamento; label: string }[]).map(opt => (
              <button key={opt.value} type="button" onClick={() => { setCondicao(opt.value); if (opt.value === 'avista') setComEntrada(false); }}
                className={`rounded-lg py-2 text-xs font-medium transition ${
                  condicao === opt.value ? 'bg-blue-600 text-white' : 'bg-elevated text-content-secondary hover:bg-border-medium'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          {condicao === 'avista' && (
            <p className="text-xs text-content-muted text-center">Pagamento total à vista: <span className="text-green-400 font-semibold">{formatCurrency(total)}</span></p>
          )}
          {condicao === '1x' && (
            <div className="space-y-2">
              <p className="text-xs text-content-muted text-center">
                Pagamento total em <span className="text-yellow-400 font-semibold">{formatCurrency(total)}</span>
              </p>
              <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer justify-center">
                <input type="checkbox" checked={comEntrada} onChange={(e) => {
                  setComEntrada(e.target.checked);
                  if (!e.target.checked) { setValorAvista(''); setValorPrazo(total.toString()); }
                }} className="rounded" />
                Com entrada
              </label>
              {comEntrada && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-content-muted mb-1 block">Entrada</label>
                    <input type="number" step="0.01" min="0" max={total} value={valorAvista} className={input} required placeholder="0.00"
                      onChange={(e) => { const v = Math.min(parseFloat(e.target.value) || 0, total); setValorAvista(e.target.value ? String(v) : ''); setValorPrazo((total - v).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="text-xs text-content-muted mb-1 block">Restante</label>
                    <input type="number" step="0.01" value={valorPrazo} className={`${input} opacity-60`} disabled />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-content-muted mb-1 block">Data do pagamento</label>
                {(() => {
                  const maxD = new Date(dataVenda + 'T00:00:00'); maxD.setDate(maxD.getDate() + 40);
                  return <input type="date" value={datasParcelas[0] || ''} min={dataVenda} max={maxD.toISOString().slice(0, 10)} className={input} required
                    onChange={(e) => setDatasParcelas([e.target.value])} />;
                })()}
              </div>
            </div>
          )}
          {(condicao === '2x' || condicao === '3x') && (
            <div className="space-y-2">
              {!comEntrada && (
                <p className="text-xs text-content-muted text-center">
                  {condicao === '2x' ? 2 : 3}x de <span className="text-yellow-400 font-semibold">{formatCurrency(total / (condicao === '2x' ? 2 : 3))}</span>
                </p>
              )}
              <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer justify-center">
                <input type="checkbox" checked={comEntrada} onChange={(e) => {
                  setComEntrada(e.target.checked);
                  if (!e.target.checked) { setValorAvista(''); setValorPrazo(total.toString()); }
                }} className="rounded" />
                Com entrada
              </label>
              {comEntrada && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-content-muted mb-1 block">Entrada</label>
                    <input type="number" step="0.01" min="0" max={total} value={valorAvista} className={input} required placeholder="0.00"
                      onChange={(e) => { const v = Math.min(parseFloat(e.target.value) || 0, total); setValorAvista(e.target.value ? String(v) : ''); setValorPrazo((total - v).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="text-xs text-content-muted mb-1 block">Restante ({parcelas}x de {formatCurrency((parseFloat(valorPrazo) || 0) / parcelas)})</label>
                    <input type="number" step="0.01" value={valorPrazo} className={`${input} opacity-60`} disabled />
                  </div>
                </div>
              )}
              <div className={`grid gap-2 ${condicao === '3x' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {datasParcelas.map((d, i) => {
                  const minDate = i > 0 ? datasParcelas[i - 1] : undefined;
                  let maxDate: string | undefined;
                  if (i > 0 && datasParcelas[0]) {
                    const base = new Date(datasParcelas[0] + 'T00:00:00');
                    base.setDate(base.getDate() + 40 * i);
                    maxDate = base.toISOString().slice(0, 10);
                  }
                  return (
                    <div key={i}>
                      <label className="text-xs text-content-muted mb-1 block">{i + 1}ª parcela</label>
                      <input type="date" value={d} min={minDate} max={maxDate} className={input} required
                        onChange={(e) => {
                          const arr = [...datasParcelas];
                          arr[i] = e.target.value;
                          for (let j = i + 1; j < arr.length; j++) { if (arr[j] && arr[j] < e.target.value) arr[j] = ''; }
                          setDatasParcelas(arr);
                        }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border-subtle py-10 text-center">
          <ShoppingBag size={32} className="mx-auto mb-2 text-content-muted opacity-30" />
          <p className="text-sm text-content-muted">Nenhum produto adicionado</p>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>
      )}

      {/* Ações */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => navigate('/vendas')}
          className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
          Cancelar
        </button>
        <button type="submit" disabled={loading || produtosSelecionados.length === 0 || !clienteId}
          className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
          {loading ? 'Salvando...' : 'Registrar Venda'}
        </button>
      </div>
    </form>
  );
}
