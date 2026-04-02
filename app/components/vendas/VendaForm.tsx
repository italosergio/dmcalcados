import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createVenda, getVendas } from '~/services/vendas.service';
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
    if (!user) return;

    Promise.all([getClientes(), getProdutos(), getVendas()]).then(([clientesData, produtosData, vendasData]) => {
      // Se for vendedor, filtrar apenas clientes que já atendeu
      if (user.role === 'vendedor') {
        const meusClientesIds = new Set(
          vendasData
            .filter(v => !v.deletedAt && (v.vendedorId === user.uid || v.vendedorId === user.id))
            .map(v => v.clienteId)
        );
        const meusClientes = clientesData.filter(c => meusClientesIds.has(c.id));
        setClientes(meusClientes);
      } else {
        setClientes(clientesData);
      }
      
      setProdutos(produtosData);
    });
  }, [user]);

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
          <label className="text-xs sm:text-sm font-medium block mb-1">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecione um cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="rounded border p-3 sm:p-4 border-gray-700">
          <h3 className="mb-3 text-sm sm:text-base font-semibold">Adicionar Produtos</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full sm:w-20 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Qtd"
            />
            <Button type="button" onClick={adicionarProduto} disabled={!produtoId} className="w-full sm:w-auto">
              Adicionar
            </Button>
          </div>
        </div>

        {produtosSelecionados.length > 0 && (
          <div className="rounded border p-3 sm:p-4 border-gray-700">
            <h3 className="mb-3 text-sm sm:text-base font-semibold">Produtos Selecionados</h3>
            <div className="space-y-2">
              {produtosSelecionados.map((p, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-700 last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm sm:text-base block truncate">{p.nome}</span>
                    <span className="text-xs sm:text-sm text-gray-400">
                      {p.quantidade}x {formatCurrency(p.valorUnitario)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-bold text-sm sm:text-base">{formatCurrency(p.valorTotal)}</span>
                    <button
                      type="button"
                      onClick={() => removerProduto(i)}
                      className="text-xs sm:text-sm text-red-600 hover:underline whitespace-nowrap"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-4 border-gray-700">
              <div className="flex justify-between text-base sm:text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit" disabled={loading || produtosSelecionados.length === 0} className="w-full sm:w-auto">
            {loading ? 'Salvando...' : 'Registrar Venda'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/vendas')} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
