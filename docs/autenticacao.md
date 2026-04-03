# 🔐 Autenticação

**Arquivos:** `app/routes/login.tsx` · `app/routes/register.tsx` · `app/routes/conta.tsx`

---

## Login

**Rota:** `/login` · **Acesso:** Público

### Funcionalidades
- Formulário com campos Usuário e Senha
- Logo centralizada no topo do card
- Botão CTA dourado com efeito shine
- Após login, aguarda resolução do auth (`waitForAuth`) antes de navegar
- Redireciona para `/vendas` após autenticação
- Link "Voltar à página inicial" → `/`
- Background image com overlay escuro

### Regras
- Autenticação via Firebase Auth com email fictício (`{username}@dmcalcados.local`)
- Salva `loginTime` no localStorage para controle de expiração de sessão
- Exibe mensagem "Usuário ou senha inválidos" em caso de erro

---

## Registro

**Rota:** `/register` · **Acesso:** Público

### Funcionalidades
- Formulário com Nome Completo, Usuário e Senha
- Logo + título "Criar Conta" no cabeçalho
- Após registro, redireciona para `/login`
- Link "Já tem conta? Entrar" → `/login`

### Regras
- Novos usuários são criados com role `vendedor` por padrão
- Senha mínima de 6 caracteres
- Se o username já existe no Firebase Auth:
  - Tenta reativar usuário soft-deleted no Realtime Database
  - Se não encontra, exibe "Usuário já existe"

---

## Minha Conta

**Rota:** `/conta` · **Acesso:** Autenticado

### Funcionalidades
- **Foto de perfil:** Upload via Cloudinary, preview circular com overlay de câmera no hover
- **Dados read-only:** Nome e Usuário exibidos (não editáveis)
- **Alteração de senha:**
  - Campo "Senha atual" (obrigatório para alterar)
  - Campo "Nova senha" + "Confirmar"
  - Reautenticação via Firebase antes de alterar

### Regras
- Senha atual é verificada via `reauthenticateWithCredential`
- Nova senha deve ter pelo menos 6 caracteres
- Mensagens de erro específicas: "Senha atual incorreta", "Senha fraca"
- Mensagem de sucesso em verde, erro em vermelho

---

## Expiração de Sessão

O sistema controla a duração da sessão baseado no role do usuário:

| Role | Duração Máxima |
|---|---|
| Vendedor | 1 dia |
| Admin | 7 dias |
| Outros | 1 hora |

- Verificação ocorre a cada mudança de estado do auth
- Logout automático quando a sessão expira
- `loginTime` é removido do localStorage no logout
