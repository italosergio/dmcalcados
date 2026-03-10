import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createVenda } from '~/services/vendas.service';
import { getClientes } from '~/services/clientes.service';
import { getProdutos } from '~/services/produtos.service';
import { useAuth } from '~/contexts/AuthContext';
import { Button } from '~/components/common/Button';
import { Card } from '~/components/common/Card';
import type { Cliente, Produto, VendaProduto } from '~/models';
import { formatCurrency } from '~/utils/format';

export function VendaForm() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [produtosSelecionados, setProdutosSelecionados] = useState<VendaProduto[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    getClientes().then(setClientes);
    getProdutos().then(setProdutos);
  }, []);

  const adicionarProduto = () => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const qtd = parseInt(quantidade);
    const valorTotal = produto.valor * qtd;

    setProdutosSelecionados([...produtosSelecionados, {
      produtoId: produto.id,
      nome: produto.nome,
      quantidade: qtd,
      valorUnitario: produto.valor,
      valorTotal
    }]);

    setProdutoId('');
    setQuantidade('1');
  };

  const removerProduto = (index: number) => {
    setProdutosSelecionados(produtosSelecionados.filter((_, i) => i !== index));
  };

  const total = produtosSelecionados.reduce((sum, p) => sum + p.valorTotal, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || produtosSelecionados.length === 0) return;

    setLoading(true);
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      await createVenda({
        clienteId,
        clienteNome: cliente?.nome || '',
        vendedorId: user.id,
        vendedorNome: user.nome,
        produtos: produtosSelecionados,
        valorTotal: total,
        data: new Date()
      });
      navigate('/vendas');
    } catch (error) {
      alert('Erro ao registrar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            required
          >
            <option value="">Selecione um cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="rounded border p-4 dark:border-gray-700">
          <h3 className="mb-3 font-semibold">Adicionar Produtos</h3>
          <div className="flex gap-2">
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">Selecione um produto</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>{p.nome} - {formatCurrency(p.valor)}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-20 rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            />
            <Button type="button" onClick={adicionarProduto} disabled={!produtoId}>
              Adicionar
            </Button>
          </div>
        </div>

        {produtosSelecionados.length > 0 && (
          <div className="rounded border p-4 dark:border-gray-700">
            <h3 className="mb-3 font-semibold">Produtos Selecionados</h3>
            <div className="space-y-2">
              {produtosSelecionados.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{p.nome}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {p.quantidade}x {formatCurrency(p.valorUnitario)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatCurrency(p.valorTotal)}</span>
                    <button
                      type="button"
                      onClick={() => removerProduto(i)}
                      className="text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-4 dark:border-gray-700">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading || produtosSelecionados.length === 0}>
            {loading ? 'Salvando...' : 'Registrar Venda'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/vendas')}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
