import { VendaForm } from '~/components/vendas/VendaForm';

export default function NovaVendaPage() {
  return (
    <div>
      <h1 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold">Nova Venda</h1>
      <div className="max-w-4xl">
        <VendaForm />
      </div>
    </div>
  );
}
