import { ClienteForm } from '~/components/clientes/ClienteForm';

export default function NovoClientePage() {
  return (
    
      <div>
        <h1 className="mb-6 text-2xl font-bold">Novo Cliente</h1>
        <div className="max-w-2xl">
          <ClienteForm />
        </div>
      </div>
    
  );
}
