# 🏪 DM Calçados - Sistema de Gestão

Sistema de gestão de vendas e estoque com dashboard analítico para lojas de calçados.

**Stack:** React 19 · TypeScript · React Router 7 (SSR) · Firebase (Auth + Realtime Database) · Cloudinary · Tailwind CSS 4 · Highcharts · Vite 7

---

## 📖 Documentação das Páginas

Documentação detalhada de cada página com todas as funcionalidades, regras de negócio e permissões:

| Página | Documentação |
|---|---|
| 🏠 Landing Page | [docs/landing.md](docs/landing.md) |
| 🔐 Login, Registro e Conta | [docs/autenticacao.md](docs/autenticacao.md) |
| 🛒 Vendas (listagem + nova venda) | [docs/vendas.md](docs/vendas.md) |
| 📦 Estoque / Produtos | [docs/estoque.md](docs/estoque.md) |
| 👥 Clientes (todos + meus) | [docs/clientes.md](docs/clientes.md) |
| 💰 Despesas | [docs/despesas.md](docs/despesas.md) |
| 📊 Dashboard | [docs/dashboard.md](docs/dashboard.md) |
| 🔧 Usuários e Histórico | [docs/administracao.md](docs/administracao.md) |
| 🧭 Layout, Sidebar e Header | [docs/layout.md](docs/layout.md) |

---

## 📁 Estrutura do Projeto

```
app/
├── components/
│   ├── auth/           # LoginForm, RegisterForm
│   ├── clientes/       # ClienteForm
│   ├── common/         # Button, Card, Input, ResponsiveTable
│   ├── despesas/       # DespesaForm
│   ├── layout/         # Header, HeaderTicker, Layout, Sidebar
│   ├── produtos/       # ProdutoCard, ProdutoForm
│   └── vendas/         # VendaForm
├── contexts/
│   └── AuthContext.tsx  # Autenticação global via Context API
├── models/
│   └── index.ts        # Tipos TypeScript (User, Produto, Cliente, Venda, Despesa, EntradaProduto)
├── routes/             # Páginas da aplicação
├── services/           # Camada de acesso ao Firebase + Cloudinary
│   ├── firebase.ts     # Configuração Firebase
│   ├── auth.service.ts
│   ├── clientes.service.ts
│   ├── cloudinary.service.ts
│   ├── despesas.service.ts
│   ├── entradas.service.ts
│   ├── produtos.service.ts
│   ├── users.service.ts
│   └── vendas.service.ts
├── utils/
│   └── format.ts       # formatCurrency, formatDate
├── app.css             # Estilos globais (design tokens + tema escuro)
├── root.tsx            # Root layout da aplicação
└── routes.ts           # Definição de rotas
docs/                   # Documentação detalhada de cada página
```

---

## 🚀 Setup Rápido

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Habilite **Authentication** (Email/Password)
3. Habilite **Realtime Database**
4. Copie as credenciais do projeto

### 3. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### 4. Criar Primeiro Usuário Admin

**Opção 1: Via Tela de Registro**
1. Acesse `http://localhost:5173/register`
2. Preencha Nome, Usuário e Senha
3. No Firebase Console > Realtime Database > `users` > `[seu_uid]`
4. Edite o campo `role` para `"admin"`

**Opção 2: Manual no Firebase Console**
1. Authentication > Add user (`admin@dmcalcados.local` + senha)
2. Copie o UID gerado
3. Realtime Database > Crie em `users/{UID}`:
   ```json
   { "username": "admin", "nome": "Administrador", "role": "admin", "createdAt": "2024-01-01T00:00:00.000Z" }
   ```

### 5. Configurar Firestore Rules

No Firebase Console > Firestore Database > Rules, copie o conteúdo de `firestore.rules`.

### 6. Rodar o Projeto

```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (com `--host` para acesso na rede local) |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run typecheck` | Gera tipos do React Router + verificação TypeScript |

---

## 🐳 Docker

```bash
docker build -t dmcalcados .
docker run -p 3000:3000 dmcalcados
```

O Dockerfile usa multi-stage build com Node 20 Alpine para imagem otimizada.

---

## 🗺️ Rotas

