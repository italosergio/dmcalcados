export interface User {
  id: string;
  uid?: string; // Firebase UID
  username: string;
  nome: string;
  foto?: string;
  role: 'admin' | 'vendedor' | 'superadmin';
  createdAt: Date;
  deletedAt?: Date;
}

export interface Produto {
  id: string;
  modelo: string;
  referencia: string;
  valor: number;
  foto: string;
  estoque: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cliente {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  cpfCnpj: string;
  contato: string;
  contatos?: string[];
  createdAt: Date;
}

export type CondicaoPagamento = 'avista' | '1x' | '2x' | '3x' | '1x_entrada' | '2x_entrada' | '3x_entrada';

export interface VendaProduto {
  produtoId: string;
  modelo: string;
  referencia: string;
  quantidade: number;
  valorSugerido: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface Venda {
  id: string;
  pedidoNumero: number;
  clienteId: string;
  clienteNome: string;
  vendedorId: string;
  vendedorNome: string;
  produtos: VendaProduto[];
  valorTotal: number;
  condicaoPagamento: CondicaoPagamento;
  valorAvista: number;
  valorPrazo: number;
  parcelas: number;
  datasParcelas?: string[];
  data: Date;
  createdAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface Despesa {
  id: string;
  tipo: string;
  valor: number;
  data: Date;
  usuarioId: string;
  usuarioNome: string;
  createdAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface EntradaProduto {
  id: string;
  produtoId: string;
  modelo: string;
  referencia: string;
  quantidade: number;
  valorUnitario: number;
  createdAt: string;
}
