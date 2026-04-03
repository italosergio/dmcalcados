# 👥 Clientes

**Arquivos:** `app/routes/clientes.tsx` · `app/routes/clientes.novo.tsx` · `app/routes/meus-clientes.tsx` · `app/components/clientes/ClienteForm.tsx`

---

## Todos os Clientes

**Rota:** `/clientes` · **Acesso:** Admin / Super Admin

### Funcionalidades

#### Listagem
- Cards expansíveis com dados do cliente
- Busca por nome em tempo real
- Botão "Novo Cliente" → `/clientes/novo`

#### Dados Exibidos
- Nome, Endereço (rua · cidade · estado), CPF/CNPJ
- Data de cadastro ("Cliente desde...")
- Contatos (múltiplos)
- Total de compras (valor) + quantidade de compras

#### Expansão (Histórico)
Ao clicar no card, expande e exibe:
- Lista de compras ordenadas por data (mais recente primeiro)
- Cada compra mostra: data, valor total, produtos (quantidade × modelo), vendedor

#### Edição Inline
- Botão de lápis abre formulário inline no próprio card
- Campos editáveis: Nome, CPF/CNPJ, Endereço, Estado/Cidade, Contatos
- Busca de cidades via API do IBGE ao trocar estado
- Suporte a múltiplos contatos com formatação automática
- Botões Cancelar / Salvar

#### Exclusão
- Sistema de **triple click** (apenas Admin)
- Soft delete (campo `deletedAt`)

### Regras
- Apenas Admin e Super Admin acessam esta página
- Vendedores são redirecionados para `/meus-clientes`

---

## Meus Clientes

**Rota:** `/meus-clientes` · **Acesso:** Vendedor

### Funcionalidades
- Lista apenas clientes que o vendedor já atendeu (baseado no histórico de vendas)
- Busca por nome
- Cards expansíveis com histórico de compras
- Exibe total de compras por cliente
- Data de cadastro do cliente
- Botão "Novo Cliente" → `/clientes/novo`

### Regras
- Filtra vendas pelo `vendedorId` do usuário logado
- Clientes aparecem automaticamente após a primeira venda

---

## Novo Cliente

**Rota:** `/clientes/novo` · **Acesso:** Autenticado

### Funcionalidades
- **Nome / Razão Social:** Mínimo 3 caracteres
- **CPF / CNPJ:** Validação completa de dígitos verificadores
- **Endereço:** Mínimo 3 caracteres
- **Estado:** Select com todos os 27 UFs
- **Cidade:** Autocomplete via API do IBGE (datalist), validação contra lista oficial
- **Contatos:** Múltiplos, com formatação automática `(00) 9 0000-0000`

### Validações em Tempo Real
| Campo | Validação | Indicador |
|---|---|---|
| Nome | ≥ 3 caracteres | ✓ verde |
| CPF | 11 dígitos + dígitos verificadores | "CPF válido ✓" ou "CPF inválido" |
| CNPJ | 14 dígitos + dígitos verificadores | "CNPJ válido ✓" ou "CNPJ inválido" |
| Endereço | ≥ 3 caracteres | ✓ verde |
| Cidade | Existe na lista do IBGE | ✓ verde ou "Cidade não encontrada em XX" |
| Contato | 11 dígitos + DDD válido + começa com 9 | "Contato válido ✓" ou erro específico |

### Validações de Contato
- DDD deve estar na lista de DDDs válidos do Brasil
- Celular deve começar com 9 (terceiro dígito)
- Exatamente 11 dígitos
- Formatação automática ao digitar (máscara de telefone)
- Input controlado: só aceita números, backspace e tab
- Cursor sempre posicionado no final

### Regras
- Botão de submit desabilitado até todas as validações passarem
- Todos os campos são obrigatórios
- Após cadastro, redireciona para `/clientes`
