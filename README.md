# 🏪 DM Calçados - Sistema de Gestão

Sistema de gestão de vendas e estoque com dashboard analítico para lojas de calçados.

**Stack:** React 19 · TypeScript · React Router 7 (SSR) · Firebase (Auth + Realtime Database) · Tailwind CSS 4 · Highcharts · Vite 7

---

## 📁 Estrutura do Projeto

```
app/
├── components/
│   ├── auth/           # LoginForm, RegisterForm
│   ├── clientes/       # ClienteForm
│   ├── common/         # Button, Card, Input, ResponsiveTable
│   ├── despesas/       # DespesaForm
│   ├── layout/         # Header, Layout, Sidebar
│   ├── produtos/       # ProdutoCard, ProdutoForm
│   └── vendas/         # VendaForm
├── contexts/
│   └── AuthContext.tsx  # Autenticação global via Context API
├── models/
│   └── index.ts        # Tipos TypeScript (User, Produto, Cliente, Venda, Despesa)
├── routes/             # Páginas da aplicação
├── services/           # Camada de acesso ao Firebase
│   ├── firebase.ts     # Configuração Firebase
│   ├── auth.service.ts
│   ├── clientes.service.ts
│   ├── despesas.service.ts
│   ├── produtos.service.ts
│   ├── users.service.ts
│   └── vendas.service.ts
├── utils/
│   └── format.ts       # formatCurrency, formatDate
├── app.css             # Estilos globais (tema escuro)
├── root.tsx            # Root layout da aplicação
└── routes.ts           # Definição de rotas
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

| Rota | Página | Acesso |
|---|---|---|
| `/` | Login | Público |
| `/register` | Registro | Público |
| `/dashboard` | Dashboard com gráficos | Autenticado |
| `/vendas` | Lista de vendas | Autenticado |
| `/vendas/nova` | Registrar venda | Autenticado |
| `/produtos` | Lista de produtos | Autenticado |
| `/produtos/novo` | Cadastrar produto | Autenticado |
| `/clientes` | Lista de clientes (todos) | Admin |
| `/clientes/novo` | Cadastrar cliente | Autenticado |
| `/meus-clientes` | Clientes do vendedor | Vendedor |
| `/despesas` | Lista de despesas | Autenticado |
| `/despesas/nova` | Registrar despesa | Autenticado |
| `/usuarios` | Gestão de usuários | Admin |
| `/historico` | Histórico de atividades | Admin |

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
| Gerenciar produtos | ✅ | ✅ | ✅ |
| Gerenciar usuários | — | ✅ | ✅ |
| Promover a Super Admin | — | — | ✅ |
| Histórico de atividades | — | ✅ | ✅ |

---

## 🗄️ Modelos de Dados

### User
```typescript
interface User {
  id: string;
  uid?: string;
  username: string;
  nome: string;
  role: 'admin' | 'vendedor' | 'superadmin';
  createdAt: Date;
  deletedAt?: Date;
}
```

### Produto
```typescript
interface Produto {
  id: string;
  nome: string;
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
  createdAt: Date;
}
```

### Venda
```typescript
interface Venda {
  id: string;
  clienteId: string;
  clienteNome: string;
  vendedorId: string;
  vendedorNome: string;
  produtos: VendaProduto[];
  valorTotal: number;
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
  createdAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
}
```

---

## 🔧 Services (API)

### auth.service
- `login(username, password)` — Autentica via Firebase Auth (email: `{username}@dmcalcados.local`)
- `register(username, password, nome, role?)` — Cria usuário no Auth + Realtime Database
- `logout()` — Encerra sessão
- `getUserData(uid)` — Busca dados do usuário no Realtime Database
- `onAuthChange(callback)` — Listener de mudança de autenticação

### vendas.service
- `getVendas()` — Lista vendas (admin: todas, vendedor: apenas suas)
- `createVenda(data)` — Registra nova venda
- `deleteVenda(vendaId)` — Soft delete da venda

### clientes.service
- `getClientes()` — Lista todos os clientes ativos
- `createCliente(data)` — Cadastra novo cliente
- `deleteCliente(clienteId)` — Soft delete do cliente

### produtos.service
- `getProdutos()` — Lista todos os produtos
- `createProduto(data)` — Cadastra novo produto

### despesas.service
- `getDespesas()` — Lista despesas (admin: todas, vendedor: apenas suas)
- `createDespesa(data)` — Registra nova despesa
- `deleteDespesa(despesaId)` — Soft delete da despesa

### users.service
- `getUsers()` — Lista todos os usuários ativos
- `updateUserRole(userId, role)` — Altera role do usuário (protege Super Admin)
- `deleteUser(userId)` — Soft delete do usuário (protege Super Admin)

---

## 🎨 UI/UX

- **Tema:** Escuro fixo (dark-only)
- **Responsivo:** Mobile-first com breakpoints `sm:` e `lg:`
- **Componentes reutilizáveis:** Button (primary/secondary/danger), Card, Input, ResponsiveTable
- **Ícones:** Lucide React
- **Gráficos:** Highcharts (área, coluna, barra)
- **Layout:** Sidebar colapsável no mobile + Header

---

## 📊 Dashboard

O dashboard exibe dados dos últimos 30 dias:

- **Cards:** Total de vendas, despesas e saldo (lucro/prejuízo)
- **Resumo:** Ticket médio e margem percentual
- **Gráfico 30 dias:** Vendas vs Despesas (área)
- **Gráfico anual:** Vendas vs Despesas por mês (coluna)
- **Por vendedor:** Vendas e despesas por usuário (apenas admin, barra)
- **Top 10 clientes:** Maiores compradores do período (barra)

---

## ⚠️ Observações

- A autenticação usa emails fictícios (`{username}@dmcalcados.local`) para simplificar o login por username
- Deleções são soft delete (campo `deletedAt`) para manter histórico
- O SSR está habilitado (`ssr: true` em `react-router.config.ts`)
- Firebase Realtime Database é usado (não Firestore), apesar do arquivo `firestore.rules` existir para referência
