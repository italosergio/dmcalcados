import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createCliente, getClientes } from '~/services/clientes.service';
import { useCachedState, clearFormCache } from '~/hooks/useFormCache';
import { useAuth } from '~/contexts/AuthContext';
import { Plus, X } from 'lucide-react';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function ClienteForm() {
  const FK = 'cliente';
  const { user } = useAuth();
  const [nome, setNome] = useCachedState(FK, 'nome', '');
  const [endereco, setEndereco] = useCachedState(FK, 'endereco', '');
  const [cidade, setCidade] = useCachedState(FK, 'cidade', '');
  const [cidades, setCidades] = useState<string[]>([]);
  const [estado, setEstado] = useCachedState(FK, 'estado', 'MA');
  const [cpfCnpj, setCpfCnpj] = useCachedState(FK, 'cpfCnpj', '');
  const [cpfCnpjErro, setCpfCnpjErro] = useState('');
  const [contatos, setContatos] = useCachedState<string[]>(FK, 'contatos', ['']);
  const [nomesExistentes, setNomesExistentes] = useState<string[]>([]);
  const [cpfsExistentes, setCpfsExistentes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getClientes().then(lista => {
      setNomesExistentes(lista.map(c => c.nome.trim().toLowerCase()));
      setCpfsExistentes(lista.map(c => c.cpfCnpj?.trim()).filter(Boolean));
    });
  }, []);

  useEffect(() => {
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => {
        setCidades(data.map(c => c.nome));
        setCidade('');
      })
      .catch(() => setCidades([]));
  }, [estado]);

  const formatContato = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 2) return nums.length ? `(${nums}` : '';
    if (nums.length <= 3) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3)}`;
    return `(${nums.slice(0,2)}) ${nums.slice(2,3)} ${nums.slice(3,7)}-${nums.slice(7)}`;
  };

  const DDDS_VALIDOS = ['11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74','75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94','95','96','97','98','99'];
  const contatoDigitos = (v: string) => v.replace(/\D/g, '').length;
  const contatoDddOk = (v: string) => { const d = v.replace(/\D/g, ''); return d.length >= 2 && DDDS_VALIDOS.includes(d.slice(0, 2)); };
  const contatoValido = (v: string) => { const d = v.replace(/\D/g, ''); return d.length === 11 && d[2] === '9' && DDDS_VALIDOS.includes(d.slice(0, 2)); };

  const handleContatoKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const digits = contatos[index].replace(/\D/g, '');
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = [...contatos];
      arr[index] = formatContato(digits.slice(0, -1));
      setContatos(arr);
    } else if (e.key === 'Tab') {
      return;
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      if (digits.length < 11) {
        const arr = [...contatos];
        arr[index] = formatContato(digits + e.key);
        setContatos(arr);
      }
    } else {
      e.preventDefault();
    }
  };

  const handleContatoClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  };

  const addContato = () => setContatos([...contatos, '']);
  const removeContato = (index: number) => {
    if (contatos.length <= 1) return;
    setContatos(contatos.filter((_, i) => i !== index));
  };

  const validarCpf = (cpf: string) => {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === parseInt(cpf[10]);
  };

  const validarCnpj = (cnpj: string) => {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    const pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    const pesos2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let soma = 0;
    for (let i = 0; i < 12; i++) soma += parseInt(cnpj[i]) * pesos1[i];
    let resto = soma % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== parseInt(cnpj[12])) return false;
    soma = 0;
    for (let i = 0; i < 13; i++) soma += parseInt(cnpj[i]) * pesos2[i];
    resto = soma % 11;
    return (resto < 2 ? 0 : 11 - resto) === parseInt(cnpj[13]);
  };

  const handleCpfCnpjChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 14);
    setCpfCnpj(clean);
    if (clean.length === 11 || clean.length === 14) {
      const ok = clean.length === 11 ? validarCpf(clean) : validarCnpj(clean);
      setCpfCnpjErro(ok ? '' : clean.length === 11 ? 'CPF inválido' : 'CNPJ inválido');
    } else if (clean.length > 0) {
      setCpfCnpjErro(clean.length < 11 ? `Faltam ${11 - clean.length} dígito(s)` : `Faltam ${14 - clean.length} dígito(s) para CNPJ`);
    } else {
      setCpfCnpjErro('');
    }
  };

  const cpfCnpjOk = cpfCnpj.length === 11 ? validarCpf(cpfCnpj) : cpfCnpj.length === 14 ? validarCnpj(cpfCnpj) : false;
  const cpfCnpjDuplicado = cpfCnpjOk && cpfsExistentes.includes(cpfCnpj.trim());

  const nomeDuplicado = nome.trim().length >= 3 && nomesExistentes.includes(nome.trim().toLowerCase());
  const nomeOk = nome.trim().length >= 3 && !nomeDuplicado;
  const enderecoOk = endereco.trim().length >= 3;
  const cidadeOk = cidade.trim().length >= 2 && cidades.includes(cidade.trim());
  const contatosOk = contatos.every(c => contatoValido(c));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cpfCnpj.trim() || !endereco.trim() || !cidade.trim() || !contatos[0]?.trim()) {
      setErro('Preencha todos os campos obrigatórios');
      return;
    }
    if (nomeDuplicado) { setErro('Já existe um cliente com esse nome'); return; }
    if (!cpfCnpjOk) { setErro('CPF ou CNPJ inválido'); return; }
    if (cpfCnpjDuplicado) { setErro('Já existe um cliente com esse CPF/CNPJ'); return; }
    if (!contatosOk) { setErro('Todos os contatos devem ter 11 dígitos'); return; }
    setErro(''); setLoading(true);
    try {
      const contatosFiltrados = contatos.filter(c => c.trim());
      await createCliente({
        nome, endereco, cidade, estado, cpfCnpj,
        contato: contatosFiltrados[0] || '',
        contatos: contatosFiltrados,
        donoId: user?.uid || user?.id,
        donoNome: user?.nome,
      });
      clearFormCache(FK);
      navigate('/clientes');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao cadastrar cliente');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-lg mx-auto">
      <div>
        <label className="text-xs text-content-muted mb-1 block">Nome / Razão Social</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)}
          className={`${input} ${nomeOk ? 'border-green-500/50 focus:ring-green-500/30' : nomeDuplicado ? 'border-red-500/50 focus:ring-red-500/30' : ''}`} required />
        {nomeOk && <p className="text-xs text-green-400 mt-1">✓</p>}
        {nomeDuplicado && <p className="text-xs text-red-400 mt-1">Já existe um cliente com esse nome</p>}
      </div>
      <div>
        <label className="text-xs text-content-muted mb-1 block">CPF / CNPJ</label>
        <input
          value={cpfCnpj}
          onChange={(e) => handleCpfCnpjChange(e.target.value)}
          className={`${input} ${cpfCnpjErro || cpfCnpjDuplicado ? 'border-red-500/50 focus:ring-red-500/30' : cpfCnpjOk ? 'border-green-500/50 focus:ring-green-500/30' : ''}`}
          placeholder="11 dígitos (CPF) ou 14 dígitos (CNPJ)"
          required
          inputMode="numeric"
        />
        {cpfCnpjErro && <p className="text-xs text-red-400 mt-1">{cpfCnpjErro}</p>}
        {cpfCnpjDuplicado && <p className="text-xs text-red-400 mt-1">Já existe um cliente com esse CPF/CNPJ</p>}
        {cpfCnpjOk && !cpfCnpjDuplicado && <p className="text-xs text-green-400 mt-1">{cpfCnpj.length === 11 ? 'CPF válido ✓' : 'CNPJ válido ✓'}</p>}
      </div>
      <div>
        <label className="text-xs text-content-muted mb-1 block">Endereço</label>
        <input value={endereco} onChange={(e) => setEndereco(e.target.value)}
          className={`${input} ${enderecoOk ? 'border-green-500/50 focus:ring-green-500/30' : ''}`}
          placeholder="Rua, número, bairro ou povoado" required />
        {enderecoOk && <p className="text-xs text-green-400 mt-1">✓</p>}
      </div>
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={input}>
            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Cidade</label>
          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className={`${input} ${cidadeOk ? 'border-green-500/50 focus:ring-green-500/30' : cidade.trim() && !cidadeOk ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            list="cidades-list"
            required
            placeholder={cidades.length ? 'Digite ou selecione' : 'Carregando...'}
          />
          <datalist id="cidades-list">
            {cidades.map(c => <option key={c} value={c} />)}
          </datalist>
          {cidadeOk && <p className="text-xs text-green-400 mt-1">✓</p>}
          {cidade.trim() && !cidadeOk && <p className="text-xs text-red-400 mt-1">Cidade não encontrada em {estado}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-content-muted block">Contato(s)</label>
        {contatos.map((c, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex-1">
              <input
                value={c}
                onKeyDown={(e) => handleContatoKeyDown(i, e)}
                onClick={handleContatoClick}
                onFocus={handleContatoClick}
                onChange={() => {}}
                className={`${input} ${contatoValido(c) ? 'border-green-500/50 focus:ring-green-500/30' : c && contatoDigitos(c) > 0 ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
                placeholder="(00) 9 0000-0000"
                required
                inputMode="tel"
              />
              {contatoValido(c) && <p className="text-xs text-green-400 mt-0.5">Contato válido ✓</p>}
              {c && contatoDigitos(c) >= 2 && !contatoDddOk(c) && <p className="text-xs text-red-400 mt-0.5">DDD inválido</p>}
              {c && contatoDigitos(c) === 11 && contatoDddOk(c) && !contatoValido(c) && <p className="text-xs text-red-400 mt-0.5">Celular deve começar com 9</p>}
              {c && contatoDigitos(c) > 0 && contatoDigitos(c) < 11 && contatoDddOk(c) && <p className="text-xs text-red-400 mt-0.5">Faltam {11 - contatoDigitos(c)} dígito(s)</p>}
            </div>
            {contatos.length > 1 && (
              <button type="button" onClick={() => removeContato(i)} className="rounded-lg px-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addContato}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
          <Plus size={14} /> Adicionar contato
        </button>
      </div>

      {erro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => navigate('/clientes')}
          className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !cpfCnpjOk || cpfCnpjDuplicado || !contatosOk || !cidadeOk || nomeDuplicado}
          className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
          {loading ? 'Salvando...' : 'Cadastrar Cliente'}
        </button>
      </div>
    </form>
  );
}
