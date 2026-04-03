# 🛒 Vendas

**Arquivos:** `app/routes/vendas.tsx` · `app/routes/vendas.nova.tsx` · `app/components/vendas/VendaForm.tsx`

---

## Listagem de Vendas

**Rota:** `/vendas` · **Acesso:** Autenticado

### Funcionalidades

#### Cards de Resumo
- **Total no período:** Valor total + quantidade de vendas
- **À Vista + Entrada:** Soma dos valores à vista e entradas (quando aplicável)
- **À Prazo:** Soma dos valores a prazo (quando aplicável)
- Os cards se adaptam aos filtros ativos

#### Modos de Visualização
- **Cards:** Visualização expandida com detalhes de cada venda
- **Tabela:** Visualização compacta com scroll vertical
- Preferência salva no `localStorage` (`vendas-view`)
- Toggle no canto superior direito

#### Filtros
| Filtro | Opções |
|---|---|
| **Período rápido** | Hoje, 7 dias, 30 dias, Ano, Tudo |
| **Data personalizada** | Data início + Data fim (desativa período rápido) |
| **Condição de pagamento** | À Vista, Entrada, 1x, 2x, 3x |

- Filtros de condição são cumulativos (pode selecionar vários)
- Botão "Limpar" aparece quando há filtros de condição ativos
- Label do período se adapta ao filtro ativo

#### Modal de Detalhes
Ao clicar em uma venda, abre modal com:
- Número do pedido + tags de condição de pagamento
- Valor total em destaque
- Data da venda + Vendedor
- Dados do cliente (nome, CPF/CNPJ, endereço, contatos)
- Lista de produtos com modelo, referência, quantidade, valor unitário, valor sugerido
- Detalhes do pagamento (entrada, parcelas, datas)
- Data de registro

#### Exclusão
- Sistema de **triple click** para excluir:
  1. Primeiro clique: botão muda para "Tem certeza?"
  2. Segundo clique: botão muda para "Confirmar!"
  3. Terceiro clique: executa soft delete
- Timer de 3 segundos reseta o contador se não completar

### Regras de Acesso
| Role | Visualização |
|---|---|
| Vendedor | Apenas suas próprias vendas |
| Admin / Super Admin | Todas as vendas |

---

## Nova Venda

**Rota:** `/vendas/nova` · **Acesso:** Autenticado

### Funcionalidades

#### Seleção de Cliente
- **Busca com autocomplete:** Dropdown com busca por nome ou contato
- **Criação rápida inline:** Se não encontrar, botão "+ Cadastrar" abre formulário inline
- Formulário inline inclui: Nome, CPF/CNPJ, Endereço, Estado/Cidade (API IBGE), Contatos
- Validação em tempo real com indicadores visuais (✓ verde, ✗ vermelho)

#### Seleção de Produtos
- **Busca com autocomplete:** Dropdown com busca por modelo ou referência
- **Criação rápida inline:** Formulário para cadastrar produto com modelo, referência e valor
- **Preço unitário editável:** Pré-preenchido com valor sugerido do produto, mas pode ser alterado
- **Quantidade:** Botões +/- com valor mínimo de 1

#### Lista de Produtos Selecionados
- Exibe modelo, referência, quantidade × valor = total
- **Edição inline:** Botão de lápis permite alterar quantidade e preço unitário
- **Exclusão com triple click:** Mesmo padrão da listagem
- **Total automático:** Soma atualizada em tempo real

#### Condições de Pagamento
| Condição | Comportamento |
|---|---|
| **À Vista** | Valor total pago integralmente |
| **1x** | Pagamento único a prazo, com opção de entrada |
| **2x** | 2 parcelas, com opção de entrada |
| **3x** | 3 parcelas, com opção de entrada |

- **Com entrada:** Checkbox que habilita campo de entrada + calcula restante automaticamente
- **Datas das parcelas:** Campos de data para cada parcela
  - Parcela seguinte deve ser após a anterior
  - Máximo de 40 dias entre parcelas
- Condição final salva com sufixo `_entrada` quando tem entrada (ex: `2x_entrada`)

#### Data da Venda
- Campo editável, padrão: data atual
- Permite registrar vendas retroativas

### Validações
- Cliente obrigatório
- Pelo menos 1 produto
- CPF: 11 dígitos + validação de dígitos verificadores
- CNPJ: 14 dígitos + validação de dígitos verificadores
- Contato: 11 dígitos, DDD válido, começa com 9
- Cidade: deve existir na lista do IBGE para o estado selecionado
- Se com entrada: entrada + prazo deve ser igual ao total

### Regras
- Vendedor vê apenas clientes que já atendeu anteriormente
- Admin vê todos os clientes
- Número do pedido é gerado automaticamente (sequencial)
- Produtos criados inline começam com estoque 0
