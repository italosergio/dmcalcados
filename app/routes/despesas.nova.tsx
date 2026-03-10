import { DespesaForm } from '~/components/despesas/DespesaForm';

export default function NovaDespesaPage() {
  return (
    
      <div>
        <h1 className="mb-6 text-2xl font-bold">Nova Despesa</h1>
        <div className="max-w-2xl">
          <DespesaForm />
        </div>
      </div>
    
  );
}