| Rota | Página | Acesso | Docs |
|---|---|---|---|
| `/` | Landing page | Público | [landing.md](docs/landing.md) |
| `/login` | Login | Público | [autenticacao.md](docs/autenticacao.md) |
| `/register` | Registro | Público | [autenticacao.md](docs/autenticacao.md) |
| `/vendas` | Lista de vendas | Autenticado | [vendas.md](docs/vendas.md) |
| `/vendas/nova` | Registrar venda | Autenticado | [vendas.md](docs/vendas.md) |
| `/produtos` | Estoque / Produtos | Admin | [estoque.md](docs/estoque.md) |
| `/produtos/novo` | Cadastrar produto | Admin | [estoque.md](docs/estoque.md) |
| `/produtos/:id/editar` | Editar produto | Admin | [estoque.md](docs/estoque.md) |
| `/clientes` | Lista de clientes (todos) | Admin | [clientes.md](docs/clientes.md) |
| `/clientes/novo` | Cadastrar cliente | Autenticado | [clientes.md](docs/clientes.md) |
| `/meus-clientes` | Clientes do vendedor | Vendedor | [clientes.md](docs/clientes.md) |
| `/despesas` | Lista de despesas | Autenticado | [despesas.md](docs/despesas.md) |
| `/despesas/nova` | Registrar despesa | Autenticado | [despesas.md](docs/despesas.md) |
| `/dashboard` | Dashboard com gráficos | Autenticado | [dashboard.md](docs/dashboard.md) |
| `/usuarios` | Gestão de usuários | Admin | [administracao.md](docs/administracao.md) |
| `/historico` | Notificações | Admin | [administracao.md](docs/administracao.md) |
| `/conta` | Minha conta / Perfil | Autenticado | [autenticacao.md](docs/autenticacao.md) |

---

## 👥 Roles e Permissões

| Funcionalidade | Vendedor | Admin | Super Admin |
|---|:---:|:---:|:---:|
| Ver dashboard (próprias vendas) | ✅ | — | — |
| Ver dashboard (todas as vendas) | — | ✅ | ✅ |
| Registrar vendas | ✅ | ✅ | ✅ |
| Ver próprias vendas | ✅ | ✅ | ✅ |
| Ver todas as vendas | — | ✅ | ✅ |
| Meus Clientes | ✅ | — | — |
| Todos os Clientes | — | ✅ | ✅ |
| Registrar despesas | ✅ | ✅ | ✅ |
| Ver todas as despesas | — | ✅ | ✅ |
| Gerenciar produtos | — | ✅ | ✅ |
| Gerenciar usuários | — | ✅ | ✅ |
| Promover a Super Admin | — | — | ✅ |
| Notificações | — | ✅ | ✅ |

---

## 🗄️ Modelos de Dados

### User
```typescript
interface User {
  id: string;
  uid?: string;
  username: string;
  nome: string;
  foto?: string;
  role: 'admin' | 'vendedor' | 'superadmin';
  createdAt: Date;
  deletedAt?: Date;
}
```

