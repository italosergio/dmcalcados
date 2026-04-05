# 📅 Timeline — Evolução do DM Calçados

Histórico completo da evolução da aplicação, desde a primeira linha de código até o estado atual.

---

## 🏗️ Fase 1 — Fundação `09/03`

Scaffolding do projeto com React Router 7, TypeScript e Firebase.

- Instalação do projeto (Vite + React 19 + TypeScript)
- Configuração do Firebase (Auth + Realtime Database)
- Template de variáveis de ambiente (`.env.example`)
- Contextos de autenticação e tema
- Definição dos tipos TypeScript (User, Produto, Cliente, Venda, Despesa)
- Camada de serviços Firebase (auth, vendas, clientes, produtos, despesas, users)
- Utilitários (`formatCurrency`, `formatDate`)
- Componentes base reutilizáveis (Button, Card, Input, ResponsiveTable)

---

## 📄 Fase 2 — Páginas CRUD `10/03`

Todas as páginas principais da aplicação criadas com funcionalidade básica.

- Login e Registro com autenticação via Firebase Auth
- Dashboard com gráficos Highcharts (vendas, despesas, vendedores, clientes)
- CRUD de Produtos (listagem, cadastro, edição)
- CRUD de Clientes (listagem, cadastro)
- CRUD de Vendas (listagem, nova venda com seleção de produtos)
- CRUD de Despesas (listagem, nova despesa com tipos)
- Gestão de Usuários (listagem, alteração de role)
- Configuração de rotas e root component com providers
- Regras de segurança do Realtime Database
- Documentação inicial do projeto (README)

---

## 🔄 Fase 3 — Soft Delete e Histórico `10/03`

Implementação de exclusão segura e novas páginas.

- Soft delete em todos os serviços (campo `deletedAt`)
- Índices no banco para otimização de queries
- Campo `deletedAt` adicionado aos tipos TypeScript
- Página de Histórico de atividades
- Página "Meus Clientes" (visão do vendedor)
- Rotas de histórico e meus clientes
- Atualização de todas as páginas para respeitar soft delete

---

## 📱 Fase 4 — Responsividade e UX `10/03`

Primeira rodada de melhorias visuais e de experiência.

- Componentes comuns responsivos (tabelas, cards)
- Layout responsivo com breakpoints mobile/desktop
- Atualização dos tipos TypeScript
- Melhorias nos serviços de dados
- Formulários de vendas e despesas aprimorados
- Melhorias de UX em todas as páginas
- Atualização das regras de segurança do banco

---

## 🎨 Fase 5 — Redesign Visual Completo `02-03/04`

Overhaul visual da aplicação inteira com novo design system.

- Tema dark-only (remoção do tema claro)
- Acesso via rede local (`--host` no dev server)
- Novos campos e tipos nos modelos (CondicaoPagamento, VendaProduto expandido)
- Serviço de upload de imagens via Cloudinary
- Serviço de entradas de estoque
- Expiração de sessão por role (vendedor: 1 dia, admin: 7 dias)
- Design system completo com tokens CSS (bg-base, surface, elevated, border, content, gold)
- Redesign de todos os componentes base
- Redesign do layout: Sidebar fixa (desktop) / drawer direito (mobile) + Header com ticker
- Redesign das páginas de autenticação e nova Landing Page (acesso oculto ao login)
- Redesign de todas as páginas de CRUD
- Redesign do Dashboard e páginas administrativas
- Simplificação de rotas e páginas de criação
- Regras do Amazon Q e assets visuais
- Documentação detalhada de cada página (docs/)
- Restrição de estoque a admin e ticker adaptado por role

---

## 🔐 Fase 6 — Sistema Multi-Roles `04/04`

Evolução do sistema de permissões de role única para múltiplas roles por usuário.

- **Modelos:** sistema multi-roles (`roles: UserRole[]`), novos campos nos modelos
- **Hooks:** `useFormCache` (cache de formulários no localStorage) e `useRealtime` (listeners Firebase)
- **Componentes:** `ImageLightbox` para visualização de imagens em tela cheia
- **Auth/Users:** sistema multi-roles nos serviços de autenticação e gestão de usuários
- **Clientes:** dono, compartilhamento entre vendedores e validação de duplicatas
- **Vendas:** ajuste automático de estoque, restore de vendas deletadas, tipo pacote
- **Despesas:** rateio entre vendedores, restore, descrição e limpeza
- **Entradas:** suporte a `loteId` na criação de entrada
- **AuthContext:** expiração de sessão adaptada para multi-roles
- **Layout:** Sidebar com multi-roles, nova rota Produtos separada de Estoque
- **Rotas:** nova rota `/estoque` separada de `/produtos`, regras para ciclos
- **Formulários:** cache automático, novos campos e melhorias de UX
- **ClienteModal:** modal completo para edição e compartilhamento de clientes
- **Páginas:** melhorias em todas as páginas, nova página de Produtos e Entrada de Estoque
- **Docs:** backlog de funcionalidades e configurações de IDE

