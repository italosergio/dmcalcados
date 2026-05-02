# 🔧 Administração

**Arquivos:** `app/routes/usuarios.tsx` · `app/routes/historico.tsx`

---

## Gestão de Usuários

**Rota:** `/usuarios` · **Acesso:** Admin / Super Admin

### Funcionalidades

#### Listagem
- Grid de cards (1 coluna mobile, 2 tablet, 3 desktop)
- Cada card exibe: ícone do role, nome, username, badge "SUPER" para superadmin
- Ícones por role: Super Admin (escudo roxo), Admin (escudo vermelho), Vendedor (pessoa azul)

#### Criar Novo Usuário
- Botão "Novo Usuário" abre formulário inline
- Campos: Nome completo, Usuário, Senha, Role (Vendedor/Admin)
- Validações: todos os campos obrigatórios, senha mínima 6 caracteres
- Após criar, recarrega a lista de usuários

#### Alterar Role
- Select dropdown em cada card (exceto Super Admin)
- Opções: Vendedor, Admin
- Super Admin só pode ser promovido por outro Super Admin

#### Exclusão
- Sistema de **triple click** (Remover → Tem certeza? → Confirmar!)
- Soft delete (campo `deletedAt`)
- Super Admin não pode ser excluído

### Regras
- Página retorna "Acesso negado" para vendedores
- Super Admin é protegido contra alteração de role e exclusão
- Ao criar usuário com username existente (soft-deleted), tenta reativar

---

## Notificações

**Rota:** `/historico` · **Acesso:** Admin / Super Admin

### Funcionalidades

#### Central de Notificações
- Lista cronológica reversa (mais recente primeiro) de eventos importantes do sistema
- Agrupamento por data, filtros por categoria, busca e resumo de eventos recentes
- Cada item exibe: ícone, categoria, título, contexto, responsável, data/hora

#### Tipos de Notificação
| Tipo | Ícone | Ações |
|---|---|---|
| Venda | 🛒 verde | Criada, Deletada |
| Despesa | 💰 vermelho | Criada, Deletada |
| Produto | 📦 azul | Criado, Deletado |
| Cliente | 👤 roxo | Criado, Deletado |
| Usuário | 👤 verde | Criado, Deletado |
| Alteração de Role | ⚙️ azul | Role alterado |

#### Expansão de Detalhes
- Vendas e Despesas são expansíveis (clique para expandir)
- **Venda expandida:** Lista de produtos (quantidade × modelo = valor)
- **Despesa expandida:** Tipo, Valor, Data

#### Informações Exibidas
- Quem realizou a ação
- Data e hora
- Para exclusões: quem deletou (nome resolvido via mapa de usuários)
- Para alterações de role: novo role atribuído

### Regras
- Dados carregados diretamente do Firebase (todas as collections)
- Inclui itens soft-deleted (para mostrar histórico de exclusões)
- Mapa de usuários construído para resolver nomes de quem deletou