### Produto
```typescript
interface Produto {
  id: string;
  modelo: string;
  referencia: string;
  valor: number;
  foto: string;
  estoque: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Cliente
```typescript
interface Cliente {
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
```

### Venda
```typescript
type CondicaoPagamento = 'avista' | '1x' | '2x' | '3x' | '1x_entrada' | '2x_entrada' | '3x_entrada';

interface VendaProduto {
  produtoId: string;
  modelo: string;
  referencia: string;
  quantidade: number;
  valorSugerido: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Venda {
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
```

### Despesa
```typescript
interface Despesa {
  id: string;
  tipo: string;
  valor: number;
  data: Date;
  usuarioId: string;
  usuarioNome: string;
  imagemUrl?: string;
  createdAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
}
```

### EntradaProduto
```typescript
interface EntradaProduto {
  id: string;
  produtoId: string;
  modelo: string;
  referencia: string;
  quantidade: number;
  valorUnitario: number;
  createdAt: string;
}
```

---

## 🔧 Services (API)

### auth.service
- `login(username, password)` — Autentica via Firebase Auth (email: `{username}@dmcalcados.local`)
- `register(username, password, nome, role?)` — Cria usuário no Auth + Realtime Database (reativa soft-deleted se existir)
- `logout()` — Encerra sessão e limpa loginTime
- `getUserData(uid)` — Busca dados do usuário no Realtime Database
- `updateProfile(uid, data)` — Atualiza nome e/ou foto do perfil
- `updatePassword(newPassword)` — Altera senha do usuário autenticado
- `onAuthChange(callback)` — Listener de mudança de autenticação

### vendas.service
- `getVendas()` — Lista vendas (admin/superadmin: todas, vendedor: apenas suas)
- `createVenda(data)` — Registra nova venda com número de pedido automático
- `deleteVenda(vendaId)` — Soft delete da venda

### clientes.service
- `getClientes()` — Lista todos os clientes ativos
- `createCliente(data)` — Cadastra novo cliente
- `updateCliente(clienteId, data)` — Atualiza dados do cliente
- `deleteCliente(clienteId)` — Soft delete do cliente

### produtos.service
- `getProdutos()` — Lista todos os produtos
- `createProduto(data)` — Cadastra novo produto
- `updateProduto(id, data)` — Atualiza produto existente
- `deleteProduto(id)` — Remove produto permanentemente

### despesas.service
- `getDespesas()` — Lista despesas (admin: todas, vendedor: apenas suas)
- `createDespesa(data)` — Registra nova despesa (com suporte a imagemUrl)
- `deleteDespesa(despesaId)` — Soft delete da despesa
- `getTiposDespesa()` — Lista tipos de despesa cadastrados
- `addTipoDespesa(tipo, icone?)` — Adiciona novo tipo de despesa
- `updateTipoDespesa(key, novoNome, icone?)` — Renomeia tipo de despesa
- `deleteTipoDespesa(key)` — Remove tipo de despesa

### entradas.service
- `getEntradas()` — Lista todas as entradas de estoque
- `createEntrada(data)` — Registra nova entrada de estoque
- `migrarEntradasExistentes()` — Cria entradas retroativas para produtos sem registro

### cloudinary.service
- `uploadImage(file, folder?)` — Upload de imagem para Cloudinary

### users.service
- `getUsers()` — Lista todos os usuários ativos
- `updateUserRole(userId, role)` — Altera role do usuário (protege Super Admin)
- `deleteUser(userId)` — Soft delete do usuário (protege Super Admin)

---

## 🎨 UI/UX

- **Tema:** Escuro fixo (dark-only) com design tokens CSS customizados
- **Design tokens:** bg-base, surface, elevated, border-subtle, border-medium, content, content-secondary, content-muted, gold
- **Responsivo:** Mobile-first com breakpoints `sm:` e `lg:`
- **Componentes reutilizáveis:** Button (primary/secondary/danger/ghost), Card, Input, ResponsiveTable
- **Ícones:** Lucide React
- **Gráficos:** Highcharts (área, coluna, barra, linha)
- **Layout:** Sidebar fixa (desktop) / drawer direito (mobile) + Header com ticker de estatísticas
- **Scrollbar:** Customizada (webkit + Firefox)
- **Botão CTA:** Gradiente dourado com efeito shine e hover elevado
- **Exclusão segura:** Triple click em todos os botões de exclusão

---

## 📊 Dashboard

O dashboard exibe dados filtráveis por período (hoje, 7 dias, 30 dias, ano, tudo):

- **Cards:** Total de vendas, despesas e saldo (lucro/prejuízo) com ticket médio e margem
- **Gráfico de vendas:** Evolução no período (área verde)
- **Gráfico de despesas:** Evolução no período (área vermelha)
- **Por vendedor:** Vendas por usuário (apenas admin, barra)
- **Por usuário:** Despesas por usuário (apenas admin, barra)
- **Top 10 clientes:** Maiores compradores do período (barra)
- **Por tipo de despesa:** Despesas agrupadas por tipo (barra)

> Documentação completa: [docs/dashboard.md](docs/dashboard.md)

---

## ⚠️ Observações

- A autenticação usa emails fictícios (`{username}@dmcalcados.local`) para simplificar o login por username
- Deleções são soft delete (campo `deletedAt`) para manter histórico, exceto produtos (delete permanente)
- O SSR está habilitado (`ssr: true` em `react-router.config.ts`)
- Firebase Realtime Database é usado (não Firestore), apesar do arquivo `firestore.rules` existir para referência
- Upload de imagens (produtos, despesas, perfil) via Cloudinary
- Sessão expira automaticamente baseado no role (vendedor: 1 dia, admin: 7 dias)
- Acesso ao login é oculto na landing page (triple click na logo, Konami code, ou swipe ↑↑↓↓)
- Número de pedido é gerado automaticamente (sequencial)