---

## 📦 Fase 7 — Ciclos de Consignação `04/04`

Sistema de ciclos de estoque para controle de mercadoria consignada.

- Página de Ciclos com criação, acompanhamento e fechamento
- Serviço de ciclos com operações no Firebase
- Controle de pacotes/peças por ciclo e vendedor
- Fix de `100dvh` para mobile

---

## 🚀 Fase 8 — Multi-Contas, Dashboard Modular e Ranking `04/04`

Maior atualização da aplicação com múltiplas features simultâneas.

### Multi-Contas
- Sistema de contas salvas no localStorage com troca rápida
- `utils/accounts.ts` para persistência e credenciais ofuscadas
- `utils/roles.tsx` com componente `RoleBadge` e constantes centralizadas
- AuthContext com `switchAccount`, `refreshUser` e listener realtime no user
- Register usa segunda instância Firebase (não desloga o admin)
- Header com menu de contas (desktop) e avatar clicável
- Sidebar com troca de conta (mobile) e botão adicionar conta
- Tela de loading animada e tela de conta suspensa no Layout

### Dashboard Modular
- Refactor do dashboard monolítico em 12 componentes independentes
- Cada gráfico com seus próprios filtros de período
- Componentes: VendasTimeline, DespesasTimeline, VendasPorVendedor, TopClientes, DespesasPorTipo, DespesasPorUsuario, TopModelos, SaldoTimeline, TicketMedioPorVendedor, SazonalidadeSemanal, ComparativoMensal, CondicaoPagamentoTimeline
- Utilitários compartilhados: ChartCard, ChartFilters, chartUtils
- Cards totais sem filtro de período, resolução de nomes via maps

### Ranking de Vendedores
- Serviço de ranking com cálculo e persistência de snapshots (dia/mês/ano)
- Modal de ranking com tabs, medalhas e posições
- Ticker com rankings clicáveis que abrem o modal
- Filtragem de ranking apenas por vendedores (exclui admins)

### Gestão Avançada de Usuários
- Status de usuário: ativo, inativo, suspenso (com motivo)
- Hierarquia de permissões: desenvolvedor > superadmin > admin > vendedor
- Reset de senha por desenvolvedor
- Registro sem campo de senha (senha padrão: `usuario123`)
- Página de usuários com badges de status e ordenação por hierarquia
- Dados realtime via `useUsers()` ao invés de fetch manual

### Despesas com Múltiplas Imagens
- Suporte a múltiplas fotos por despesa (ex: Combustível exige 3)
- Opção "sem imagem" com justificativa obrigatória
- Regras de imagem configuráveis por tipo de despesa
- Gerenciamento de tipos restrito a admins

### Clientes Avançado
- Edição inline de dados no modal (nome, endereço, contatos, CPF)
- Compartilhamento de cliente com outros vendedores (toggle switches)
- Suspensão de cliente (flag `suspenso`)
- Busca de cidades via API IBGE por estado
- Formatação automática de contato telefônico

### Melhorias Gerais
- LoginForm com melhorias de UX
- Ciclos com melhorias e hooks realtime (`useCiclos`, `useEntradas`)
- Ajustes em vendas, estoque, produtos, landing e conta
- Edição de nome inline e campo de contato na página de conta
- CSS: botão silver, logo glow, fonte Playfair Display
- Database rules e backlog atualizados

---

## 📊 Números do Projeto

| Métrica | Valor |
|---|---|
| Total de commits | ~80 |
| Páginas da aplicação | 17 rotas |
| Componentes | ~30+ |
| Serviços Firebase | 9 |
| Roles suportadas | 8 (vendedor, vendedor1-3, admin, financeiro, desenvolvedor, superadmin) |
| Gráficos no dashboard | 12 |
| Período de desenvolvimento | 09/03 — 04/04 |
