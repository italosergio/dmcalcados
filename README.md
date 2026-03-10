# 🏪 DM Calçados - Sistema de Gestão

Sistema de gestão de vendas e estoque com dashboard analítico.

## 🚀 Setup Rápido

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Habilite **Authentication** (Email/Password)
3. Habilite **Firestore Database**
4. Copie as credenciais do projeto

### 3. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais do Firebase.

### 4. Criar Primeiro Usuário Admin

**Opção 1: Via Tela de Registro (Recomendado)**
1. Acesse: http://localhost:5173/register
2. Preencha: Nome, Usuário, Senha
3. Clique em "Criar Conta"
4. No Firebase Console > Firestore > users > [seu_uid]
5. Edite o campo `role` para `"admin"`

**Opção 2: Manual no Firebase Console**
1. Firebase Console > Authentication > Add user
   - Email: `admin@dmcalcados.local`
   - Password: (sua senha)
2. Copie o UID gerado
3. Firestore > Create collection `users`
   - Document ID: (cole o UID)
   - Fields:
     - username: "admin"
     - nome: "Administrador"
     - role: "admin"
     - createdAt: (timestamp atual)

### 5. Configurar Firestore Rules

No Firebase Console > Firestore Database > Rules, copie o conteúdo de `firestore.rules`.

### 6. Rodar o Projeto

```bash
npm run dev
```

Acesse: http://localhost:5173

## 📁 Estrutura

```
app/
├── components/     # Componentes React
├── contexts/       # Context API (Auth, Theme)
├── models/         # TypeScript types
├── routes/         # Páginas
├── services/       # Firebase services
└── utils/          # Utilitários
```

## 🎯 Próximos Passos

- [ ] Implementar CRUD de Produtos
- [ ] Implementar CRUD de Clientes
- [ ] Implementar Registro de Vendas
- [ ] Implementar Registro de Despesas
- [ ] Adicionar gráficos no Dashboard
- [ ] Adicionar filtros por data

## 📚 Documentação

Veja `.amazonq/prompts/dm-calcados-architecture.md` para arquitetura completa.
