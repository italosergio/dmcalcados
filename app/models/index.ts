export interface User {
  id: string;
  username: string;
  nome: string;
  role: 'admin' | 'vendedor';
  createdAt: Date;
}

export interface Produto {
  id: string;
  nome: string;
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
  createdAt: Date;
}

export interface VendaProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface Venda {
  id: string;
  clienteId: string;
  clienteNome: string;
  vendedorId: string;
  vendedorNome: string;
  produtos: VendaProduto[];
  valorTotal: number;
  data: Date;
  createdAt: Date;
}

export interface Despesa {
  id: string;
  tipo: string;
  valor: number;
  data: Date;
  usuarioNome: string;
  createdAt: Date;
}
