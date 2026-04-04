export type UserRole = 'admin' | 'vendedor' | 'vendedor1' | 'vendedor2' | 'vendedor3' | 'financeiro' | 'desenvolvedor' | 'superadmin';

export interface User {
  id: string;
  uid?: string;
  username: string;
  nome: string;
  foto?: string;
  role: UserRole;        // role principal (legado + compatibilidade)
  roles?: UserRole[];    // todas as roles do usuário
  createdAt: Date;
  deletedAt?: Date;
}

// Helpers que consideram roles[] ou role
export function getUserRoles(user: User): UserRole[] {
  if (user.roles && user.roles.length > 0) return user.roles;
  return [user.role];
}

export function isVendedor(role: UserRole | undefined): boolean {
  return role === 'vendedor' || role === 'vendedor1' || role === 'vendedor2' || role === 'vendedor3';
}

export function userIsVendedor(user: User): boolean {
  return getUserRoles(user).some(r => isVendedor(r));
}

export function userIsAdmin(user: User): boolean {
  return getUserRoles(user).some(r => r === 'admin' || r === 'superadmin');
}

export function userCanAccessAdmin(user: User): boolean {
  return getUserRoles(user).some(r => r === 'admin' || r === 'superadmin' || r === 'financeiro' || r === 'desenvolvedor');
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
  donoId?: string;
  donoNome?: string;
  compartilhadoCom?: string[];
  createdAt: Date;
}

export type CondicaoPagamento = 'avista' | '1x' | '2x' | '3x' | '1x_entrada' | '2x_entrada' | '3x_entrada';

export interface VendaProduto {
  produtoId: string;
  modelo: string;
  referencia: string;
  quantidade: number;
  tipo?: 'pacote' | 'unidade';
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
  registradoPorNome?: string;
  produtos: VendaProduto[];
  valorTotal: number;
  condicaoPagamento: CondicaoPagamento;
  valorAvista: number;
  valorPrazo: number;
  parcelas: number;
  datasParcelas?: string[];
  descricao?: string;
  imagemUrl?: string;
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
  descricao?: string;
  imagemUrl?: string;
  rateio?: { usuarioId: string; usuarioNome: string; valor: number }[];
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

export interface CicloProduto {
  produtoId: string;
  modelo: string;
  referencia: string;
  pacotesInicial: number;
  pecasInicial: number;
  pacotesAtual: number;
  pecasAtual: number;
  valorUnitario: number;
}

export interface Ciclo {
  id: string;
  vendedorId: string;
  vendedorNome: string;
  produtos: CicloProduto[];
  status: 'ativo' | 'fechado';
  criadoPorId: string;
  criadoPorNome: string;
  fechadoPorId?: string;
  fechadoPorNome?: string;
  createdAt: string;
  closedAt?: string;
}

