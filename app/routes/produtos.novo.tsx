import { ProdutoForm } from '~/components/produtos/ProdutoForm';

export default function NovoProdutoPage() {
  return (
    
      <div>
        <h1 className="mb-6 text-2xl font-bold">Novo Produto</h1>
        <div className="max-w-2xl">
          <ProdutoForm />
        </div>
      </div>
    
  );
}
